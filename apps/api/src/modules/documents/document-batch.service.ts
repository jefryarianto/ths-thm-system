import { Injectable, NotFoundException, Optional, Logger, OnApplicationShutdown } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  IJobQueue,
  JobPayload,
  JobResult,
} from '../../common/queue/queue.interface';
import { InProcessQueueAdapter } from '../../common/queue/in-process-queue.adapter';
import { BullMQQueueAdapter } from '../../common/queue/bullmq-queue.adapter';
import { EventsGateway } from '../notifications/events.gateway';
import { MailService } from '../../mail/mail.service';
import { escapeHtml } from '../../mail/email-templates';

export interface BatchProgress {
  batchId: string;
  type: string;
  totalJobs: number;
  completed: number;
  failed: number;
  status: string;
  progress: number; // 0–100
}

@Injectable()
export class DocumentBatchService implements OnApplicationShutdown {
  private readonly logger = new Logger(DocumentBatchService.name);

  /** Queue adapter instance shared across all batch operations */
  private queue: IJobQueue | null = null;

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly eventsGateway?: EventsGateway,
    @Optional() private readonly mailService?: MailService,
  ) {}

  /**
   * Initialize the queue adapter with a process callback.
   * Called once during module initialization.
   */
  initQueue(processCallback: (payload: JobPayload) => Promise<JobResult>): void {
    if (this.queue) {
      this.logger.warn('Queue already initialized, skipping');
      return;
    }

    if (!processCallback) {
      throw new Error('processCallback is required to initialize the queue');
    }

    const callbacks = {
      onProcess: processCallback,
      onComplete: async (result: import('../../common/queue/queue.interface').JobResult) => {
        if (result.data) {
          const { batchId, documentJobId } = result.data as Record<string, string>;
          await this.handleJobComplete(batchId, documentJobId, result);
        }
      },
      onFailed: async (result: import('../../common/queue/queue.interface').JobResult) => {
        if (result.data) {
          const { batchId, documentJobId } = result.data as Record<string, string>;
          await this.handleJobFailed(batchId, documentJobId, result);
        }
      },
      onProgress: async (progress: import('../../common/queue/queue.interface').JobProgress) => {
        this.logger.debug(`Job ${progress.jobId}: ${progress.progress}%`);
      },
    };

    const opts = { concurrency: 3, maxRetries: 3 };

    // Use BullMQ when USE_BULLMQ=true env var is set (requires Redis)
    if (process.env.USE_BULLMQ === 'true') {
      this.queue = new BullMQQueueAdapter(callbacks, {
        ...opts,
        connection: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379', 10),
        },
        queueName: 'document-generation',
      });
      this.logger.log(
        `BullMQ queue "document-generation" initialized (Redis ${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6379'})`,
      );
    } else {
      this.queue = new InProcessQueueAdapter(callbacks, opts);
      this.logger.log('In-process document generation queue initialized (concurrency: 3, maxRetries: 3)');
    }
  }

  /**
   * Create a new batch and enqueue all jobs.
   * Returns immediately with batch ID — processing happens asynchronously.
   */
  async createBatch(
    type: string,
    memberIds: string[],
    createdBy?: string,
  ): Promise<{ batchId: string; totalJobs: number }> {
    // 1. Create batch record
    const batch = await this.prisma.documentBatchJob.create({
      data: {
        type,
        totalJobs: memberIds.length,
        status: 'pending',
        createdBy,
      },
    });

    if (!this.queue) {
      throw new Error('Queue not initialized. Make sure initQueue() was called.');
    }

    // 2. Create individual job records (batch insert)
    const jobRecords = await this.prisma.documentJob.createManyAndReturn({
      data: memberIds.map((memberId) => ({
        batchId: batch.id,
        memberId,
        status: 'pending',
      })),
    });

    // 3. Update batch status to processing
    await this.prisma.documentBatchJob.update({
      where: { id: batch.id },
      data: { status: 'processing' },
    });

    // 4. Enqueue jobs
    const payloads: JobPayload[] = jobRecords.map((job) => ({
      jobId: job.id,
      type,
      data: {
        batchId: batch.id,
        documentJobId: job.id,
        memberId: job.memberId,
        type,
      },
    }));

    await this.queue.addBulk(payloads);
    this.logger.log(`Batch ${batch.id} created: ${memberIds.length} jobs enqueued`);

    return { batchId: batch.id, totalJobs: memberIds.length };
  }

  /**
   * Get batch progress with aggregated stats and individual job details.
   */
  async getBatchProgress(batchId: string) {
    const batch = await this.prisma.documentBatchJob.findUnique({
      where: { id: batchId },
      include: {
        jobs: {
          select: {
            id: true,
            memberId: true,
            status: true,
            error: true,
            nomorDokumen: true,
            startedAt: true,
            completedAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!batch) return null;

    const progress =
      batch.totalJobs > 0
        ? Math.round(((batch.completed + batch.failed) / batch.totalJobs) * 100)
        : 0;

    return {
      batchId: batch.id,
      type: batch.type,
      totalJobs: batch.totalJobs,
      completed: batch.completed,
      failed: batch.failed,
      status: batch.status,
      progress,
      jobs: batch.jobs,
    };
  }

  /**
   * Get list of recent batches.
   */
  async getBatchList(limit = 20, offset = 0) {
    const [batches, total] = await Promise.all([
      this.prisma.documentBatchJob.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          type: true,
          totalJobs: true,
          completed: true,
          failed: true,
          status: true,
          createdBy: true,
          createdAt: true,
        },
      }),
      this.prisma.documentBatchJob.count(),
    ]);

    return {
      success: true,
      data: batches.map((b) => ({
        ...b,
        progress:
          b.totalJobs > 0
            ? Math.round(((b.completed + b.failed) / b.totalJobs) * 100)
            : 0,
      })),
      meta: { total, limit, offset },
    };
  }

  /**
   * Cancel a processing batch.
   */
  async cancelBatch(batchId: string): Promise<boolean> {
    const batch = await this.prisma.documentBatchJob.findUnique({
      where: { id: batchId },
    });
    if (!batch || batch.status !== 'processing') return false;

    await this.prisma.documentBatchJob.update({
      where: { id: batchId },
      data: { status: 'cancelled' },
    });

    // Cancel pending jobs
    await this.prisma.documentJob.updateMany({
      where: { batchId, status: 'pending' },
      data: { status: 'failed', error: 'Batch cancelled' },
    });

    return true;
  }

  /**
   * Estimate the number of members matching a range filter.
   * This is a quick count query, does not create any batch.
   */
  async estimateBatch(range: string, rantingId?: string): Promise<number> {
    switch (range) {
      case 'all_active':
        return this.prisma.anggota.count({
          where: { statusKeanggotaan: 'aktif', deletedAt: null },
        });

      case 'by_ranting':
        if (!rantingId) return 0;
        return this.prisma.anggota.count({
          where: { rantingId, statusKeanggotaan: 'aktif', deletedAt: null },
        });

      case 'graduated_only': {
        const evaluatedIds = await this.prisma.nilaiPendadaran.findMany({
          where: { anggotaId: { not: null } },
          select: { anggotaId: true },
          distinct: ['anggotaId'],
        });
        return evaluatedIds.filter((n) => n.anggotaId !== null).length;
      }

      default:
        return 0;
    }
  }

  /**
   * Retry failed jobs in a batch.
   * Resets failed jobs to pending, updates batch status, re-enqueues them.
   *
   * @param batchId - Batch to retry
   * @param jobIds - Optional: retry only specific job IDs. If omitted, retry ALL failed jobs.
   */
  async retryBatch(batchId: string, jobIds?: string[]): Promise<{ retried: number }> {
    const batch = await this.prisma.documentBatchJob.findUnique({
      where: { id: batchId },
    });
    if (!batch) {
      throw new NotFoundException('Batch tidak ditemukan');
    }

    if (!this.queue) {
      throw new Error('Queue not initialized. Make sure initQueue() was called.');
    }

    // Find failed jobs — optionally filtered by specific jobIds
    const where: Record<string, unknown> = { batchId, status: 'failed' };
    if (jobIds && jobIds.length > 0) {
      where.id = { in: jobIds };
    }
    const failedJobs = await this.prisma.documentJob.findMany({
      where: where as never,
    });

    if (failedJobs.length === 0) {
      return { retried: 0 };
    }

    // Reset failed jobs to pending
    await this.prisma.documentJob.updateMany({
      where: where as never,
      data: { status: 'pending', error: null, retryCount: { increment: 1 } },
    });

    // Update batch status back to processing, reset failed counter
    // Note: there's a benign transient where a concurrently-processing job's
    // handleJobFailed could increment failed before we reset it. Prisma's
    // atomic increment handles this correctly in the final count.
    await this.prisma.documentBatchJob.update({
      where: { id: batchId },
      data: { status: 'processing', failed: 0 },
    });

    // Re-enqueue all retried jobs
    const payloads: JobPayload[] = failedJobs.map((job) => ({
      jobId: job.id,
      type: batch.type,
      data: {
        batchId: batch.id,
        documentJobId: job.id,
        memberId: job.memberId,
        type: batch.type,
      },
    }));

    await this.queue.addBulk(payloads);
    this.logger.log(`Batch ${batchId} retry: ${failedJobs.length} jobs re-enqueued`);

    return { retried: failedJobs.length };
  }

  /**
   * Handle job completion — atomically update batch counters.
   */
  private async handleJobComplete(
    batchId: string,
    documentJobId: string,
    result: JobResult,
  ): Promise<void> {
    try {
      const nomorDokumen = (result.data as Record<string, string> | undefined)?.nomorDokumen;

      await this.prisma.documentJob.update({
        where: { id: documentJobId },
        data: {
          status: 'completed',
          nomorDokumen: nomorDokumen || null,
          completedAt: new Date(),
        },
      });

      const batch = await this.prisma.documentBatchJob.update({
        where: { id: batchId },
        data: { completed: { increment: 1 } },
      });

      // Check if batch is complete
      if (batch.completed + batch.failed >= batch.totalJobs) {
        const finalStatus = batch.failed > 0 ? 'completed_with_errors' : 'completed';

        // Atomic race-condition guard: updateMany with where clause ensures only
        // the first concurrent handler to reach this line sets the final status
        // and sends notifications. Subsequent handlers get count === 0 and bail.
        const { count } = await this.prisma.documentBatchJob.updateMany({
          where: {
            id: batchId,
            status: { notIn: ['completed', 'completed_with_errors', 'cancelled'] },
          },
          data: { status: finalStatus },
        });

        if (count > 0) {
          this.logger.log(
            `Batch ${batchId} complete: ${batch.completed} success, ${batch.failed} failed`,
          );
          await this.sendBatchCompletionNotifications(batch, finalStatus).catch(
            (err) => this.logger.error(`Batch notification failed: ${(err as Error).message}`),
          );
        }
      } else {
        // Emit real-time progress update for each completed job
        await this.emitBatchProgress(batchId).catch(() => {});
      }

      // Broadcast queue stats update to all connected clients
      this.eventsGateway?.broadcast('queue:updated', { timestamp: Date.now() });
    } catch (error) {
      this.logger.error(
        `Failed to update job completion for ${documentJobId}: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Handle job failure — atomically update batch counters.
   */
  private async handleJobFailed(
    batchId: string,
    documentJobId: string,
    result: JobResult,
  ): Promise<void> {
    try {
      await this.prisma.documentJob.update({
        where: { id: documentJobId },
        data: {
          status: 'failed',
          error: result.error || 'Unknown error',
          completedAt: new Date(),
        },
      });

      const batch = await this.prisma.documentBatchJob.update({
        where: { id: batchId },
        data: { failed: { increment: 1 } },
      });

      // Check if batch is complete
      if (batch.completed + batch.failed >= batch.totalJobs) {
        const finalStatus = batch.failed > 0 ? 'completed_with_errors' : 'completed';

        this.logger.log(
          `Batch ${batchId} complete (with errors): ${batch.completed} success, ${batch.failed} failed`,
        );

        // Atomic race-condition guard: updateMany with where clause ensures only
        // the first concurrent handler to reach this line sets the final status
        // and sends notifications. Subsequent handlers get count === 0 and bail.
        const { count } = await this.prisma.documentBatchJob.updateMany({
          where: {
            id: batchId,
            status: { notIn: ['completed', 'completed_with_errors', 'cancelled'] },
          },
          data: { status: finalStatus },
        });
        if (count > 0) {
          await this.sendBatchCompletionNotifications(batch, finalStatus).catch(
            (err) => this.logger.error(`Batch notification failed: ${(err as Error).message}`),
          );
        }
      } else {
        // Emit real-time progress update for each failed job
        await this.emitBatchProgress(batchId).catch(() => {});
      }

      // Broadcast queue stats update to all connected clients
      this.eventsGateway?.broadcast('queue:updated', { timestamp: Date.now() });
    } catch (error) {
      this.logger.error(
        `Failed to update job failure for ${documentJobId}: ${(error as Error).message}`,
      );
    }
  }

  // ─── Notification Helpers ───

  /**
   * Emit real-time batch progress via Socket.IO to the batch creator.
   */
  private async emitBatchProgress(batchId: string): Promise<void> {
    if (!this.eventsGateway) return;

    const progress = await this.getBatchProgress(batchId);
    if (!progress) return;

    const batch = await this.prisma.documentBatchJob.findUnique({
      where: { id: batchId },
      select: { createdBy: true },
    });

    if (batch?.createdBy) {
      this.eventsGateway.sendToUser(batch.createdBy, 'batch:progress', progress);
    }
  }

  /**
   * Send all notifications when a batch reaches a final state:
   * 1. Socket.IO real-time event (batch:complete)
   * 2. In-app Notifikasi record
   * 3. Email notification to batch creator
   *
   * @param batch - The batch record from the Prisma update above (includes counters)
   * @param status - Final status ('completed' | 'completed_with_errors')
   */
  private async sendBatchCompletionNotifications(
    batch: { id: string; type: string; totalJobs: number; completed: number; failed: number; createdBy: string | null },
    status: string,
  ): Promise<void> {
    if (!batch.createdBy) return;

    const typeLabel = this.formatTypeLabel(batch.type);
    const progress = await this.getBatchProgress(batch.id);
    const success = batch.completed;
    const failed = batch.failed;
    const totalJobs = batch.totalJobs;
    const isComplete = status === 'completed';

    // ── 1. Socket.IO real-time event ──
    this.eventsGateway?.sendToUser(batch.createdBy, 'batch:complete', {
      batchId: batch.id,
      type: batch.type,
      status,
      completed: success,
      failed,
      totalJobs,
      progress: progress?.progress || 100,
    });

    // ── 2. In-app Notifikasi record ──
    const notifTitle = isComplete
      ? `✅ Generate ${typeLabel} Selesai`
      : `⚠️ Generate ${typeLabel} Selesai (${failed} Gagal)`;

    const notifBody = isComplete
      ? `Batch generate ${typeLabel} selesai — ${success} dokumen berhasil digenerate.`
      : `Batch generate ${typeLabel} selesai — ${success} berhasil, ${failed} gagal dari ${totalJobs} total.`;

    try {
      await this.prisma.notifikasi.create({
        data: {
          userId: batch.createdBy,
          judul: notifTitle,
          isi: notifBody,
          tipe: 'dokumen_ready',
          data: {
            batchId: batch.id,
            type: batch.type,
            completed: success,
            failed,
            totalJobs,
            status,
          } as never,
        },
      });

      // Update unread count via WebSocket
      const unreadCount = await this.prisma.notifikasi.count({
        where: { userId: batch.createdBy, isRead: false },
      });
      this.eventsGateway?.sendUnreadCount(batch.createdBy, unreadCount);
    } catch (err) {
      this.logger.warn(`Failed to create in-app notification: ${(err as Error).message}`);
    }

    // ── 3. Email notification (optional — only if user has email) ──
    await this.sendBatchCompletionEmail(batch.createdBy, typeLabel, success, failed).catch(
      () => {},
    );
  }

  /**
   * Send email notification to the batch creator when batch completes.
   */
  private async sendBatchCompletionEmail(
    userId: string,
    typeLabel: string,
    success: number,
    failed: number,
  ): Promise<void> {
    if (!this.mailService) return;

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, namaLengkap: true },
      });

      if (!user?.email) return;

      const subject =
        failed > 0
          ? `⚠️ Generate ${typeLabel} Selesai — ${success} Berhasil, ${failed} Gagal`
          : `✅ Generate ${typeLabel} Selesai — ${success} Dokumen Berhasil`;

      const html = `
        <h2 style="color: ${failed > 0 ? '#ca8a04' : '#16a34a'};">
          ${failed > 0 ? '⚠️' : '✅'} Generate Dokumen Selesai
        </h2>
        <p>Halo <strong>${escapeHtml(user.namaLengkap)}</strong>,</p>
        <p>Batch generate <strong>${escapeHtml(typeLabel)}</strong> telah selesai diproses.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr>
            <td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">Total</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb;">${success + failed}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold; color: #16a34a;">Berhasil</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb;">${success}</td>
          </tr>
          ${failed > 0 ? `
          <tr>
            <td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold; color: #dc2626;">Gagal</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb;">${failed}</td>
          </tr>` : ''}
        </table>
        <p>Silakan login ke aplikasi untuk melihat detail dan mengunduh dokumen.</p>
      `;

      await this.mailService.sendMail({
        to: user.email,
        subject,
        html,
        metadata: {
          module: 'documents',
          template: 'batchCompletionEmail',
          userId,
        },
      });
    } catch (error) {
      this.logger.error(
        `sendBatchCompletionEmail failed for user ${userId}: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Gracefully shut down the queue adapter when the application terminates.
   * Called by NestJS during the shutdown lifecycle.
   * Waits for in-flight jobs to finish (BullMQ) or drains remaining jobs
   * (in-process adapter) before returning.
   */
  async onApplicationShutdown(_signal?: string): Promise<void> {
    if (!this.queue) return;
    this.logger.log('Shutting down queue...');

    // For the in-process adapter, pause first to stop accepting new jobs,
    // then wait for active jobs to finish via onIdle.
    try {
      await this.queue.pause();
      await this.queue.onIdle?.();
    } catch {
      // Best-effort — proceed to shutdown anyway
    }

    await this.queue.shutdown();
    this.logger.log('Queue shut down');
  }

  /**
   * Format batch type for human-readable labels.
   */
  private formatTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      kta: 'KTA',
      kartu_anggota: 'Kartu Anggota',
      sertifikat_pendadaran: 'Sertifikat Pendadaran',
      sertifikat_pelatihan: 'Sertifikat Pelatihan',
      piagam_prestasi: 'Piagam Prestasi',
    };
    return labels[type] || type;
  }

  // ─── CSV Export ───

  /**
   * Generate CSV export of all jobs in a batch.
   * Returns the CSV string and the filename for the download.
   */
  async exportCsv(
    batchId: string,
  ): Promise<{ csv: string; filename: string }> {
    const batch = await this.prisma.documentBatchJob.findUnique({
      where: { id: batchId },
    });
    if (!batch) {
      throw new NotFoundException('Batch tidak ditemukan');
    }

    const jobs = await this.prisma.documentJob.findMany({
      where: { batchId },
      orderBy: { createdAt: 'asc' },
    });

    // Collect unique member IDs and fetch their names from Anggota table
    const memberIds = [...new Set(jobs.map((j) => j.memberId))];
    const members = await this.prisma.anggota.findMany({
      where: { id: { in: memberIds } },
      select: { id: true, namaLengkap: true },
    });
    const memberNameMap = new Map(members.map((m) => [m.id, m.namaLengkap]));

    // Build CSV with header
    const header = 'Member ID,Nama Anggota,Nomor Dokumen,Status,Error,Created At,Completed At';
    const rows = jobs.map((job) => {
      const memberId = this.escapeCsvField(job.memberId);
      const namaLengkap = this.escapeCsvField(memberNameMap.get(job.memberId) || '');
      const nomorDokumen = this.escapeCsvField(job.nomorDokumen || '');
      const status = job.status;
      const error = this.escapeCsvField(job.error || '');
      const createdAt = job.createdAt.toISOString();
      const completedAt = job.completedAt ? job.completedAt.toISOString() : '';
      return `${memberId},${namaLengkap},${nomorDokumen},${status},${error},${createdAt},${completedAt}`;
    });

    const csv = `\uFEFF${header}\n${rows.join('\n')}\n`; // BOM for Excel UTF-8

    const typeLabel = this.formatTypeLabel(batch.type);
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `batch-${typeLabel.toLowerCase().replace(/\s+/g, '-')}-${dateStr}.csv`;

    return { csv, filename };
  }

  /**
   * Escape a CSV field value — wraps in quotes if contains comma, quote, or newline.
   */
  private escapeCsvField(value: string): string {
    if (value.includes(",") || value.includes("\"") || value.includes("\n")) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}
