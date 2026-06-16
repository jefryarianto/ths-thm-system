import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CronTasksService {
  private readonly logger = new Logger(CronTasksService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Auto-generate monthly dues for members with active IuranRecurring config.
   * Runs every day at 1 AM — checks if today is the first of the month.
   */
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async autoGenerateMonthlyDues(): Promise<void> {
    const today = new Date();
    if (today.getDate() !== 1) return;

    const periode = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    this.logger.log(`Auto-generating dues for period: ${periode}`);

    const recurrings = await this.prisma.iuranRecurring.findMany({
      where: { isActive: true, nextDueDate: { lte: today } },
      include: { anggota: { select: { id: true, statusKeanggotaan: true } } },
    });

    let generated = 0;
    let skipped = 0;

    for (const rec of recurrings) {
      if (rec.anggota.statusKeanggotaan !== 'aktif') { skipped++; continue; }

      const existing = await this.prisma.iuran.findFirst({
        where: { anggotaId: rec.anggotaId, periode },
      });
      if (existing) { skipped++; continue; }

      try {
        await this.prisma.iuran.create({
          data: { anggotaId: rec.anggotaId, periode, jumlah: rec.amount, status: 'belum_dibayar' },
        });

        const nextDue = new Date(today);
        nextDue.setMonth(nextDue.getMonth() + 1);
        await this.prisma.iuranRecurring.update({
          where: { id: rec.id },
          data: { nextDueDate: nextDue },
        });
        generated++;
      } catch (error) {
        this.logger.error(`Failed to generate due for ${rec.anggotaId}: ${(error as Error).message}`);
      }
    }
    this.logger.log(`Dues generation: ${generated} created, ${skipped} skipped`);
  }

  /**
   * Send reminders for unpaid dues.
   * Runs every day at 8 AM.
   * Notifies admin users about unpaid dues in their scope.
   */
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async sendDuesReminders(): Promise<void> {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const unpaidDues = await this.prisma.iuran.findMany({
      where: { status: { in: ['belum_dibayar', 'menunggak'] }, periode: currentMonth },
      include: { anggota: { select: { id: true, namaLengkap: true, rantingId: true } } },
      take: 100,
    });

    let remindersSent = 0;
    for (const due of unpaidDues) {
      const alreadyReminded = await this.prisma.iuranReminder.findFirst({
        where: { iuranId: due.id, sentAt: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) } },
      });
      if (alreadyReminded) continue;

      await this.prisma.iuranReminder.create({
        data: { iuranId: due.id, channel: 'system', status: 'sent' },
      });
      remindersSent++;
    }

    if (remindersSent > 0) {
      this.logger.log(`Dues reminders sent: ${remindersSent} (${unpaidDues.length} total unpaid)`);
    }
  }

  /**
   * Mark overdue dues as 'menunggak'.
   * Runs every day at midnight.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async markOverdueDues(): Promise<void> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const overdue = await this.prisma.iuran.updateMany({
      where: { status: 'belum_dibayar', createdAt: { lt: thirtyDaysAgo } },
      data: { status: 'menunggak' },
    });

    if (overdue.count > 0) {
      this.logger.log(`Marked ${overdue.count} dues as menunggak`);
    }
  }
}