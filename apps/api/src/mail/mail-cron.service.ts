import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MailService } from './mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../modules/notifications/notifications.service';
import { createDistributedLock, createCronLockClient } from '../common/utils/distributed-lock';

/** Baca env integer positif; fallback ke default (paritas dengan MailService). */
function positiveIntEnv(name: string, fallback: number): number {
  const parsed = parseInt(process.env[name] || '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

@Injectable()
export class MailCronService {
  private readonly logger = new Logger(MailCronService.name);

  /** Jendela usia email yang layak auto-retry — harus SAMA dengan MailService (env sama). */
  private readonly maxAgeMs = positiveIntEnv('EMAIL_RETRY_MAX_AGE_HOURS', 48) * 3_600_000;
  /**
   * Guard overlap siklus retry 30-menit (pelajaran insiden 2026-09);
   * dengan CRON_DISTRIBUTED_LOCK=true jadi lock SETNX via Valkey.
   */
  private readonly guard = createDistributedLock(this.logger, {
    lockClient: createCronLockClient(this.logger),
  });

  constructor(
    private readonly mailService: MailService,
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Auto-retry failed emails every 30 minutes.
   * Only retries emails with a valid content body (non-null).
   * Skips if there are no failed emails to avoid spamming cron logs.
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async handleAutoRetry(): Promise<void> {
    return this.guard('mail-auto-retry', () => this.handleAutoRetryImpl());
  }

  private async handleAutoRetryImpl(): Promise<void> {
    // Hitung dengan filter usia yang sama dengan mode otomatis MailService,
    // supaya angka yang dilaporkan = yang benar-benar akan diproses.
    // (Guard attempts/backoff/batch ada di dalam retryFailedEmails.)
    const failedCount = await this.prisma.emailLog.count({
      where: {
        status: 'failed',
        content: { not: null },
        createdAt: { gte: new Date(Date.now() - this.maxAgeMs) },
      },
    });

    if (failedCount === 0) {
      this.logger.log('[Auto-Retry] No failed emails to retry');
      return;
    }

    this.logger.log(`[Auto-Retry] Found ${failedCount} failed emails, starting retry...`);

    try {
      const result = await this.mailService.retryFailedEmails();

      this.logger.log(
        `[Auto-Retry] Complete: ${result.retried} retried, ${result.succeeded} succeeded, ` +
          `${result.failed} failed, ${result.abandoned} abandoned`,
      );

      // Notify all superadmins about auto-retry result
      if (result.retried > 0) {
        await this.notifySuperadmins(result);
      }
    } catch (error) {
      this.logger.error(`[Auto-Retry] Error: ${(error as Error).message}`);
    }
  }

  private async notifySuperadmins(result: {
    retried: number;
    succeeded: number;
    failed: number;
  }): Promise<void> {
    try {
      const superadmins = await this.prisma.user.findMany({
        where: { role: 'superadmin', isActive: true },
        select: { id: true },
      });

      const statusIcon = result.failed === 0 ? '✅' : '⚠️';
      const statusText = result.failed === 0 ? 'Semua berhasil' : `${result.failed} masih gagal`;

      for (const admin of superadmins) {
        await this.notificationsService.send(admin.id, {
          userId: admin.id,
          judul: `${statusIcon} Auto-Retry Email (${new Date().toLocaleDateString('id-ID', { hour: '2-digit', minute: '2-digit' })})`,
          isi: `${result.retried} email gagal dicoba kirim ulang — ${result.succeeded} berhasil, ${result.failed} gagal. (${statusText})`,
          tipe: 'umum' as never,
          data: {
            type: 'email_auto_retry',
            retried: result.retried,
            succeeded: result.succeeded,
            failed: result.failed,
          },
        });
      }
    } catch (error) {
      this.logger.error(`Failed to send auto-retry notification: ${(error as Error).message}`);
    }
  }
}
