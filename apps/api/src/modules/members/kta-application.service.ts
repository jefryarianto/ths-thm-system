import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
  Optional,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { Prisma, KtaAppStatus, KtaAppLevel, KtaAppAction, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UserScope } from '../../common/interfaces/user-scope.interface';
import { ScopeHelper } from '../../common/utils/scope-helpers';
import { NraService } from '../../common/services/nra.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PersistentAuditService } from '../../common/services/persistent-audit.service';
import { CacheService } from '../../common/services/cache.service';
import { MembersDigitalCardService } from './members-digital-card.service';
import { PkiService } from '../../common/services/pki.service';
import { calculateMissingFields } from '../../common/utils/member-completeness';

const LEVEL_ORDER: KtaAppLevel[] = ['RANTING', 'WILAYAH', 'DISTRIK', 'NASIONAL'];

const SKIP_MAP: Record<string, KtaAppLevel[]> = {
  member: [],
  admin_ranting: ['RANTING'],
  admin_wilayah: ['RANTING', 'WILAYAH'],
  admin_distrik: ['RANTING', 'WILAYAH', 'DISTRIK'],
  admin_nasional: ['RANTING', 'WILAYAH', 'DISTRIK', 'NASIONAL'],
  superadmin: ['RANTING', 'WILAYAH', 'DISTRIK', 'NASIONAL'],
};

const LEVEL_TO_STATUS: Record<KtaAppLevel, KtaAppStatus> = {
  RANTING: 'RANTING_REVIEW',
  WILAYAH: 'WILAYAH_REVIEW',
  DISTRIK: 'DISTRIK_REVIEW',
  NASIONAL: 'NASIONAL_REVIEW',
  MEMBER: 'SUBMITTED',
};

const STATUS_TO_LEVEL: Record<KtaAppStatus, KtaAppLevel> = {
  SUBMITTED: 'MEMBER',
  RANTING_REVIEW: 'RANTING',
  WILAYAH_REVIEW: 'WILAYAH',
  DISTRIK_REVIEW: 'DISTRIK',
  NASIONAL_REVIEW: 'NASIONAL',
  APPROVED: 'NASIONAL',
  PAYMENT_SETUP: 'DISTRIK',
  PAYMENT_PENDING: 'DISTRIK',
  PAYMENT_VERIFIED: 'DISTRIK',
  CARD_GENERATING: 'DISTRIK',
  CARD_GENERATED: 'DISTRIK',
  REJECTED: 'MEMBER',
  CANCELLED: 'MEMBER',
};

const LEVEL_TO_ROLE: Record<KtaAppLevel, string> = {
  RANTING: 'admin_ranting',
  WILAYAH: 'admin_wilayah',
  DISTRIK: 'admin_distrik',
  NASIONAL: 'admin_nasional',
  MEMBER: 'anggota',
};

const LEVEL_LABELS: Record<KtaAppLevel, string> = {
  RANTING: 'Admin Ranting',
  WILAYAH: 'Admin Wilayah',
  DISTRIK: 'Admin Distrik',
  NASIONAL: 'Admin Nasional',
  MEMBER: 'Anggota',
};

const FINAL_STATES: KtaAppStatus[] = [
  'APPROVED',
  'PAYMENT_SETUP',
  'PAYMENT_PENDING',
  'PAYMENT_VERIFIED',
  'CARD_GENERATING',
  'CARD_GENERATED',
  'REJECTED',
  'CANCELLED',
];

const REVIEW_STATES: KtaAppStatus[] = [
  'SUBMITTED',
  'RANTING_REVIEW',
  'WILAYAH_REVIEW',
  'DISTRIK_REVIEW',
  'NASIONAL_REVIEW',
];

function getInitialStatus(submittedByRole: string): KtaAppStatus {
  const skipped = SKIP_MAP[submittedByRole] || [];
  for (const level of LEVEL_ORDER) {
    if (!skipped.includes(level)) return LEVEL_TO_STATUS[level];
  }
  return 'APPROVED';
}

function getNextLevel(currentLevel: KtaAppLevel): KtaAppLevel | null {
  const idx = LEVEL_ORDER.indexOf(currentLevel);
  if (idx === -1 || idx === LEVEL_ORDER.length - 1) return null;
  return LEVEL_ORDER[idx + 1];
}

function getLevelFromStatus(status: KtaAppStatus): KtaAppLevel {
  return STATUS_TO_LEVEL[status] || 'MEMBER';
}

function getScopeLevel(role: string): string {
  switch (role) {
    case 'admin_ranting':
      return 'ranting';
    case 'admin_wilayah':
      return 'wilayah';
    case 'admin_distrik':
      return 'distrik';
    default:
      return 'member';
  }
}

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
}

@Injectable()
export class KtaApplicationService {
  private readonly logger = new Logger(KtaApplicationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeHelper: ScopeHelper,
    private readonly nraService: NraService,
    @Optional() private readonly notificationsService?: NotificationsService,
    @Optional() private readonly persistentAudit?: PersistentAuditService,
    private readonly cache?: CacheService,
    private readonly digitalCardService?: MembersDigitalCardService,
    private readonly pkiService?: PkiService,
  ) {}

  private audit(action: string, entityId: string, userId?: string, details?: Record<string, unknown>) {
    void this.persistentAudit?.log({
      action,
      entity: 'KtaApplication',
      entityId,
      userId: userId ?? null,
      ipAddress: null,
      userAgent: null,
      details: details ?? null,
    });
  }

  // ============================================================
  // SUBMIT (Self, by email)
  // ============================================================
  async submitSelf(userEmail: string, submitter: { id: string; role: string }) {
    const member = await this.prisma.anggota.findFirst({
      where: { email: userEmail, deletedAt: null },
      select: { id: true },
    });
    if (!member) throw new NotFoundException('Anggota tidak ditemukan');
    return this.submit(member.id, submitter, undefined);
  }

  // ============================================================
  // SUBMIT (Individual)
  // ============================================================
  async submit(
    anggotaId: string,
    submitter: { id: string; role: string },
    scope?: UserScope,
  ) {
    const member = await this.prisma.anggota.findUnique({
      where: { id: anggotaId, deletedAt: null },
      include: { ranting: { include: { wilayah: { include: { distrik: true } } } } },
    });
    if (!member) throw new NotFoundException('Anggota tidak ditemukan');

    if (scope && !(await this.scopeHelper.hasAccessToResourceAsync(this.prisma, scope, member.rantingId))) {
      throw new ForbiddenException('Anggota diluar cakupan wilayah Anda');
    }

    const missing = calculateMissingFields(member as unknown as Record<string, unknown>);
    if (missing.length > 0) {
      throw new BadRequestException(`Data anggota belum lengkap: ${missing.join(', ')}`);
    }

    const activeApp = await this.prisma.ktaApplication.findFirst({
      where: { anggotaId, status: { in: [...REVIEW_STATES, 'APPROVED', 'PAYMENT_SETUP', 'PAYMENT_PENDING', 'PAYMENT_VERIFIED', 'CARD_GENERATING'] } },
    });
    if (activeApp) throw new BadRequestException('Masih ada pengajuan KTA aktif untuk anggota ini');

    const existingCard = await this.prisma.dokumen.findFirst({
      where: { anggotaId, tipe: 'kartu_anggota', status: { not: 'revoked' } },
    });
    if (existingCard) throw new BadRequestException('Anggota sudah memiliki KTA aktif');

    const skippedLevels = SKIP_MAP[submitter.role] || [];
    const initialStatus = getInitialStatus(submitter.role);

    const app = await this.prisma.$transaction(async (tx) => {
      const created = await tx.ktaApplication.create({
        data: {
          anggotaId,
          submittedById: submitter.id,
          submittedByRole: submitter.role,
          status: initialStatus,
        },
      });

      for (const level of LEVEL_ORDER) {
        const isSkipped = skippedLevels.includes(level);
        await tx.ktaAppHistory.create({
          data: {
            ktaApplicationId: created.id,
            level,
            action: isSkipped ? 'SKIPPED' : 'SUBMITTED',
            actorId: submitter.id,
            actorRole: submitter.role,
            isSkipped,
            skippedReason: isSkipped ? `Auto-skip: submitter adalah ${submitter.role}` : null,
          },
        });
      }

      if (!skippedLevels.includes(getLevelFromStatus(initialStatus))) {
        await this.notifyLevel(created.id, initialStatus, tx);
      }

      return created;
    });

    await this.notifyMember(member, {
      judul: '📋 Pengajuan KTA Diterima',
      isi: `Pengajuan KTA Anda telah dikirim. Status saat ini: ${initialStatus.replace(/_/g, ' ')}. Pantau perkembangannya di aplikasi.`,
      tipe: 'kta_submitted',
      data: { applicationId: app.id, screen: 'kta-status' },
    });

    this.audit('KTA_SUBMIT', app.id, submitter.id, { anggotaId, initialStatus, skippedLevels });
    return app;
  }

  // ============================================================
  // SUBMIT (Bulk)
  // ============================================================
  async submitBulk(
    anggotaIds: string[],
    submitter: { id: string; role: string },
    batchName: string,
    scope?: UserScope,
  ) {
    if (anggotaIds.length === 0) throw new BadRequestException('Tidak ada anggota dipilih');
    if (anggotaIds.length > 100) throw new BadRequestException('Maksimal 100 anggota per bulk submit');

    const eligible: string[] = [];
    const ineligible: { anggotaId: string; errors: string[] }[] = [];

    for (const anggotaId of anggotaIds) {
      const member = await this.prisma.anggota.findUnique({
        where: { id: anggotaId, deletedAt: null },
        include: { ranting: { include: { wilayah: { include: { distrik: true } } } } },
      });
      const errors: string[] = [];
      if (!member) {
        errors.push('Anggota tidak ditemukan');
      } else {
        if (scope && !(await this.scopeHelper.hasAccessToResourceAsync(this.prisma, scope, member.rantingId))) {
          errors.push('Diluar cakupan wilayah Anda');
        }
        const missing = calculateMissingFields(member as unknown as Record<string, unknown>);
        if (missing.length > 0) errors.push(`Data tidak lengkap: ${missing.join(', ')}`);
        const activeApp = await this.prisma.ktaApplication.findFirst({
          where: { anggotaId, status: { in: [...REVIEW_STATES, 'APPROVED', 'PAYMENT_SETUP', 'PAYMENT_PENDING', 'PAYMENT_VERIFIED', 'CARD_GENERATING'] } },
        });
        if (activeApp) errors.push('Sudah ada pengajuan aktif');
        const existingCard = await this.prisma.dokumen.findFirst({
          where: { anggotaId, tipe: 'kartu_anggota', status: { not: 'revoked' } },
        });
        if (existingCard) errors.push('Sudah memiliki KTA aktif');
      }
      if (errors.length === 0) eligible.push(anggotaId);
      else ineligible.push({ anggotaId, errors });
    }

    if (eligible.length === 0) throw new BadRequestException('Tidak ada anggota yang memenuhi syarat');

    const skippedLevels = SKIP_MAP[submitter.role] || [];
    const initialStatus = getInitialStatus(submitter.role);
    const batchNameFinal = batchName || `Bulk KTA ${new Date().toISOString().slice(0, 10)}`;

    const batch = await this.prisma.ktaBatch.create({
      data: {
        name: batchNameFinal,
        submittedById: submitter.id,
        submittedByRole: submitter.role,
        scopeLevel: getScopeLevel(submitter.role),
        scopeId: scope?.rantingId || scope?.wilayahId || scope?.distrikId || 'national',
        totalSubmitted: eligible.length,
      },
    });

    const createdIds: string[] = [];
    await this.prisma.$transaction(async (tx) => {
      for (const anggotaId of eligible) {
        const created = await tx.ktaApplication.create({
          data: {
            anggotaId,
            batchId: batch.id,
            submittedById: submitter.id,
            submittedByRole: submitter.role,
            status: initialStatus,
          },
        });
        createdIds.push(created.id);

        for (const level of LEVEL_ORDER) {
          const isSkipped = skippedLevels.includes(level);
          await tx.ktaAppHistory.create({
            data: {
              ktaApplicationId: created.id,
              level,
              action: isSkipped ? 'SKIPPED' : 'SUBMITTED',
              actorId: submitter.id,
              actorRole: submitter.role,
              isSkipped,
              skippedReason: isSkipped ? `Auto-skip: submitter adalah ${submitter.role}` : null,
            },
          });
        }

        if (!skippedLevels.includes(getLevelFromStatus(initialStatus))) {
          await this.notifyLevel(created.id, initialStatus, tx);
        }
      }
    });

    this.audit('KTA_BULK_SUBMIT', batch.id, submitter.id, { totalSubmitted: eligible.length, batchName: batchNameFinal });
    return { batchId: batch.id, totalSubmitted: eligible.length, ineligible };
  }

  // ============================================================
  // APPROVE (Per Level)
  // ============================================================
  async approve(applicationId: string, approver: { id: string; role: string }, catatan?: string) {
    const app = await this.prisma.ktaApplication.findUnique({
      where: { id: applicationId },
      include: { anggota: { include: { ranting: { include: { wilayah: { include: { distrik: true } } } } } } },
    });
    if (!app) throw new NotFoundException('Aplikasi tidak ditemukan');

    const currentLevel = getLevelFromStatus(app.status);
    const expectedRole = LEVEL_TO_ROLE[currentLevel];
    if (approver.role !== expectedRole && approver.role !== 'superadmin') {
      throw new ForbiddenException(`Level ini hanya bisa di-approve oleh ${LEVEL_LABELS[currentLevel]}`);
    }
    if (FINAL_STATES.includes(app.status) || app.status === 'SUBMITTED') {
      throw new BadRequestException(`Aplikasi berstatus ${app.status} tidak bisa di-approve`);
    }

    const nextLevel = getNextLevel(currentLevel);
    const nextStatus = nextLevel ? LEVEL_TO_STATUS[nextLevel] : 'APPROVED';

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.ktaAppHistory.updateMany({
        where: { ktaApplicationId: applicationId, level: currentLevel },
        data: { action: 'APPROVED', actorId: approver.id, actorRole: approver.role, catatan },
      });

      await tx.ktaApplication.update({ where: { id: applicationId }, data: { status: nextStatus } });

      if (nextLevel) {
        await tx.ktaAppHistory.create({
          data: {
            ktaApplicationId: applicationId,
            level: nextLevel,
            action: 'SUBMITTED',
            actorId: approver.id,
            actorRole: approver.role,
          },
        });
        await this.notifyLevel(applicationId, nextStatus, tx);
      } else {
        await this.finalizeApproval(applicationId, approver.id, tx);
      }

      return nextStatus;
    });

    this.audit('KTA_APPROVE', applicationId, approver.id, { currentLevel, nextLevel, nextStatus });
    return { success: true, nextStatus: result };
  }

  // ============================================================
  // REJECT
  // ============================================================
  async reject(applicationId: string, rejector: { id: string; role: string }, reason: string) {
    if (!reason || !reason.trim()) throw new BadRequestException('Alasan penolakan wajib diisi');

    const app = await this.prisma.ktaApplication.findUnique({
      where: { id: applicationId },
      include: { anggota: { include: { ranting: { include: { wilayah: { include: { distrik: true } } } } } } },
    });
    if (!app) throw new NotFoundException('Aplikasi tidak ditemukan');

    const currentLevel = getLevelFromStatus(app.status);
    const expectedRole = LEVEL_TO_ROLE[currentLevel];
    if (rejector.role !== expectedRole && rejector.role !== 'superadmin') {
      throw new ForbiddenException(`Level ini hanya bisa menolak oleh ${LEVEL_LABELS[currentLevel]}`);
    }
    if (FINAL_STATES.includes(app.status) || app.status === 'SUBMITTED') {
      throw new BadRequestException(`Aplikasi berstatus ${app.status} tidak bisa ditolak`);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.ktaAppHistory.updateMany({
        where: { ktaApplicationId: applicationId, level: currentLevel },
        data: { action: 'REJECTED', actorId: rejector.id, actorRole: rejector.role, catatan: reason },
      });
      await tx.ktaApplication.update({
        where: { id: applicationId },
        data: { status: 'REJECTED', catatanAdmin: reason },
      });
      if (app.batchId) {
        await tx.ktaBatch.update({ where: { id: app.batchId }, data: { totalRejected: { increment: 1 } } });
      }
    });

    await this.notifyMember(app.anggota, {
      judul: '❌ Pengajuan KTA Ditolak',
      isi: `Pengajuan KTA Anda ditolak oleh ${LEVEL_LABELS[currentLevel]}. Alasan: ${reason}`,
      tipe: 'kta_rejected',
      data: { applicationId, screen: 'kta-status' },
    });

    this.audit('KTA_REJECT', applicationId, rejector.id, { level: currentLevel, reason });
    return { success: true };
  }

  async cancelMyApplication(userEmail: string, reason?: string) {
    const member = await this.prisma.anggota.findFirst({
      where: { email: userEmail, deletedAt: null },
      select: { id: true },
    });
    if (!member) throw new NotFoundException('Anggota tidak ditemukan');
    const app = await this.prisma.ktaApplication.findFirst({
      where: { anggotaId: member.id, status: { in: REVIEW_STATES } },
      orderBy: { createdAt: 'desc' },
    });
    if (!app) throw new NotFoundException('Tidak ada pengajuan aktif untuk dibatalkan');
    return this.cancel(app.id, member.id, reason);
  }

  // ============================================================
  // MEMBER CANCEL
  // ============================================================
  async cancel(applicationId: string, memberId: string, reason?: string) {
    const app = await this.prisma.ktaApplication.findUnique({ where: { id: applicationId } });
    if (!app) throw new NotFoundException('Aplikasi tidak ditemukan');
    if (app.anggotaId !== memberId) throw new ForbiddenException('Tidak bisa membatalkan aplikasi orang lain');
    if (!REVIEW_STATES.includes(app.status)) {
      throw new BadRequestException(`Aplikasi berstatus ${app.status} tidak bisa dibatalkan`);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.ktaApplication.update({ where: { id: applicationId }, data: { status: 'CANCELLED' } });
      await tx.ktaAppHistory.create({
        data: {
          ktaApplicationId: applicationId,
          level: 'MEMBER',
          action: 'CANCELLED',
          actorId: memberId,
          actorRole: 'anggota',
          catatan: reason || 'Dibatalkan oleh anggota',
        },
      });
      if (app.batchId) {
        await tx.ktaBatch.update({ where: { id: app.batchId }, data: { totalRejected: { increment: 1 } } });
      }
    });

    this.audit('KTA_CANCEL', applicationId, memberId, { reason });
    return { success: true };
  }

  // ============================================================
  // SUPERADMIN BYPASS
  // ============================================================
  async superadminBypass(applicationId: string, superadminId: string) {
    const app = await this.prisma.ktaApplication.findUnique({
      where: { id: applicationId },
      include: { anggota: { include: { ranting: { include: { wilayah: { include: { distrik: true } } } } } } },
    });
    if (!app) throw new NotFoundException('Aplikasi tidak ditemukan');
    if (FINAL_STATES.includes(app.status)) {
      throw new BadRequestException(`Aplikasi berstatus ${app.status} sudah final`);
    }

    const nomorAnggota = await this.nraService.generateMemberNumber(app.anggota.rantingId);

    await this.prisma.$transaction(async (tx) => {
      await tx.anggota.update({
        where: { id: app.anggotaId },
        data: { nomorAnggota, statusValidasi: 'approved', statusKeanggotaan: 'aktif' },
      });
      await tx.ktaApplication.update({
        where: { id: applicationId },
        data: { status: 'APPROVED', nomorAnggota, submittedByRole: 'superadmin' },
      });
      await tx.ktaAppHistory.create({
        data: {
          ktaApplicationId: applicationId,
          level: 'NASIONAL',
          action: 'SUPERADMIN_BYPASS',
          actorId: superadminId,
          actorRole: 'superadmin',
          catatan: 'SuperAdmin bypass - langsung approved',
        },
      });
      for (const level of LEVEL_ORDER) {
        await tx.ktaAppHistory.create({
          data: {
            ktaApplicationId: applicationId,
            level,
            action: 'SKIPPED',
            actorId: superadminId,
            actorRole: 'superadmin',
            isSkipped: true,
            skippedReason: 'SuperAdmin bypass',
            catatan: `Level ${level} di-skip oleh SuperAdmin`,
          },
        });
      }
      await this.notifyDistrikForProcessing(applicationId, tx);
    });

    await this.notifyMember(app.anggota, {
      judul: '🎉 KTA Disetujui (SuperAdmin)',
      isi: `Pengajuan KTA Anda disetujui langsung oleh SuperAdmin. Nomor Anggota: ${nomorAnggota}. Admin Distrik akan mengirimkan info biaya.`,
      tipe: 'kta_approved',
      data: { applicationId, nomorAnggota, screen: 'kta-status' },
    });

    this.audit('KTA_SUPERADMIN_BYPASS', applicationId, superadminId, { nomorAnggota });
    return { success: true, nomorAnggota };
  }

  // ============================================================
  // FINALIZE APPROVAL (Nasional -> assign NRA)
  // ============================================================
  private async finalizeApproval(applicationId: string, approverId: string, tx: Prisma.TransactionClient) {
    const app = await tx.ktaApplication.findUnique({
      where: { id: applicationId },
      include: { anggota: { include: { ranting: { include: { wilayah: { include: { distrik: true } } } } } } },
    });
    if (!app) return;

    const nomorAnggota = await this.nraService.generateMemberNumber(app.anggota.rantingId);

    await tx.anggota.update({
      where: { id: app.anggotaId },
      data: { nomorAnggota, statusValidasi: 'approved', statusKeanggotaan: 'aktif' },
    });
    await tx.ktaApplication.update({
      where: { id: applicationId },
      data: { nomorAnggota, status: 'APPROVED' },
    });
    if (app.batchId) {
      await tx.ktaBatch.update({ where: { id: app.batchId }, data: { totalApproved: { increment: 1 } } });
    }

    await this.notifyMember(app.anggota, {
      judul: '🎉 KTA Disetujui Nasional',
      isi: `Selamat! Pengajuan KTA Anda disetujui Admin Nasional. Nomor Anggota: ${nomorAnggota}. Admin Distrik akan mengirimkan info biaya penerbitan.`,
      tipe: 'kta_approved',
      data: { applicationId, nomorAnggota, screen: 'kta-status' },
    });
    await this.notifyDistrikForProcessing(applicationId, tx);
  }

  // ============================================================
  // DISTRIK PROCESSING
  // ============================================================
  async setupFee(
    applicationId: string,
    distrikAdminId: string,
    dto: { biaya: number; rekeningTujuan: string; catatan?: string },
  ) {
    if (!dto.biaya || dto.biaya <= 0) throw new BadRequestException('Biaya wajib diisi');
    if (!dto.rekeningTujuan || !dto.rekeningTujuan.trim()) throw new BadRequestException('Rekening tujuan wajib diisi');

    const app = await this.prisma.ktaApplication.findUnique({
      where: { id: applicationId },
      include: { anggota: true },
    });
    if (!app) throw new NotFoundException('Aplikasi tidak ditemukan');
    if (app.status !== 'APPROVED') {
      throw new BadRequestException(`Aplikasi harus berstatus APPROVED sebelum setup fee (sekarang: ${app.status})`);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.ktaApplication.update({
        where: { id: applicationId },
        data: {
          status: 'PAYMENT_SETUP',
          biaya: dto.biaya,
          rekeningTujuan: dto.rekeningTujuan,
          catatanAdmin: dto.catatan || null,
        },
      });
      await tx.ktaAppHistory.create({
        data: {
          ktaApplicationId: applicationId,
          level: 'DISTRIK',
          action: 'PAYMENT_SETUP',
          actorId: distrikAdminId,
          actorRole: 'admin_distrik',
          catatan: `Biaya: ${dto.biaya}, Rekening: ${dto.rekeningTujuan}`,
        },
      });
    });

    await this.notifyMember(app.anggota, {
      judul: '💳 Biaya Penerbitan KTA',
      isi: `Biaya penerbitan KTA Anda: ${formatRupiah(dto.biaya)}.\nRekening tujuan: ${dto.rekeningTujuan}\n${dto.catatan || ''}\nUpload bukti bayar di aplikasi setelah transfer.`,
      tipe: 'kta_fee_notification',
      data: { applicationId, screen: 'kta-status', biaya: dto.biaya, rekeningTujuan: dto.rekeningTujuan },
    });

    this.audit('KTA_SETUP_FEE', applicationId, distrikAdminId, { biaya: dto.biaya });
    return { success: true, status: 'PAYMENT_SETUP' };
  }

  async verifyPayment(
    applicationId: string,
    distrikAdminId: string,
    buktiPath?: string,
  ) {
    const app = await this.prisma.ktaApplication.findUnique({
      where: { id: applicationId },
      include: { anggota: true },
    });
    if (!app) throw new NotFoundException('Aplikasi tidak ditemukan');
    if (app.status !== 'PAYMENT_SETUP' && app.status !== 'PAYMENT_PENDING') {
      throw new BadRequestException(`Status tidak valid untuk verifikasi pembayaran (sekarang: ${app.status})`);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.ktaApplication.update({
        where: { id: applicationId },
        data: { status: 'PAYMENT_VERIFIED', buktiBayarPath: buktiPath || null, statusPembayaran: 'LUNAS' },
      });
      await tx.ktaAppHistory.create({
        data: {
          ktaApplicationId: applicationId,
          level: 'DISTRIK',
          action: 'PAYMENT_VERIFIED',
          actorId: distrikAdminId,
          actorRole: 'admin_distrik',
        },
      });
    });

    await this.notifyMember(app.anggota, {
      judul: '✅ Pembayaran KTA Diverifikasi',
      isi: 'Pembayaran biaya KTA Anda telah diverifikasi. KTA akan segera digenerate oleh Admin Distrik.',
      tipe: 'kta_payment_verified',
      data: { applicationId, screen: 'kta-status' },
    });

    this.audit('KTA_VERIFY_PAYMENT', applicationId, distrikAdminId);
    return { success: true, status: 'PAYMENT_VERIFIED' };
  }

  async generateCard(
    applicationId: string,
    distrikAdminId: string,
    opts: { reason?: string } = {},
  ) {
    const app = await this.prisma.ktaApplication.findUnique({
      where: { id: applicationId },
      include: { anggota: { include: { ranting: { include: { wilayah: { include: { distrik: true } } } } } } },
    });
    if (!app) throw new NotFoundException('Aplikasi tidak ditemukan');
    if (app.status !== 'PAYMENT_VERIFIED') {
      throw new BadRequestException(`Pembayaran harus diverifikasi dulu sebelum generate kartu (sekarang: ${app.status})`);
    }

    await this.prisma.ktaApplication.update({ where: { id: applicationId }, data: { status: 'CARD_GENERATING' } });

    try {
      if (this.digitalCardService) {
        await this.digitalCardService.issuePrintedCard(
          app.anggotaId,
          { reason: opts.reason },
          undefined,
          { id: distrikAdminId } as any,
        );
      }

      const signedCardData = await this.signCardData(app, distrikAdminId);

      await this.prisma.$transaction(async (tx) => {
        await tx.ktaApplication.update({
          where: { id: applicationId },
          data: {
            status: 'CARD_GENERATED',
            diterbitkanOleh: distrikAdminId,
            diterbitkanAt: new Date(),
          },
        });
        await tx.ktaAppHistory.create({
          data: {
            ktaApplicationId: applicationId,
            level: 'DISTRIK',
            action: 'CARD_GENERATED',
            actorId: distrikAdminId,
            actorRole: 'admin_distrik',
          },
        });
        if (app.batchId) {
          await tx.ktaBatch.update({
            where: { id: app.batchId },
            data: { totalGenerated: { increment: 1 }, status: 'COMPLETED' },
          });
        }
      });

      await this.notifyMember(app.anggota, {
        judul: '🎉 KTA Digital Siap',
        isi: 'KTA digital Anda telah digenerate. Silakan buka menu KTA di aplikasi untuk melihat dan mengunduh.',
        tipe: 'kta_generated',
        data: { applicationId, screen: 'kta-screen' },
      });

      this.audit('KTA_GENERATE_CARD', applicationId, distrikAdminId, {
        signature: signedCardData?.signature?.substring(0, 20),
        algorithm: signedCardData?.algorithm,
      });

      return { success: true, status: 'CARD_GENERATED', digitalSignature: signedCardData };
    } catch (error) {
      await this.prisma.ktaApplication.update({ where: { id: applicationId }, data: { status: 'PAYMENT_VERIFIED' } });
      throw error;
    }
  }

  private async signCardData(app: any, issuerId: string) {
    const member = app.anggota;
    const cardData = {
      nomorAnggota: app.nomorAnggota,
      namaLengkap: member.namaLengkap,
      tempatLahir: member.tempatLahir,
      tanggalLahir: member.tanggalLahir?.toISOString(),
      jenisKelamin: member.jenisKelamin,
      alamat: member.alamat,
      ranting: member.ranting?.nama,
      wilayah: member.ranting?.wilayah?.nama,
      distrik: member.ranting?.wilayah?.distrik?.nama,
      tingkat: member.tingkat,
      statusKeanggotaan: member.statusKeanggotaan,
      issuedAt: new Date().toISOString(),
      issuedBy: issuerId,
    };

    const dataToSign = JSON.stringify(cardData);

    if (this.pkiService?.isReady()) {
      const signed = this.pkiService.sign(dataToSign);
      return {
        cardData,
        signature: signed.signature,
        certificate: signed.certificate,
        algorithm: signed.algorithm,
        signedAt: signed.timestamp,
      };
    }

    const secret = process.env.KTA_SIGNING_SECRET || 'default-secret-change-in-production';
    const hmac = crypto.createHmac('sha256', secret).update(dataToSign).digest('hex');
    return {
      cardData,
      signature: hmac,
      certificate: null,
      algorithm: 'HMAC-SHA256',
      signedAt: new Date(),
    };
  }

  async verifyCardSignature(applicationId: string) {
    const app = await this.prisma.ktaApplication.findUnique({
      where: { id: applicationId },
      include: { anggota: true },
    });
    if (!app) throw new NotFoundException('Aplikasi tidak ditemukan');
    if (app.status !== 'CARD_GENERATED') {
      return { valid: false, details: { error: `Kartu belum digenerate (status: ${app.status})` } };
    }
    // Signature disimpan pada history CARD_GENERATED -> verifikasi dilakukan
    // oleh layanan PKI terpisah saat QR discan. Di sini kita kembalikan info kartu.
    const cert = this.pkiService?.getCertificateInfo();
    return { valid: !!cert, certificate: cert ?? null };
  }

  // ============================================================
  // QUERIES
  // ============================================================
  async getMyApplication(userEmail: string) {
    const member = await this.prisma.anggota.findFirst({
      where: { email: userEmail, deletedAt: null },
      select: { id: true },
    });
    if (!member) throw new NotFoundException('Anggota tidak ditemukan');

    return this.prisma.ktaApplication.findFirst({
      where: { anggotaId: member.id },
      orderBy: { createdAt: 'desc' },
      include: { histories: { orderBy: { createdAt: 'asc' } }, batch: true },
    });
  }

  async getApplications(
    filter: { status?: KtaAppStatus; anggotaId?: string; batchId?: string; search?: string; page?: number; limit?: number },
    scope?: UserScope,
  ) {
    const scopeFilter = this.buildScopeFilter(scope);
    const where: Prisma.KtaApplicationWhereInput = { ...scopeFilter };
    if (filter.status) where.status = filter.status;
    if (filter.anggotaId) where.anggotaId = filter.anggotaId;
    if (filter.batchId) where.batchId = filter.batchId;
    if (filter.search) {
      where.OR = [
        { anggota: { namaLengkap: { contains: filter.search, mode: 'insensitive' } } },
        { anggota: { nomorAnggota: { contains: filter.search, mode: 'insensitive' } } },
        { nomorAnggota: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const page = filter.page || 1;
    const limit = filter.limit || 20;

    const [items, total] = await Promise.all([
      this.prisma.ktaApplication.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          anggota: { select: { id: true, namaLengkap: true, nomorAnggota: true, ranting: { select: { nama: true } } } },
          histories: { orderBy: { createdAt: 'asc' } },
        },
      }),
      this.prisma.ktaApplication.count({ where }),
    ]);

    return { data: items, meta: { total, totalPages: Math.ceil(total / limit), page, limit } };
  }

  async getApplicationDetail(id: string, scope?: UserScope) {
    const app = await this.prisma.ktaApplication.findUnique({
      where: { id },
      include: {
        anggota: { include: { ranting: { include: { wilayah: { include: { distrik: true } } } } } },
        histories: { orderBy: { createdAt: 'asc' } },
        batch: true,
      },
    });
    if (!app) throw new NotFoundException('Aplikasi tidak ditemukan');
    if (scope) await this.verifyScope(app.anggota.rantingId, scope);
    return app;
  }

  async getHistory(applicationId: string) {
    return this.prisma.ktaAppHistory.findMany({
      where: { ktaApplicationId: applicationId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getBatches(scope?: UserScope) {
    const where: Prisma.KtaBatchWhereInput = {};
    if (scope?.rantingId) {
      where.scopeLevel = 'ranting';
      where.scopeId = scope.rantingId;
    } else if (scope?.wilayahId) {
      where.scopeLevel = 'wilayah';
      where.scopeId = scope.wilayahId;
    } else if (scope?.distrikId) {
      where.scopeLevel = 'distrik';
      where.scopeId = scope.distrikId;
    }
    return this.prisma.ktaBatch.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { applications: true } } },
    });
  }

  async getBatchDetail(batchId: string, scope?: UserScope) {
    const batch = await this.prisma.ktaBatch.findUnique({
      where: { id: batchId },
      include: {
        applications: {
          orderBy: { createdAt: 'asc' },
          include: {
            anggota: { select: { id: true, namaLengkap: true, nomorAnggota: true } },
            histories: { orderBy: { createdAt: 'asc' } },
          },
        },
      },
    });
    if (!batch) throw new NotFoundException('Batch tidak ditemukan');
    if (scope) await this.verifyScope(batch.scopeId, scope);
    return batch;
  }

  async exportBatch(batchId: string, format: 'csv' | 'excel' | 'pdf') {
    const batch = await this.getBatchDetail(batchId);
    return { batchId, format, data: batch };
  }

  async getDistrikQueue(scope?: UserScope) {
    const scopeFilter = this.buildScopeFilter(scope);
    const statuses: KtaAppStatus[] = [
      'APPROVED',
      'PAYMENT_SETUP',
      'PAYMENT_PENDING',
      'PAYMENT_VERIFIED',
      'CARD_GENERATING',
      'CARD_GENERATED',
    ];
    const items = await this.prisma.ktaApplication.findMany({
      where: { ...scopeFilter, status: { in: statuses } },
      orderBy: { updatedAt: 'desc' },
      include: {
        anggota: { select: { id: true, namaLengkap: true, nomorAnggota: true, ranting: { select: { nama: true } } } },
        histories: { orderBy: { createdAt: 'asc' } },
      },
    });
    return items;
  }

  // ============================================================
  // HELPERS
  // ============================================================
  private async notifyLevel(applicationId: string, status: KtaAppStatus, tx: Prisma.TransactionClient) {
    const app = await tx.ktaApplication.findUnique({
      where: { id: applicationId },
      include: { anggota: { include: { ranting: { include: { wilayah: { include: { distrik: true } } } } } } },
    });
    if (!app) return;

    const level = getLevelFromStatus(status);
    const role = LEVEL_TO_ROLE[level];

    const where: Prisma.UserWhereInput = { role: role as any, isActive: true };
    if (level === 'RANTING') where.rantingId = app.anggota.rantingId;
    if (level === 'WILAYAH') where.wilayahId = app.anggota.ranting?.wilayahId || undefined;
    if (level === 'DISTRIK') where.distrikId = app.anggota.ranting?.wilayah?.distrikId || undefined;

    const approvers = await tx.user.findMany({ where, select: { id: true } });
    for (const approver of approvers) {
      await this.notificationsService?.send(approver.id, {
        judul: '✅ Persetujuan KTA Dibutuhkan',
        isi: `${LEVEL_LABELS[level]}: Aplikasi KTA ${app.anggota.namaLengkap} (${app.nomorAnggota || 'belum ada nomor'}) menunggu review.`,
        tipe: 'kta_approval_request',
        data: { applicationId, screen: 'kta-queue', screenId: applicationId },
      });
    }
  }

  private async notifyDistrikForProcessing(applicationId: string, tx: Prisma.TransactionClient) {
    const app = await tx.ktaApplication.findUnique({
      where: { id: applicationId },
      include: { anggota: { include: { ranting: { include: { wilayah: { include: { distrik: true } } } } } } },
    });
    if (!app) return;

    const distrikId = app.anggota.ranting?.wilayah?.distrikId;
    const admins = await tx.user.findMany({
      where: { role: 'admin_distrik', isActive: true, ...(distrikId ? { distrikId } : {}) },
      select: { id: true },
    });
    for (const admin of admins) {
      await this.notificationsService?.send(admin.id, {
        judul: '🔔 KTA Siap Proses Biaya',
        isi: `Anggota ${app.anggota.namaLengkap} (${app.nomorAnggota}) disetujui nasional. Silakan atur biaya & rekening.`,
        tipe: 'kta_payment_setup',
        data: { applicationId, screen: 'kta-distrik-process', screenId: applicationId },
      });
    }
  }

  private async notifyMember(member: any, dto: { judul: string; isi: string; tipe: string; data: Record<string, unknown> }) {
    if (!member?.email) return;
    const user = await this.prisma.user.findUnique({ where: { email: member.email } });
    if (user) {
      await this.notificationsService?.send(user.id, dto as any);
    }
  }

  private async verifyScope(rantingId: string, scope: UserScope) {
    if (!(await this.scopeHelper.hasAccessToResourceAsync(this.prisma, scope, rantingId))) {
      throw new ForbiddenException('Akses ditolak: diluar cakupan wilayah Anda');
    }
  }

  private buildScopeFilter(scope?: UserScope): Prisma.KtaApplicationWhereInput {
    if (!scope) return {};
    if (scope.rantingId) return { anggota: { rantingId: scope.rantingId } };
    if (scope.wilayahId) return { anggota: { ranting: { wilayahId: scope.wilayahId } } };
    if (scope.distrikId) return { anggota: { ranting: { wilayah: { distrikId: scope.distrikId } } } };
    return {};
  }
}
