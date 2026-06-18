import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CronTasksService {
  private readonly logger = new Logger(CronTasksService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Auto-generate monthly dues for members with active IuranRecurring config.
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
      if (rec.anggota.statusKeanggotaan !== 'aktif') {
        skipped++;
        continue;
      }

      const existing = await this.prisma.iuran.findFirst({
        where: { anggotaId: rec.anggotaId, periode },
      });
      if (existing) {
        skipped++;
        continue;
      }

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
   * Send reminders for unpaid dues via FCM + Email to members
   */
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async sendDuesReminders(): Promise<void> {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const unpaidDues = await this.prisma.iuran.findMany({
      where: { status: { in: ['belum_dibayar', 'menunggak'] }, periode: currentMonth },
      include: { anggota: { select: { id: true, namaLengkap: true, email: true, rantingId: true } } },
      take: 100,
    });

    let remindersSent = 0;
    for (const due of unpaidDues) {
      const alreadyReminded = await this.prisma.iuranReminder.findFirst({
        where: {
          iuranId: due.id,
          sentAt: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) },
        },
      });
      if (alreadyReminded) continue;

      await this.prisma.iuranReminder.create({
        data: { iuranId: due.id, channel: 'system', status: 'sent' },
      });

      // Create in-app notification
      await this.createNotification(due.anggotaId, 'reminder_iuran',
        'Pengingat Iuran',
        `Iuran periode ${currentMonth} Anda segera jatuh tempo. Segera lakukan pembayaran.`);

      remindersSent++;
    }

    if (remindersSent > 0) {
      this.logger.log(`Dues reminders sent: ${remindersSent}`);
    }
  }

  /**
   * Send training reminders (H-1) to members
   */
  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async sendTrainingReminders(): Promise<void> {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const nextDay = new Date(tomorrow);
    nextDay.setDate(nextDay.getDate() + 1);

    const upcomingTrainings = await this.prisma.latihan.findMany({
      where: {
        hariTanggal: { gte: tomorrow, lt: nextDay },
      },
      include: {
        ranting: { select: { nama: true } },
        absensi: { include: { anggota: { select: { id: true, email: true } } } },
      },
      take: 50,
    });

    let remindersSent = 0;
    for (const training of upcomingTrainings) {
      // Notify all members in this ranting
      const members = await this.prisma.anggota.findMany({
        where: { rantingId: training.rantingId, statusKeanggotaan: 'aktif' },
        select: { id: true, namaLengkap: true },
        take: 200,
      });

      for (const member of members) {
        await this.createNotification(member.id, 'reminder_latihan',
          'Pengingat Latihan',
          `Latihan besok (${training.hariTanggal.toLocaleDateString('id-ID')}) di ${training.lokasi || training.ranting?.nama || 'lokasi biasa'}. Jangan lupa hadir!`);
        remindersSent++;
      }
    }

    if (remindersSent > 0) {
      this.logger.log(`Training reminders sent: ${remindersSent}`);
    }
  }

  /**
   * Send birthday greetings to members
   */
  @Cron(CronExpression.EVERY_DAY_AT_7AM)
  async sendBirthdayGreetings(): Promise<void> {
    const today = new Date();
    const todayMonth = today.getMonth() + 1;
    const todayDay = today.getDate();

    // Find members whose birthday is today
    // Note: PostgreSQL EXTRACT works for date comparison
    const members = await this.prisma.$queryRawUnsafe<Array<{ id: string; namaLengkap: string }>>(
      `SELECT id, "nama_lengkap" FROM anggota 
       WHERE EXTRACT(MONTH FROM "tanggal_lahir") = $1 
       AND EXTRACT(DAY FROM "tanggal_lahir") = $2
       AND "status_keanggotaan" = 'aktif'
       AND "deleted_at" IS NULL`,
      todayMonth,
      todayDay,
    );

    let greetingsSent = 0;
    for (const member of members) {
      await this.createNotification(member.id, 'umum',
        'Selamat Ulang Tahun! 🎂',
        `Selamat ulang tahun, ${member.namaLengkap}! Semoga selalu diberkati dan semakin bersemangat dalam berlatih.`);
      greetingsSent++;
    }

    if (greetingsSent > 0) {
      this.logger.log(`Birthday greetings sent: ${greetingsSent}`);
    }
  }

  /**
   * Mark overdue dues as 'menunggak'
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

  /**
   * Create in-app notification for a user
   */
  private async createNotification(userId: string, tipe: string, judul: string, isi: string): Promise<void> {
    try {
      await this.prisma.notifikasi.create({
        data: { userId, tipe: tipe as never, judul, isi },
      });
    } catch (error) {
      this.logger.error(`Failed to create notification for user ${userId}: ${(error as Error).message}`);
    }
  }
}