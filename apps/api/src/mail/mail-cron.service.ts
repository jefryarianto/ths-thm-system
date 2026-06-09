import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MailService } from './mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../modules/notifications/notifications.service';

@Injectable()
export class MailCronService {
  private readonly logger = new Logger(MailCronService.name);

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
    const failedCount = await this.prisma.emailLog.count({
      where: { status: 'failed', content: { not: null } },
    });

    if (failedCount === 0) {
      this.logger.log('[Auto-Retry] No failed emails to retry');
      return;
    }

    this.logger.log(`[Auto-Retry] Found ${failedCount} failed emails, starting retry...`);

    try {
      const result = await this.mailService.retryFailedEmails();

      this.logger.log(
        `[Auto-Retry] Complete: ${result.retried} retried, ${result.succeeded} succeeded, ${result.failed} failed`,
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
      const statusText =
        result.failed === 0
          ? 'Semua berhasil'
          : `${result.failed} masih gagal`;

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
