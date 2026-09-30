import { Injectable, Logger, OnApplicationShutdown, Optional } from '@nestjs/common';
import { NotificationsService } from '../notifications/notifications.service';
import { MailService } from '../../mail/mail.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PersistentAuditService } from '../../common/services/persistent-audit.service';
import {
  IJobQueue,
  JobPayload,
  JobResult,
  JobLifecycleCallbacks,
} from '../../common/queue/queue.interface';
import { InProcessQueueAdapter } from '../../common/queue/in-process-queue.adapter';
import { BullMQQueueAdapter } from '../../common/queue/bullmq-queue.adapter';
import { resolveRedisConnection } from '../../common/queue/redis-connection';

/** Kategori blast yang dikenal sistem (menjadi `tipe` notifikasi). */
export type EmailBlastKategori = 'reminder_iuran' | 'reminder_latihan' | 'data_incomplete' | 'umum';

/**
 * Satu item blast per penerima.
 *  - Jalur user (userId): notifikasi in-app + email + FCM via NotificationsService.
 *  - Jalur email langsung (email + subject/html): kirim email ke alamat anggota
 *    yang belum punya akun user (MailService). Pilih SALAH SATU jalur.
 */
export interface EmailBlastItem {
  userId?: string;
  email?: string;
  subject?: string;
  html?: string;
  judul: string;
  isi: string;
}

/**
 * Antrean pengiriman email/notifikasi massal.
 *
 * Pengganti pengiriman langsung di dalam loop cron (insiden email retry-loop
 * 2026-09): cron hanya MENYIAPKAN item, pengiriman dieksekusi antrean dengan:
 *  - retry per-item + backoff eksponensial bawaan adapter (BullMQ: persisten di
 *    Valkey, selamat dari restart API);
 *  - jobId deterministik `email-blast:<kategori>:<tanggal>:<userId>:<i>` —
 *    BullMQ menolak jobId ganda pada antrean yang sama, jadi cron yang jalan
 *    ulang tidak melipatgandakan penerima;
 *  - fallback notifikasi in-app (tabel notifikasi) bila NotificationsService gagal;
 *  - kegagalan final dicatat ke audit (best-effort) untuk inspeksi.
 */
@Injectable()
export class EmailBlastService implements OnApplicationShutdown {
  private readonly logger = new Logger(EmailBlastService.name);
  private queue: IJobQueue | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly mailService: MailService,
    @Optional() private readonly persistentAudit?: PersistentAuditService,
  ) {
    this.initQueue();
  }

  private initQueue(): void {
    const callbacks: JobLifecycleCallbacks = {
      onProcess: async (payload: JobPayload) => {
        await this.processJob(payload);
        return { jobId: payload.jobId, success: true };
      },
      onComplete: async (result: JobResult) => {
        this.logger.debug(`Blast ${result.jobId} terkirim (${result.durationMs ?? '?'}ms)`);
      },
      onFailed: async (result: JobResult) => {
        this.logger.error(`Blast ${result.jobId} gagal permanen: ${result.error}`);
        // Audit best-effort agar kegagalan pengiriman dapat diinspeksi
        await this.persistentAudit
          ?.log({
            action: 'EMAIL_BLAST_FAILED',
            entity: 'Notifikasi',
            entityId: result.jobId,
            userId: null,
            details: { error: result.error },
          })
          .catch(() => undefined);
      },
    };

    const opts = { concurrency: 3, maxRetries: 2 };

    // BullMQ saat USE_BULLMQ=true (produksi, butuh Redis/Valkey) — lihat
    // redis-connection.ts untuk resolusi koneksi (REDIS_URL didukung).
    if (process.env.USE_BULLMQ === 'true') {
      const conn = resolveRedisConnection() as { host: string; port: number };
      this.queue = new BullMQQueueAdapter(callbacks, {
        ...opts,
        connection: conn,
        queueName: 'email-blast',
      });
      this.logger.log(
        `Email blast queue "email-blast" initialized (Redis ${conn.host}:${conn.port})`,
      );
    } else {
      this.queue = new InProcessQueueAdapter(callbacks, opts);
      this.logger.log('In-process email blast queue initialized (concurrency: 3)');
    }
  }

  /**
   * Masukkan daftar item blast ke antrean.
   * @returns jumlah job yang masuk antrean.
   */
  async enqueue(
    kategori: EmailBlastKategori,
    tanggal: string,
    items: EmailBlastItem[],
  ): Promise<number> {
    if (!this.queue) {
      throw new Error('Email blast queue belum terinisialisasi');
    }
    if (items.length === 0) return 0;

    const payloads: JobPayload[] = items.map((item, i) => ({
      // Deterministik: cron yang terpicu ulang di hari yang sama tidak
      // menduplikasi job (BullMQ menolak jobId yang sudah ada).
      jobId: `email-blast:${kategori}:${tanggal}:${item.userId ?? item.email ?? i}:${i}`,
      type: kategori,
      data: { ...item, kategori, tanggal } as unknown as Record<string, unknown>,
    }));

    await this.queue.addBulk(payloads);
    this.logger.log(`Email blast [${kategori}] ${tanggal}: ${payloads.length} job masuk antrean`);
    return payloads.length;
  }

  /** Eksekusi satu item: email langsung ATAU notifikasi user + fallback in-app. */
  private async processJob(payload: JobPayload): Promise<void> {
    const job = payload.data as unknown as EmailBlastItem & { kategori: EmailBlastKategori };

    // ── Jalur email langsung (anggota tanpa akun user) ──
    if (job.email) {
      const ok = await this.mailService.sendMail({
        to: job.email,
        subject: job.subject || job.judul,
        html: job.html,
        text: job.isi,
        metadata: { module: 'email-blast', template: job.kategori },
      });
      // Gagal kirim → lempar agar adapter me-retry (backoff bawaan);
      // habis retry → onFailed ter-audit (EMAIL_BLAST_FAILED).
      if (!ok) {
        throw new Error(`Gagal kirim email-blast ke ${job.email}`);
      }
      return;
    }

    // ── Jalur user (notifikasi in-app + email + FCM) ──
    if (!job.userId) return;
    try {
      await this.notificationsService.send(job.userId, {
        userId: job.userId,
        judul: job.judul,
        isi: job.isi,
        tipe: job.kategori as never,
      });
    } catch (error) {
      // Fallback: tulis langsung ke tabel notifikasi (jalur in-app)
      await this.prisma.notifikasi.create({
        data: {
          userId: job.userId,
          tipe: job.kategori as never,
          judul: job.judul,
          isi: job.isi,
        },
      });
      this.logger.warn(
        `Blast ${payload.jobId}: NotificationsService gagal, fallback in-app (${(error as Error).message})`,
      );
    }
  }

  async onApplicationShutdown(): Promise<void> {
    await this.queue?.shutdown();
  }
}
