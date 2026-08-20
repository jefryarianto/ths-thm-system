import {
  Injectable,
  Logger,
  NotFoundException,
  Optional,
  OnModuleDestroy,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  IJobQueue,
  JobPayload,
  JobResult,
} from '../../common/queue/queue.interface';
import { InProcessQueueAdapter } from '../../common/queue/in-process-queue.adapter';
import { BullMQQueueAdapter } from '../../common/queue/bullmq-queue.adapter';
import { EventsGateway } from '../notifications/events.gateway';
import { UserScope } from '../../common/interfaces/user-scope.interface';

export interface ImportRowResult {
  success: boolean;
  skip?: boolean;
  error?: string;
  warning?: string;
}

export type ImportRowProcessor = (
  row: Record<string, unknown>,
  scope?: UserScope,
) => Promise<ImportRowResult>;

export interface ImportBatchProgress {
  batchId: string;
  module: string;
  totalRows: number;
  processed: number;
  success: number;
  errors: number;
  status: string;
  progress: number; // 0–100
}

const MAX_BATCH_ROWS = 10_000;

/**
 * Impor massal asinkron (job antrian).
 *
 * Menerima array baris (hasil parsing Excel/CSV), menyimpan batch + item per
 * baris di DB, lalu memprosesnya lewat antrian pekerjaan (in-process atau
 * BullMQ). Status per baris terpantau real-time; notifikasi dikirim saat
 * batch selesai.
 */
@Injectable()
export class ImportBatchService implements OnModuleDestroy {
  private readonly logger = new Logger(ImportBatchService.name);

  private queue: IJobQueue | null = null;
  private readonly processors = new Map<string, ImportRowProcessor>();

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly eventsGateway?: EventsGateway,
  ) {}

  /** Daftarkan pemroses baris untuk sebuah modul (members, candidates, dst). */
  registerProcessor(module: string, processor: ImportRowProcessor): void {
    this.processors.set(module, processor);
    this.logger.log(`Registered import processor for module "${module}"`);
  }

  hasProcessor(module: string): boolean {
    return this.processors.has(module);
  }

  /** Inisialisasi antrian — dipanggil pada saat modul diinisialisasi. */
  initQueue(): void {
    if (this.queue) {
      this.logger.warn('Import queue already initialized, skipping');
      return;
    }

    const callbacks = {
      onProcess: async (payload: JobPayload): Promise<JobResult> => {
        const start = Date.now();
        try {
          const { batchId, itemId, module } = payload.data as Record<string, string>;
          const item = await this.prisma.importBatchItem.findUnique({
            where: { id: itemId },
          });
          if (!item) {
            return { jobId: payload.jobId, success: false, error: 'Item import tidak ditemukan' };
          }

          const processor = this.processors.get(module);
          if (!processor) {
            return { jobId: payload.jobId, success: false, error: `Modul "${module}" tidak terdaftar` };
          }

          const batch = await this.prisma.importBatch.findUnique({ where: { id: batchId } });
          const scope = (batch?.scope ?? undefined) as UserScope | undefined;
          const row = (item.row ?? {}) as Record<string, unknown>;

          const result = await processor(row, scope);

          return {
            jobId: payload.jobId,
            success: result.success,
            error: result.error,
            data: { batchId, itemId, skip: result.skip, warning: result.warning },
          };
        } catch (error) {
          return {
            jobId: payload.jobId,
            success: false,
            error: (error as Error).message || 'Terjadi kesalahan saat memproses baris',
            durationMs: Date.now() - start,
          };
        }
      },
      onComplete: async (result: JobResult) => {
        if (result.data) {
          const { batchId, itemId } = result.data as Record<string, string>;
          await this.handleItemComplete(batchId, itemId, result).catch((err) =>
            this.logger.error(`handleItemComplete failed: ${(err as Error).message}`),
          );
        }
      },
      onFailed: async (result: JobResult) => {
        if (result.data) {
          const { batchId, itemId } = result.data as Record<string, string>;
          await this.handleItemFailed(batchId, itemId, result).catch((err) =>
            this.logger.error(`handleItemFailed failed: ${(err as Error).message}`),
          );
        }
      },
    };

    const opts = { concurrency: 4, maxRetries: 1 };

    if (process.env.USE_BULLMQ === 'true') {
      this.queue = new BullMQQueueAdapter(callbacks, {
        ...opts,
        connection: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379', 10),
        },
        queueName: 'bulk-import',
      });
      this.logger.log('BullMQ queue "bulk-import" initialized');
    } else {
      this.queue = new InProcessQueueAdapter(callbacks, opts);
      this.logger.log('In-process bulk import queue initialized (concurrency: 4)');
    }
  }

  /**
   * Inisialisasi antrian secara lazy bila belum ada. Dipanggil otomatis dari
   * createBatch/retryFailed sehingga urutan registrasi processor tidak bergantung
   * pada urutan onModuleInit antar modul.
   */
  private ensureQueue(): void {
    if (!this.queue) {
      this.initQueue();
    }
  }

  /**
   * Mulai impor massal asinkron. Mengembalikan segera dengan batchId;
   * pemrosesan baris berjalan di latar belakang.
   */
  async createBatch(
    module: string,
    rows: Record<string, unknown>[],
    scope?: UserScope,
    importedById?: string,
    fileName?: string,
  ): Promise<{ batchId: string; totalRows: number }> {
    this.ensureQueue();
    if (!this.processors.has(module)) {
      throw new BadRequestException(`Modul import "${module}" tidak terdaftar`);
    }
    if (rows.length === 0) {
      throw new BadRequestException('Tidak ada baris data untuk diimport');
    }
    if (rows.length > MAX_BATCH_ROWS) {
      throw new BadRequestException(`Maksimal ${MAX_BATCH_ROWS} baris per batch import`);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { batch, items } = await (this.prisma as any).$transaction(async (tx: any) => {
      const createdBatch = await tx.importBatch.create({
        data: {
          module,
          fileName,
          totalRows: rows.length,
          status: 'processing',
          scope: (scope ?? undefined) as Prisma.InputJsonValue | undefined,
          importedById: importedById ?? null,
        },
      });

      const createdItems = await tx.importBatchItem.createManyAndReturn({
        data: rows.map((row, index) => ({
          batchId: createdBatch.id,
          rowIndex: index,
          row: row as Prisma.InputJsonValue,
        })),
      });

      return { batch: createdBatch, items: createdItems };
    });

    const payloads: JobPayload[] = items.map((item: { id: string }) => ({
      jobId: item.id,
      type: module,
      data: { batchId: batch.id, itemId: item.id, module },
    }));

    await this.queue!.addBulk(payloads);
    this.logger.log(`Import batch ${batch.id} created: ${rows.length} rows enqueued (${module})`);

    return { batchId: batch.id, totalRows: rows.length };
  }

  /** Progress batch + detail per baris (ter-paginate). */
  async getBatchProgress(batchId: string, page = 1, limit = 50) {
    const batch = await this.prisma.importBatch.findUnique({ where: { id: batchId } });
    if (!batch) return null;

    const perPage = Math.min(Math.max(limit, 1), 200);
    const skip = (Math.max(page, 1) - 1) * perPage;

    const [items, itemCount] = await Promise.all([
      this.prisma.importBatchItem.findMany({
        where: { batchId },
        orderBy: { rowIndex: 'asc' },
        skip,
        take: perPage,
        select: {
          id: true,
          rowIndex: true,
          status: true,
          error: true,
          updatedAt: true,
        },
      }),
      this.prisma.importBatchItem.count({ where: { batchId } }),
    ]);

    const progress =
      batch.totalRows > 0
        ? Math.round(((batch.processed + batch.errors) / batch.totalRows) * 100)
        : 0;

    return {
      batchId: batch.id,
      module: batch.module,
      fileName: batch.fileName,
      totalRows: batch.totalRows,
      processed: batch.processed,
      success: batch.success,
      errors: batch.errors,
      status: batch.status,
      progress,
      items,
      meta: { page: Math.max(page, 1), limit: perPage, total: itemCount },
    };
  }

  /** Daftar batch import terbaru. */
  async getBatchList(limit = 20, offset = 0) {
    const [batches, total] = await Promise.all([
      this.prisma.importBatch.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          module: true,
          fileName: true,
          totalRows: true,
          processed: true,
          success: true,
          errors: true,
          status: true,
          importedById: true,
          createdAt: true,
          completedAt: true,
        },
      }),
      this.prisma.importBatch.count(),
    ]);

    return {
      data: batches.map((b) => ({
        ...b,
        progress: b.totalRows > 0 ? Math.round(((b.processed + b.errors) / b.totalRows) * 100) : 0,
      })),
      meta: { total, limit, offset },
    };
  }

  /** Ulangi baris yang gagal. */
  async retryFailed(batchId: string): Promise<{ retried: number }> {
    const batch = await this.prisma.importBatch.findUnique({ where: { id: batchId } });
    if (!batch) throw new NotFoundException('Batch import tidak ditemukan');
    this.ensureQueue();

    const failedItems = await this.prisma.importBatchItem.findMany({
      where: { batchId, status: 'error' },
      select: { id: true },
    });
    if (failedItems.length === 0) return { retried: 0 };

    await this.prisma.importBatchItem.updateMany({
      where: { batchId, status: 'error' },
      data: { status: 'pending', error: null },
    });
    await this.prisma.importBatch.update({
      where: { id: batchId },
      data: { status: 'processing', errors: 0 },
    });

    const payloads: JobPayload[] = failedItems.map((item) => ({
      jobId: item.id,
      type: batch.module,
      data: { batchId, itemId: item.id, module: batch.module },
    }));
    await this.queue!.addBulk(payloads);

    return { retried: failedItems.length };
  }

  /** Batalkan batch yang sedang diproses. */
  async cancelBatch(batchId: string): Promise<boolean> {
    const batch = await this.prisma.importBatch.findUnique({ where: { id: batchId } });
    if (!batch || !['pending', 'processing'].includes(batch.status)) return false;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (this.prisma as any).$transaction([
      this.prisma.importBatch.update({ where: { id: batchId }, data: { status: 'cancelled' } }),
      this.prisma.importBatchItem.updateMany({
        where: { batchId, status: 'pending' },
        data: { status: 'error', error: 'Batch dibatalkan' },
      }),
    ]);
    return true;
  }

  // ── Penanganan selesai/gagal per baris ──────────────────

  private async handleItemComplete(batchId: string, itemId: string, result: JobResult): Promise<void> {
    const skip = (result.data as Record<string, unknown> | undefined)?.skip === true;

    await this.prisma.importBatchItem.update({
      where: { id: itemId },
      data: {
        status: result.success ? 'success' : 'error',
        error: result.error || null,
      },
    });

    const batch = await this.prisma.importBatch.update({
      where: { id: batchId },
      data: {
        processed: { increment: 1 },
        ...(result.success ? { success: { increment: 1 } } : {}),
        ...(!result.success && !skip ? { errors: { increment: 1 } } : {}),
      },
    });

    await this.finalizeIfComplete(batch);
    this.eventsGateway?.broadcast('import:updated', { timestamp: Date.now() });
  }

  private async handleItemFailed(batchId: string, itemId: string, result: JobResult): Promise<void> {
    await this.prisma.importBatchItem.update({
      where: { id: itemId },
      data: { status: 'error', error: result.error || 'Gagal diproses' },
    });

    const batch = await this.prisma.importBatch.update({
      where: { id: batchId },
      data: { processed: { increment: 1 }, errors: { increment: 1 } },
    });

    await this.finalizeIfComplete(batch);
    this.eventsGateway?.broadcast('import:updated', { timestamp: Date.now() });
  }

  private async finalizeIfComplete(batch: { id: string; totalRows: number; processed: number; errors: number }): Promise<void> {
    if (batch.processed + batch.errors < batch.totalRows) return;

    const status = batch.errors > 0 ? 'completed_with_errors' : 'completed';
    const { count } = await this.prisma.importBatch.updateMany({
      where: {
        id: batch.id,
        status: { notIn: ['completed', 'completed_with_errors', 'cancelled'] },
      },
      data: { status, completedAt: new Date() },
    });

    if (count > 0) {
      this.logger.log(
        `Import batch ${batch.id} complete: ${batch.processed} processed, ${batch.errors} errors`,
      );
      await this.sendCompletionNotification(batch.id, status).catch((err) =>
        this.logger.error(`Import batch notification failed: ${(err as Error).message}`),
      );
    }
  }

  private async sendCompletionNotification(batchId: string, status: string): Promise<void> {
    const batch = await this.prisma.importBatch.findUnique({ where: { id: batchId } });
    if (!batch?.importedById) return;

    const progress = await this.getBatchProgress(batchId);
    const success = batch.success;
    const failed = batch.errors;
    const isComplete = status === 'completed';

    this.eventsGateway?.sendToUser(batch.importedById, 'import:complete', {
      batchId,
      module: batch.module,
      status,
      success,
      failed,
      totalRows: batch.totalRows,
      progress: progress?.progress || 100,
    });

    try {
      await this.prisma.notifikasi.create({
        data: {
          userId: batch.importedById,
          judul: isComplete
            ? `✅ Import ${batch.module} Selesai`
            : `⚠️ Import ${batch.module} Selesai (${failed} Gagal)`,
          isi: isComplete
            ? `Import ${batch.module} selesai — ${success} baris berhasil.`
            : `Import ${batch.module} selesai — ${success} berhasil, ${failed} gagal dari ${batch.totalRows} total.`,
          tipe: 'umum' as never,
          data: { batchId, module: batch.module, success, failed, totalRows: batch.totalRows, status } as never,
        },
      });
      const unread = await this.prisma.notifikasi.count({
        where: { userId: batch.importedById, isRead: false },
      });
      this.eventsGateway?.sendUnreadCount(batch.importedById, unread);
    } catch (err) {
      this.logger.warn(`Failed to create import notification: ${(err as Error).message}`);
    }
  }

  async onModuleDestroy(_signal?: string): Promise<void> {
    if (!this.queue) return;
    try {
      await this.queue.pause();
      await this.queue.onIdle?.();
    } catch {
      // best-effort
    }
    await this.queue.shutdown();
    this.logger.log('Import queue shut down');
  }
}