import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CronTasksService {
  private readonly logger = new Logger(CronTasksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ─────────────────────────────────────────────────────────
  //  DUES: Auto-generate monthly (1st of month @ 1AM)
  // ─────────────────────────────────────────────────────────

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

  // ─────────────────────────────────────────────────────────
  //  DUES REMINDERS: H-7, H-1, H+7 (daily @ 7AM)
  // ─────────────────────────────────────────────────────────
  //
  //  H-7  → Members whose IuranRecurring.nextDueDate is 7 days away
  //  H-1  → Members whose IuranRecurring.nextDueDate is tomorrow
  //  H+7  → Members with unpaid dues from ≥7 days ago (escalation)
  // ─────────────────────────────────────────────────────────

  @Cron(CronExpression.EVERY_DAY_AT_7AM)
  async sendDuesReminders(): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // ── H-7: 7 days before next due date ─────────────────
    const in7Days = new Date(today);
    in7Days.setDate(in7Days.getDate() + 7);
    await this.sendDueDateReminders(in7Days, 'H-7',
      'Pengingat Iuran (H-7)',
      'Iuran Anda akan jatuh tempo dalam 7 hari. Segera persiapkan pembayaran.');

    // ── H-1: tomorrow ────────────────────────────────────
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    await this.sendDueDateReminders(tomorrow, 'H-1',
      'Pengingat Iuran (H-1) — Jatuh Tempo Besok!',
      'Iuran Anda jatuh tempo besok. Lakukan pembayaran sekarang untuk menghindari keterlambatan.');

    // ── H+7: unpaid for ≥7 days → escalate to menunggak ──
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    await this.sendOverdueEscalation(sevenDaysAgo);

    // ── Also send daily reminder for unpaid current-month ─
    const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    await this.sendCurrentMonthReminder(currentMonth);
  }

  /**
   * Send reminder to members whose IuranRecurring.nextDueDate matches a target date.
   */
  private async sendDueDateReminders(
    targetDate: Date,
    label: string,
    title: string,
    message: string,
  ): Promise<void> {
    const targetStart = new Date(targetDate);
    targetStart.setHours(0, 0, 0, 0);
    const targetEnd = new Date(targetStart);
    targetEnd.setHours(23, 59, 59, 999);

    const recurrings = await this.prisma.iuranRecurring.findMany({
      where: {
        isActive: true,
        nextDueDate: { gte: targetStart, lte: targetEnd },
      },
      include: {
        anggota: {
          select: { id: true, namaLengkap: true, email: true, statusKeanggotaan: true },
        },
      },
      take: 200,
    });

    let sent = 0;
    for (const rec of recurrings) {
      if (rec.anggota.statusKeanggotaan !== 'aktif') continue;

      // Create in-app notification + email + FCM via NotificationsService
      try {
        await this.notificationsService.send(rec.anggota.id, {
          userId: rec.anggota.id,
          judul: title,
          isi: message,
          tipe: 'reminder_iuran',
        });
      } catch {
        // Fallback: direct in-app notification
        await this.createNotification(
          rec.anggota.id, 'reminder_iuran', title, message,
        );
      }
      sent++;
    }

    if (sent > 0) {
      this.logger.log(`Dues reminder [${label}]: ${sent} sent`);
    }
  }

  /**
   * Escalate unpaid dues that are ≥7 days overdue → mark as menunggak + notify.
   */
  private async sendOverdueEscalation(thresholdDate: Date): Promise<void> {
    const overdueDues = await this.prisma.iuran.findMany({
      where: {
        status: 'belum_dibayar',
        createdAt: { lt: thresholdDate },
      },
      include: {
        anggota: { select: { id: true, namaLengkap: true, email: true } },
      },
      take: 200,
    });

    let escalated = 0;
    for (const due of overdueDues) {
      // Mark as overdue
      await this.prisma.iuran.update({
        where: { id: due.id },
        data: { status: 'menunggak' },
      });

      try {
        await this.notificationsService.send(due.anggota.id, {
          userId: due.anggota.id,
          judul: '⚠️ Iuran Menunggak — Segera Bayar!',
          isi: `Iuran periode ${due.periode} sebesar Rp ${Number(due.jumlah).toLocaleString('id-ID')} sudah menunggak lebih dari 7 hari. Segera lakukan pembayaran untuk menghindari sanksi.`,
          tipe: 'reminder_iuran',
        });
      } catch {
        await this.createNotification(
          due.anggota.id, 'reminder_iuran',
          '⚠️ Iuran Menunggak — Segera Bayar!',
          `Iuran periode ${due.periode} sudah menunggak lebih dari 7 hari. Segera lakukan pembayaran.`,
        );
      }
      escalated++;
    }

    if (escalated > 0) {
      this.logger.log(`Dues escalation [H+7]: ${escalated} marked as menunggak`);
    }
  }

  /**
   * Send a daily digest reminder for unpaid current-month dues.
   */
  private async sendCurrentMonthReminder(periode: string): Promise<void> {
    const unpaidCount = await this.prisma.iuran.count({
      where: { periode, status: { in: ['belum_dibayar', 'menunggak'] } },
      take: 500,
    });

    if (unpaidCount === 0) return;

    const unpaidMembers = await this.prisma.iuran.findMany({
      where: { periode, status: { in: ['belum_dibayar', 'menunggak'] } },
      include: {
        anggota: { select: { id: true, namaLengkap: true, email: true } },
      },
      take: 100,
    });

    let sent = 0;
    for (const due of unpaidMembers) {
      const alreadyReminded = await this.prisma.iuranReminder.findFirst({
        where: {
          iuranId: due.id,
          sentAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      });
      if (alreadyReminded) continue;

      await this.prisma.iuranReminder.create({
        data: { iuranId: due.id, channel: 'system', status: 'sent' },
      });

      try {
        await this.notificationsService.send(due.anggota.id, {
          userId: due.anggota.id,
          judul: '💳 Iuran Bulan Ini Belum Dibayar',
          isi: `Iuran periode ${due.periode} sebesar Rp ${Number(due.jumlah).toLocaleString('id-ID')} belum dibayar. Segera lakukan pembayaran.`,
          tipe: 'reminder_iuran',
        });
      } catch {
        await this.createNotification(
          due.anggota.id, 'reminder_iuran',
          '💳 Iuran Bulan Ini Belum Dibayar',
          `Iuran periode ${due.periode} sebesar Rp ${Number(due.jumlah).toLocaleString('id-ID')} belum dibayar.`,
        );
      }
      sent++;
    }

    if (sent > 0) {
      this.logger.log(`Dues reminder [current month]: ${sent}/${unpaidCount} sent`);
    }
  }

  // ─────────────────────────────────────────────────────────
  //  TRAINING REMINDERS: H-1 (daily @ 6AM)
  //  Notify all active members in the ranting about tomorrow's training.
  // ─────────────────────────────────────────────────────────

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
      const members = await this.prisma.anggota.findMany({
        where: { rantingId: training.rantingId, statusKeanggotaan: 'aktif' },
        select: { id: true, namaLengkap: true },
        take: 200,
      });

      const dateStr = training.hariTanggal.toLocaleDateString('id-ID', {
        weekday: 'long', day: 'numeric', month: 'long',
      });
      const lokasi = training.lokasi || training.ranting?.nama || 'lokasi biasa';
      const materi = training.jenisMateri ? ` (${training.jenisMateri})` : '';

      for (const member of members) {
      try {
        await this.notificationsService.send(member.id, {
          userId: member.id,
          judul: '🏋️ Latihan Besok!',
          isi: `Latihan${materi} besok, ${dateStr} di ${lokasi}. Jangan lupa hadir tepat waktu!`,
          tipe: 'reminder_latihan',
        });
      } catch {
        await this.createNotification(
          member.id, 'reminder_latihan',
          '🏋️ Latihan Besok!',
          `Latihan${materi} besok, ${dateStr} di ${lokasi}. Jangan lupa hadir!`,
        );
      }
        remindersSent++;
      }
    }

    if (remindersSent > 0) {
      this.logger.log(`Training reminders sent: ${remindersSent}`);
    }
  }

  // ─────────────────────────────────────────────────────────
  //  INCOMPLETE DATA REMINDERS: weekly on Monday @ 9AM
  //  Send to members with statusData = 'incomplete'
  // ─────────────────────────────────────────────────────────

  @Cron('0 9 * * 1')
  async sendIncompleteDataReminders(): Promise<void> {
    this.logger.log('Checking for members with incomplete data...');

    const incompleteMembers = await this.prisma.anggota.findMany({
      where: {
        statusData: 'incomplete',
        deletedAt: null,
        statusKeanggotaan: 'aktif',
      },
      select: {
        id: true,
        namaLengkap: true,
        email: true,
        missingFields: true,
      },
      take: 500,
    });

    if (incompleteMembers.length === 0) {
      this.logger.log('Incomplete data: no members found');
      return;
    }

    let sent = 0;
    let emailed = 0;

    // Send batch emails via existing service (this handles all email dispatch)
    try {
      const emailResult = await this.notificationsService.sendIncompleteNotifications();
      emailed = emailResult?.data?.sent || 0;
    } catch (error) {
      this.logger.warn(`Incomplete data email batch failed: ${(error as Error).message}`);
    }

    for (const member of incompleteMembers) {
      const missing = (member.missingFields as string[]) || ['data diri'];
      const missingList = missing.map((f: string) => f.replace(/_/g, ' ')).join(', ');

      // In-app notification only (emails handled by batch above)
      await this.createNotification(
        member.id, 'data_incomplete',
        '📋 Data Anggota Belum Lengkap',
        `Data keanggotaan Anda masih belum lengkap. Segera lengkapi: ${missingList}.`,
      );
      sent++;
    }

    this.logger.log(
      `Incomplete data reminders: ${sent} in-app sent, ${emailed} emails sent (${incompleteMembers.length} total incomplete)`,
    );
  }

  // ─────────────────────────────────────────────────────────
  //  BIRTHDAY GREETINGS (daily @ 8AM)
  // ─────────────────────────────────────────────────────────

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async sendBirthdayGreetings(): Promise<void> {
    const today = new Date();
    const todayMonth = today.getMonth() + 1;
    const todayDay = today.getDate();

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
      try {
        await this.notificationsService.send(member.id, {
          userId: member.id,
          judul: '🎂 Selamat Ulang Tahun!',
          isi: `Selamat ulang tahun, ${member.namaLengkap}! Semoga selalu diberkati dan semakin bersemangat dalam berlatih. 🎉`,
          tipe: 'umum',
        });
      } catch {
        await this.createNotification(
          member.id, 'umum',
          '🎂 Selamat Ulang Tahun!',
          `Selamat ulang tahun, ${member.namaLengkap}! Semoga selalu diberkati.`,
        );
      }
      greetingsSent++;
    }

    if (greetingsSent > 0) {
      this.logger.log(`Birthday greetings sent: ${greetingsSent}`);
    }
  }

  // ─────────────────────────────────────────────────────────
  //  OVERDUE DUES: mark as menunggak (daily @ midnight)
  // ─────────────────────────────────────────────────────────

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async markOverdueDues(): Promise<void> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const overdue = await this.prisma.iuran.updateMany({
      where: { status: 'belum_dibayar', createdAt: { lt: thirtyDaysAgo } },
      data: { status: 'menunggak' },
    });

    if (overdue.count > 0) {
      this.logger.log(`Marked ${overdue.count} dues as menunggak (30+ days)`);
    }
  }

  // ─────────────────────────────────────────────────────────
  //  HELPERS
  // ─────────────────────────────────────────────────────────

  /**
   * Create in-app notification for a user (fallback when NotificationsService fails).
   */
  private async createNotification(
    userId: string,
    tipe: string,
    judul: string,
    isi: string,
  ): Promise<void> {
    try {
      await this.prisma.notifikasi.create({
        data: { userId, tipe: tipe as never, judul, isi },
      });
    } catch (error) {
      this.logger.error(`Failed to create notification for user ${userId}: ${(error as Error).message}`);
    }
  }
}
