import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PersistentAuditService } from '../../common/services/persistent-audit.service';
import { KtaAppStatus, KtaAppLevel, Prisma } from '@prisma/client';

const SLA_HOURS: Record<KtaAppStatus, number> = {
  SUBMITTED: 0,
  RANTING_REVIEW: Number(process.env.KTA_SLA_RANTING_HOURS) || 48,
  WILAYAH_REVIEW: Number(process.env.KTA_SLA_WILAYAH_HOURS) || 48,
  DISTRIK_REVIEW: Number(process.env.KTA_SLA_DISTRIK_HOURS) || 72,
  NASIONAL_REVIEW: Number(process.env.KTA_SLA_NASIONAL_HOURS) || 24,
  APPROVED: 0,
  PAYMENT_SETUP: Number(process.env.KTA_SLA_PAYMENT_SETUP_HOURS) || 72,
  PAYMENT_PENDING: Number(process.env.KTA_SLA_PAYMENT_PENDING_HOURS) || 168,
  PAYMENT_VERIFIED: 0,
  CARD_GENERATING: 0,
  CARD_GENERATED: 0,
  REJECTED: 0,
  CANCELLED: 0,
};

/** Level yang dituju saat escalation (untuk notifikasi saja — decision 3A). */
const ESCALATION_TARGET: Partial<Record<KtaAppStatus, KtaAppLevel>> = {
  RANTING_REVIEW: 'WILAYAH',
  WILAYAH_REVIEW: 'DISTRIK',
  DISTRIK_REVIEW: 'NASIONAL',
  NASIONAL_REVIEW: 'NASIONAL',
  PAYMENT_SETUP: 'DISTRIK',
  PAYMENT_PENDING: 'DISTRIK',
};

const LEVEL_TO_ROLE: Record<KtaAppLevel, string> = {
  RANTING: 'admin_ranting',
  WILAYAH: 'admin_wilayah',
  DISTRIK: 'admin_distrik',
  NASIONAL: 'admin_nasional',
  MEMBER: 'member',
};

const LEVEL_LABELS: Record<KtaAppLevel, string> = {
  RANTING: 'Admin Ranting',
  WILAYAH: 'Admin Wilayah',
  DISTRIK: 'Admin Distrik',
  NASIONAL: 'Admin Nasional',
  MEMBER: 'Anggota',
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

@Injectable()
export class KtaEscalationService {
  private readonly logger = new Logger(KtaEscalationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService?: NotificationsService,
    private readonly persistentAudit?: PersistentAuditService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async checkEscalation() {
    if (process.env.KTA_AUTO_ESCALATION_ENABLED === 'false') {
      this.logger.log('Auto-escalation disabled via env');
      return;
    }

    this.logger.log('KTA auto-escalation check dimulai...');

    for (const [status, hours] of Object.entries(SLA_HOURS) as [KtaAppStatus, number][]) {
      if (hours === 0) continue;

      const stuck = await this.prisma.ktaApplication.findMany({
        where: {
          status,
          updatedAt: { lt: new Date(Date.now() - hours * 60 * 60 * 1000) },
        },
        include: {
          anggota: {
            include: {
              ranting: { include: { wilayah: { include: { distrik: true } } } },
            },
          },
        },
      });

      this.logger.log(`Status ${status}: ${stuck.length} aplikasi melewati SLA (>${hours} jam)`);

      for (const app of stuck) {
        await this.escalate(app);
      }
    }

    this.logger.log('KTA auto-escalation check selesai');
  }

  private async escalate(app: any) {
    const currentLevel = STATUS_TO_LEVEL[app.status as KtaAppStatus];
    const upperLevel = ESCALATION_TARGET[app.status as KtaAppStatus];

    if (!upperLevel) {
      this.logger.warn(`Tidak ada target escalation untuk status ${app.status}`);
      return;
    }

    await this.notifyRole(LEVEL_TO_ROLE[currentLevel], {
      judul: '⚠️ ESCALATION: KTA Melewati SLA',
      isi: `Aplikasi KTA ${app.anggota?.namaLengkap} (${app.nomorAnggota || 'belum ada nomor'}) melewati SLA ${SLA_HOURS[app.status as KtaAppStatus]} jam di level ${LEVEL_LABELS[currentLevel]}. Mohon segera diproses.`,
      tipe: 'kta_escalation',
      data: { applicationId: app.id, screen: 'kta-queue', screenId: app.id, escalated: true },
    });

    await this.notifyRole(LEVEL_TO_ROLE[upperLevel], {
      judul: '🔔 ESCALATION: Perlu Perhatian Atasan',
      isi: `Aplikasi KTA ${app.anggota?.namaLengkap} (${app.nomorAnggota || 'belum ada nomor'}) di level ${LEVEL_LABELS[currentLevel]} sudah melewati SLA dan di-escalate ke ${LEVEL_LABELS[upperLevel]}.`,
      tipe: 'kta_escalation_upper',
      data: { applicationId: app.id, screen: 'kta-queue', screenId: app.id, escalated: true, upperLevel },
    });

    await this.persistentAudit?.log({
      action: 'KTA_ESCALATION',
      entity: 'KtaApplication',
      entityId: app.id,
      userId: null,
      ipAddress: null,
      userAgent: null,
      details: {
        fromLevel: currentLevel,
        toLevel: upperLevel,
        hoursStuck: SLA_HOURS[app.status as KtaAppStatus],
        anggotaId: app.anggotaId,
        anggotaNama: app.anggota?.namaLengkap,
      },
    });

    this.logger.log(`Escalated ${app.id} dari ${currentLevel} ke ${upperLevel} (>${SLA_HOURS[app.status as KtaAppStatus]}h)`);
  }

  async manualEscalate(applicationId: string, adminId: string) {
    const app = await this.prisma.ktaApplication.findUnique({
      where: { id: applicationId },
      include: {
        anggota: {
          include: {
            ranting: { include: { wilayah: { include: { distrik: true } } } },
          },
        },
      },
    });

    if (!app) throw new NotFoundException('Aplikasi tidak ditemukan');

    await this.escalate(app);

    await this.persistentAudit?.log({
      action: 'KTA_MANUAL_ESCALATION',
      entity: 'KtaApplication',
      entityId: applicationId,
      userId: adminId,
      ipAddress: null,
      userAgent: null,
      details: { escalatedBy: adminId },
    });

    return { success: true, message: 'Escalasi manual terpicu' };
  }

  async getSlaStatus(scope?: any) {
    const scopeFilter = this.buildScopeFilter(scope);
    const results: Record<string, { count: number; avgHoursStuck: number; oldestHours: number }> = {};
    const now = Date.now();

    for (const [status, hours] of Object.entries(SLA_HOURS) as [KtaAppStatus, number][]) {
      if (hours === 0) continue;

      const apps = await this.prisma.ktaApplication.findMany({
        where: { ...scopeFilter, status },
        select: { updatedAt: true },
      });

      const hoursStuck = apps.map((a) => (now - new Date(a.updatedAt).getTime()) / (1000 * 60 * 60));
      results[status] = {
        count: apps.length,
        avgHoursStuck: hoursStuck.length ? Math.round((hoursStuck.reduce((a, b) => a + b, 0) / hoursStuck.length) * 10) / 10 : 0,
        oldestHours: hoursStuck.length ? Math.round(Math.max(...hoursStuck) * 10) / 10 : 0,
      };
    }

    return results;
  }

  private async notifyRole(role: string, dto: { judul: string; isi: string; tipe: string; data: Record<string, unknown> }) {
    const approvers = await this.prisma.user.findMany({
      where: { role: role as any, isActive: true },
      select: { id: true },
    });
    for (const approver of approvers) {
      await this.notificationsService?.send(approver.id, dto as any);
    }
  }

  private buildScopeFilter(scope?: any): Prisma.KtaApplicationWhereInput {
    if (!scope) return {};
    if (scope.rantingId) return { anggota: { rantingId: scope.rantingId } };
    if (scope.wilayahId) return { anggota: { ranting: { wilayahId: scope.wilayahId } } };
    if (scope.distrikId) return { anggota: { ranting: { wilayah: { distrikId: scope.distrikId } } } };
    return {};
  }
}
