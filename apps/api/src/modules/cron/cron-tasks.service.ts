import { Injectable, Logger, Optional } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { GraduationsService } from '../graduations/graduations.service';
import { PersistentAuditService } from '../../common/services/persistent-audit.service';
import { createOverlapGuard } from '../../common/utils/overlap-guard';
import { EmailBlastService, EmailBlastItem } from './email-blast.service';
import { dataIncompleteEmail } from '../../mail/email-templates';

/** Batas retensi sesi tidak aktif (hari). Bisa dioverride via env SESSION_RETENTION_DAYS. */
const SESSION_RETENTION_DAYS = 14;

/** Batas retensi log email (hari). Bisa dioverride via env EMAIL_LOG_RETENTION_DAYS. */
const EMAIL_LOG_RETENTION_DAYS = 90;
/** Sesi yang sudah direvoke dihapus setelah berapa hari. */
const SESSION_REVOKED_RETENTION_DAYS = 1;

/** Format tanggal YYYY-MM-DD lokal — bagian dari jobId deterministik blast. */
function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

@Injectable()
export class CronTasksService {
  private readonly logger = new Logger(CronTasksService.name);

  /** Overlap guard: cron yang sama tidak dijalankan ganda dalam satu proses. */
  private readonly guard = createOverlapGuard(this.logger);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly graduationsService: GraduationsService,
    private readonly emailBlast: EmailBlastService,
    @Optional() private readonly persistentAudit?: PersistentAuditService,
  ) {}

  // ─────────────────────────────────────────────────────────
  //  DUES: Auto-generate monthly (1st of month @ 1AM)
  // ─────────────────────────────────────────────────────────

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async autoGenerateMonthlyDues(): Promise<void> {
    return this.guard('autoGenerateMonthlyDues', () => this.autoGenerateMonthlyDuesImpl());
  }

  private async autoGenerateMonthlyDuesImpl(): Promise<void> {
    const today = new Date();
    if (today.getDate() !== 1) return;

    const periode = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    this.logger.log(`Auto-generating dues for period: ${periode}`);

    // Paging + set-based (temuan audit menengah 2026-09): dulu scan tanpa take
    // lalu 3 query per baris (findFirst + create + update). Kini per halaman:
    // 1 findMany + 1 cek existing + createMany + updateMany. Anggota nonaktif
    // difilter di query level.
    const PAGE_SIZE = 500;
    const nextDue = new Date(today);
    nextDue.setMonth(nextDue.getMonth() + 1);

    let generated = 0;
    let skipped = 0;
    let cursor: string | undefined;

    for (;;) {
      const recurrings = await this.prisma.iuranRecurring.findMany({
        where: {
          isActive: true,
          nextDueDate: { lte: today },
          anggota: { statusKeanggotaan: 'aktif' },
        },
        select: { id: true, anggotaId: true, amount: true },
        orderBy: { id: 'asc' },
        take: PAGE_SIZE,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      if (recurrings.length === 0) break;
      cursor = recurrings[recurrings.length - 1].id;

      // Yang sudah punya iuran periode ini → skip (idempoten terhadap rerun)
      const existing = await this.prisma.iuran.findMany({
        where: { anggotaId: { in: recurrings.map((r) => r.anggotaId) }, periode },
        select: { anggotaId: true },
      });
      const existingSet = new Set(existing.map((e) => e.anggotaId));
      const toCreate = recurrings.filter((r) => !existingSet.has(r.anggotaId));
      skipped += recurrings.length - toCreate.length;

      if (toCreate.length > 0) {
        await this.prisma.iuran.createMany({
          data: toCreate.map((r) => ({
            anggotaId: r.anggotaId,
            periode,
            jumlah: r.amount,
            status: 'belum_dibayar',
          })),
        });
        await this.prisma.iuranRecurring.updateMany({
          where: { id: { in: toCreate.map((r) => r.id) } },
          data: { nextDueDate: nextDue },
        });
        generated += toCreate.length;
      }

      if (recurrings.length < PAGE_SIZE) break;
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
    return this.guard('sendDuesReminders', () => this.sendDuesRemindersImpl());
  }

  private async sendDuesRemindersImpl(): Promise<void> {
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

    // Cron hanya MENYIAPKAN item — pengiriman dieksekusi antrean email-blast
    // (tahan restart, retry per-item, jobId deterministik anti-duplikat).
    const items: EmailBlastItem[] = [];
    for (const rec of recurrings) {
      if (rec.anggota.statusKeanggotaan !== 'aktif') continue;

      // Resolve anggota → user (FCM tokens are keyed by userId, not anggotaId)
      const userId = await this.resolveUserIdFromAnggotaId(rec.anggota.id, rec.anggota.email);
      if (!userId) continue;

      items.push({ userId, judul: title, isi: message });
    }

    if (items.length > 0) {
      const enqueued = await this.emailBlast.enqueue('reminder_iuran', dateKey(targetDate), items);
      this.logger.log(`Dues reminder [${label}]: ${enqueued} antrean kirim`);
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

    // Tandai menunggak SET-based via updateMany (temuan audit menengah:
    // dulu N+1 update per baris) — PENGIRIMAN tetap lewat antrean email-blast.
    const marked =
      overdueDues.length > 0
        ? await this.prisma.iuran.updateMany({
            where: { id: { in: overdueDues.map((d) => d.id) } },
            data: { status: 'menunggak' },
          })
        : { count: 0 };

    const items: EmailBlastItem[] = [];
    for (const due of overdueDues) {
      const userId = await this.resolveUserIdFromAnggotaId(due.anggota.id, due.anggota.email);
      if (!userId) continue;

      items.push({
        userId,
        judul: '⚠️ Iuran Menunggak — Segera Bayar!',
        isi: `Iuran periode ${due.periode} sebesar Rp ${Number(due.jumlah).toLocaleString('id-ID')} sudah menunggak lebih dari 7 hari. Segera lakukan pembayaran untuk menghindari sanksi.`,
      });
    }

    if (items.length > 0) {
      const enqueued = await this.emailBlast.enqueue(
        'reminder_iuran',
        dateKey(thresholdDate),
        items,
      );
      this.logger.log(
        `Dues escalation [H+7]: ${marked.count} marked as menunggak, ${enqueued} antrean kirim`,
      );
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

    const items: EmailBlastItem[] = [];
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

      const userId = await this.resolveUserIdFromAnggotaId(due.anggota.id, due.anggota.email);
      if (!userId) continue;

      items.push({
        userId,
        judul: '💳 Iuran Bulan Ini Belum Dibayar',
        isi: `Iuran periode ${due.periode} sebesar Rp ${Number(due.jumlah).toLocaleString('id-ID')} belum dibayar. Segera lakukan pembayaran.`,
      });
    }

    if (items.length > 0) {
      const enqueued = await this.emailBlast.enqueue(
        'reminder_iuran',
        dateKey(new Date()),
        items,
      );
      this.logger.log(
        `Dues reminder [current month]: ${enqueued}/${unpaidCount} antrean kirim`,
      );
    }
  }

  // ─────────────────────────────────────────────────────────
  //  TRAINING REMINDERS: H-1 (daily @ 6AM)
  //  Notify all active members in the ranting about tomorrow's training.
  // ─────────────────────────────────────────────────────────

  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async sendTrainingReminders(): Promise<void> {
    return this.guard('sendTrainingReminders', () => this.sendTrainingRemindersImpl());
  }

  private async sendTrainingRemindersImpl(): Promise<void> {
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

    const items: EmailBlastItem[] = [];
    const todayKey = dateKey(tomorrow);
    for (const training of upcomingTrainings) {
      const members = await this.prisma.anggota.findMany({
        where: { rantingId: training.rantingId, statusKeanggotaan: 'aktif' },
        select: { id: true, namaLengkap: true, email: true },
        take: 200,
      });

      const dateStr = training.hariTanggal.toLocaleDateString('id-ID', {
        weekday: 'long', day: '2-digit', month: 'long',
      });
      const lokasi = training.lokasi || training.ranting?.nama || 'lokasi biasa';
      const materi = training.jenisMateri ? ` (${training.jenisMateri})` : '';

      for (const member of members) {
        const userId = await this.resolveUserIdFromAnggotaId(member.id, member.email);
        if (!userId) continue;

        items.push({
          userId,
          judul: '🏋️ Latihan Besok!',
          isi: `Latihan${materi} besok, ${dateStr} di ${lokasi}. Jangan lupa hadir tepat waktu!`,
        });
      }
    }

    if (items.length > 0) {
      const enqueued = await this.emailBlast.enqueue('reminder_latihan', todayKey, items);
      this.logger.log(`Training reminders: ${enqueued} antrean kirim`);
    }
  }

  // ─────────────────────────────────────────────────────────
  //  INCOMPLETE DATA REMINDERS: weekly on Monday @ 9AM
  //  Send to members with statusData = 'incomplete'
  // ─────────────────────────────────────────────────────────

  @Cron('0 9 * * 1')
  async sendIncompleteDataReminders(): Promise<void> {
    return this.guard('sendIncompleteDataReminders', () => this.sendIncompleteDataRemindersImpl());
  }

  private async sendIncompleteDataRemindersImpl(): Promise<void> {
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
    const emailItems: EmailBlastItem[] = [];

    for (const member of incompleteMembers) {
      const missing = (member.missingFields as string[]) || ['data diri'];
      const missingList = missing.map((f: string) => f.replace(/_/g, ' ')).join(', ');

      // Email langsung ke anggota (bisa jadi belum punya akun user) —
      // dikirim via antrean email-blast (batching, retry per-item),
      // menggantikan Promise.allSettled paralel tanpa batas (temuan P0 audit).
      if (member.email) {
        const tpl = dataIncompleteEmail(member.namaLengkap, missing);
        emailItems.push({
          email: member.email,
          subject: tpl.subject,
          html: tpl.html,
          judul: '📋 Data Anggota Belum Lengkap',
          isi: `Data keanggotaan Anda masih belum lengkap. Segera lengkapi: ${missingList}.`,
        });
      }

      // Resolve anggota → user for in-app notification
      const userId = await this.resolveUserIdFromAnggotaId(member.id, member.email);
      if (!userId) continue;

      // In-app notification tetap langsung (murah, tanpa email/FCM)
      await this.createNotification(
        userId, 'data_incomplete',
        '📋 Data Anggota Belum Lengkap',
        `Data keanggotaan Anda masih belum lengkap. Segera lengkapi: ${missingList}.`,
      );
      sent++;
    }

    if (emailItems.length > 0) {
      emailed = await this.emailBlast.enqueue('data_incomplete', dateKey(new Date()), emailItems);
    }

    this.logger.log(
      `Incomplete data reminders: ${sent} in-app sent, ${emailed} emails queued (${incompleteMembers.length} total incomplete)`,
    );
  }

  // ─────────────────────────────────────────────────────────
  //  BIRTHDAY GREETINGS (daily @ 8AM)
  // ─────────────────────────────────────────────────────────

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async sendBirthdayGreetings(): Promise<void> {
    return this.guard('sendBirthdayGreetings', () => this.sendBirthdayGreetingsImpl());
  }

  private async sendBirthdayGreetingsImpl(): Promise<void> {
    const today = new Date();
    const todayMonth = today.getMonth() + 1;
    const todayDay = today.getDate();

    // Tagged template + LIMIT (temuan audit menengah: *Unsafe tanpa LIMIT)
    const members = await this.prisma.$queryRaw<
      Array<{ id: string; namaLengkap: string; email: string | null }>
    >(
      Prisma.sql`SELECT id, "nama_lengkap", "email" FROM anggota
       WHERE EXTRACT(MONTH FROM "tanggal_lahir") = ${todayMonth}
       AND EXTRACT(DAY FROM "tanggal_lahir") = ${todayDay}
       AND "status_keanggotaan" = 'aktif'
       AND "deleted_at" IS NULL
       LIMIT 500`,
    );

    const items: EmailBlastItem[] = [];
    for (const member of members) {
      const userId = await this.resolveUserIdFromAnggotaId(member.id, member.email);
      if (!userId) continue;

      items.push({
        userId,
        judul: '🎂 Selamat Ulang Tahun!',
        isi: `Selamat ulang tahun, ${member.namaLengkap}! Semoga selalu diberkati dan semakin bersemangat dalam berlatih. 🎉`,
      });
    }

    if (items.length > 0) {
      const enqueued = await this.emailBlast.enqueue('umum', dateKey(today), items);
      this.logger.log(`Birthday greetings: ${enqueued} antrean kirim`);
    }
  }

  // ─────────────────────────────────────────────────────────
  //  OVERDUE DUES: mark as menunggak (daily @ midnight)
  // ─────────────────────────────────────────────────────────

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async markOverdueDues(): Promise<void> {
    return this.guard('markOverdueDues', () => this.markOverdueDuesImpl());
  }

  private async markOverdueDuesImpl(): Promise<void> {
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
  //  GRADUATION INVITATIONS: H-7 (daily @ 5AM)
  //  Auto-generate undangan pendadaran 7 hari sebelum kegiatan dimulai
  //  (kriteria: masa anggota >2 tahun dari tahun dadar ATAU tingkat Pratama)
  //  + kirim email & in-app notification.
  // ─────────────────────────────────────────────────────────

  @Cron(CronExpression.EVERY_DAY_AT_5AM)
  async sendGraduationInvitationsH7(): Promise<void> {
    return this.guard('sendGraduationInvitationsH7', () => this.sendGraduationInvitationsH7Impl());
  }

  private async sendGraduationInvitationsH7Impl(): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const hMinus7 = new Date(today);
    hMinus7.setDate(hMinus7.getDate() + 7);
    const hMinus7End = new Date(hMinus7);
    hMinus7End.setHours(23, 59, 59, 999);

    const graduations = await this.prisma.kegiatan.findMany({
      where: {
        tipe: 'pendadaran',
        status: { notIn: ['cancelled', 'closed'] },
        tanggalMulai: { gte: hMinus7, lte: hMinus7End },
      },
      select: { id: true, nama: true },
      take: 50,
    });

    if (graduations.length === 0) return;

    for (const g of graduations) {
      try {
        const result = await this.graduationsService.generateInvitations(g.id);
        this.logger.log(
          `H-7 invitations for "${g.nama}" (${g.id}): generated=${result.generated} skipped=${result.skipped} total=${result.total}`,
        );
      } catch (error) {
        this.logger.error(
          `H-7 invitation generation failed for ${g.id}: ${(error as Error).message}`,
        );
      }
    }
  }

  // ─────────────────────────────────────────────────────────
  //  SESSION CLEANUP: hapus sesi kedaluwarsa (daily @ 2AM)
  //  - Sesi tidak aktif > SESSION_RETENTION_DAYS hari (default 14) → dihapus
  //  - Sesi yang sudah direvoke > SESSION_REVOKED_RETENTION_DAYS hari → dihapus
  //  Tanpa ini, baris user_sessions menumpuk tanpa batas (kasus prod:
  //  255 sesi aktif menumpuk untuk satu user).
  // ─────────────────────────────────────────────────────────

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupStaleSessions(): Promise<void> {
    return this.guard('cleanupStaleSessions', () => this.cleanupStaleSessionsImpl());
  }

  private async cleanupStaleSessionsImpl(): Promise<void> {
    const retentionDays =
      Number(process.env.SESSION_RETENTION_DAYS) || SESSION_RETENTION_DAYS;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);

    // Sesi tidak aktif melewati batas retensi → hapus permanen
    const stale = await this.prisma.userSession.deleteMany({
      where: { lastUsedAt: { lt: cutoff } },
    });

    // Sesi revoked lama tidak lagi berguna untuk riwayat → hapus juga
    const revokedCutoff = new Date();
    revokedCutoff.setDate(
      revokedCutoff.getDate() - SESSION_REVOKED_RETENTION_DAYS,
    );
    const revoked = await this.prisma.userSession.deleteMany({
      where: { revokedAt: { lt: revokedCutoff } },
    });

    const total = stale.count + revoked.count;
    if (total === 0) return;

    this.logger.log(
      `Session cleanup: ${stale.count} stale (>${retentionDays} hari) + ${revoked.count} revoked dihapus`,
    );

    // Catat ke audit log (best-effort) agar eksekusi cron dapat diaudit
    await this.persistentAudit?.log({
      action: 'SESSION_CLEANUP',
      entity: 'UserSession',
      entityId: null,
      userId: null,
      details: { stale: stale.count, revoked: revoked.count, retentionDays },
    });
  }

  // ─────────────────────────────────────────────────────────
  //  EMAIL LOG RETENTION: hapus log email kedaluwarsa (daily @ 3AM)
  //  - email_logs lebih tua dari EMAIL_LOG_RETENTION_DAYS hari (default 90) → dihapus
  //  Tanpa ini, email_logs tumbuh tanpa batas (kasus prod 2026-09: 132 ribu baris
  //  dari insiden retry-loop; lihat docs/INCIDENT-2026-09-EMAIL-RETRY-LOOP.md).
  // ─────────────────────────────────────────────────────────

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupOldEmailLogs(): Promise<void> {
    return this.guard('cleanupOldEmailLogs', () => this.cleanupOldEmailLogsImpl());
  }

  private async cleanupOldEmailLogsImpl(): Promise<void> {
    const retentionDays =
      Number(process.env.EMAIL_LOG_RETENTION_DAYS) || EMAIL_LOG_RETENTION_DAYS;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);

    const deleted = await this.prisma.emailLog.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });

    if (deleted.count === 0) return;

    this.logger.log(
      `Email log cleanup: ${deleted.count} baris (>${retentionDays} hari) dihapus`,
    );

    // Catat ke audit log (best-effort) agar eksekusi cron dapat diaudit
    await this.persistentAudit?.log({
      action: 'EMAIL_LOG_CLEANUP',
      entity: 'EmailLog',
      entityId: null,
      userId: null,
      details: { deleted: deleted.count, retentionDays },
    });
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

  /**
   * Resolve an anggota (member) ID to the corresponding User ID.
   *
   * FCM tokens, device_tokens, notifikasi, and socket.io sessions are all
   * keyed by User.id. Cron tasks query by anggota.id, so we must bridge the gap.
   *
   * Lookup strategy:
   *   1. Find User by anggota.email (primary link)
   *   2. Find User by anggota.noHp (phone fallback)
   *   3. Find User by synthetic email ${anggota.id}@noemail.ths-thm.org
   *   4. Create a new User if none exists (mirrors kepengurusan.service.ts:resolveUserFromMember)
   *
   * @returns The User.id, or null if resolution fails unexpectedly.
   */
  private async resolveUserIdFromAnggotaId(
    anggotaId: string,
    anggotaEmail?: string | null,
  ): Promise<string | null> {
    try {
      const anggota = await this.prisma.anggota.findUnique({
        where: { id: anggotaId },
        select: { id: true, email: true, noHp: true, namaLengkap: true, rantingId: true },
      });
      if (!anggota) return null;

      // Use the passed email or the one from DB
      const email = anggotaEmail || anggota.email;

      // 1. Try by email
      let user = null;
      if (email) {
        user = await this.prisma.user.findUnique({ where: { email } });
      }
      // 2. Try by phone
      if (!user && anggota.noHp) {
        user = await this.prisma.user.findFirst({ where: { phone: anggota.noHp } });
      }
      // 3. Try by synthetic email
      if (!user) {
        const syntheticEmail = `${anggota.id}@noemail.ths-thm.org`;
        user = await this.prisma.user.findUnique({ where: { email: syntheticEmail } });
      }
      // 4. Create user if not found
      if (!user) {
        const fallbackEmail = email || (anggota.noHp ? `${anggota.noHp}@noemail.ths-thm.org` : `${anggota.id}@noemail.ths-thm.org`);
        const bcrypt = await import('bcryptjs');
        const passwordHash = await bcrypt.hash('thsthm123456', 12);
        user = await this.prisma.user.create({
          data: {
            email: fallbackEmail,
            passwordHash,
            namaLengkap: anggota.namaLengkap,
            role: 'anggota',
            rantingId: anggota.rantingId,
            isActive: true,
            phone: anggota.noHp || null,
            mustChangePassword: true,
          },
        });
      }

      return user.id;
    } catch (error) {
      this.logger.error(`resolveUserIdFromAnggotaId failed for ${anggotaId}: ${(error as Error).message}`);
      return null;
    }
  }
}
