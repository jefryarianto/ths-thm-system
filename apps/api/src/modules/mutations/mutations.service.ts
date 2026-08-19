import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger, Optional } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserScope } from '../../common/interfaces/user-scope.interface';
import { ScopeHelper } from '../../common/utils/scope-helpers';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateMutationDto } from './dto/mutation.dto';

type StepKey = 'ranting' | 'wilayah' | 'distrik';
type SideKey = 'asal' | 'tujuan';
type StepShape = { side: SideKey; level: StepKey; order: number };

interface OrgContext {
  fromRantingId: string;
  fromWilayahId: string;
  fromDistrikId: string;
  toRantingId: string;
  toWilayahId: string;
  toDistrikId: string;
}

const STEP_ROLE: Record<StepKey, string> = {
  ranting: 'admin_ranting',
  wilayah: 'admin_wilayah',
  distrik: 'admin_distrik',
};

@Injectable()
export class MutationsService {
  private readonly logger = new Logger(MutationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeHelper: ScopeHelper,
    @Optional() private readonly notificationsService?: NotificationsService,
  ) {}

  // ── Create request ──────────────────────────────────────

  async create(dto: CreateMutationDto, userId: string, role: string, scope?: UserScope) {
    const member = await this.prisma.anggota.findUnique({
      where: { id: dto.anggotaId, deletedAt: null },
      include: { ranting: { include: { wilayah: { include: { distrik: true } } } } },
    });
    if (!member) throw new NotFoundException('Anggota tidak ditemukan');
    if (member.statusKeanggotaan !== 'aktif') {
      throw new BadRequestException('Mutasi hanya dapat diajukan untuk anggota dengan status aktif');
    }

    const toRanting = await this.prisma.ranting.findUnique({
      where: { id: dto.toRantingId },
      include: { wilayah: { include: { distrik: true } } },
    });
    if (!toRanting) throw new NotFoundException('Ranting tujuan tidak ditemukan');
    if (toRanting.id === member.rantingId) {
      throw new BadRequestException('Ranting tujuan harus berbeda dari ranting asal');
    }

    if (scope && !(await this.scopeHelper.hasAccessToResourceAsync(this.prisma, scope, member.rantingId))) {
      throw new ForbiddenException('Akses ditolak: diluar cakupan wilayah Anda');
    }

    const fromRanting = await this.prisma.ranting.findUnique({
      where: { id: member.rantingId },
      include: { wilayah: { include: { distrik: true } } },
    });
    if (!fromRanting?.wilayah?.distrik) {
      throw new BadRequestException('Struktur organisasi ranting asal tidak lengkap');
    }

    const scopeType = fromRanting.wilayah.distrik.id === toRanting.wilayah.distrik.id ? 'distrik' : 'nasional';

    const org: OrgContext = {
      fromRantingId: member.rantingId,
      fromWilayahId: fromRanting.wilayah.id,
      fromDistrikId: fromRanting.wilayah.distrik.id,
      toRantingId: toRanting.id,
      toWilayahId: toRanting.wilayah.id,
      toDistrikId: toRanting.wilayah.distrik.id,
    };

    const chain = this.buildChain(scopeType);

    // Ranting asal (hanya ada di lingkup nasional) di-auto-approve bila
    // pengaju adalah admin ranting asal — pengaju tidak perlu menyetujui
    // pengajuannya sendiri.
    const requesterIsOriginRantingAdmin =
      role === 'admin_ranting' && scope?.rantingId === org.fromRantingId;

    const created = await this.prisma.$transaction(async (tx) => {
      const request = await tx.transferRequest.create({
        data: {
          anggotaId: member.id,
          fromRantingId: org.fromRantingId,
          toRantingId: org.toRantingId,
          reason: dto.reason || null,
          scope: scopeType,
          requestedBy: userId,
          status: 'pending',
        },
      });

      await tx.transferApproval.createMany({
        data: chain.map((step) => ({
          transferRequestId: request.id,
          side: step.side,
          level: step.level,
          order: step.order,
          status: 'pending',
          ...(step.level === 'ranting' && step.side === 'asal' && requesterIsOriginRantingAdmin
            ? { status: 'approved', decidedBy: userId, decidedAt: new Date() }
            : {}),
        })),
      });

      return request;
    });

    const detail = await this.findOne(created.id, scope, userId, role);

    // Notify approver pertama yang masih pending
    const firstPending = chain.find(
      (s) => !(requesterIsOriginRantingAdmin && s.level === 'ranting' && s.side === 'asal'),
    );
    if (firstPending) {
      await this.notifyApprovers(org, firstPending.side, firstPending.level);
    }

    return detail;
  }

  private buildChain(scopeType: 'distrik' | 'nasional'): StepShape[] {
    if (scopeType === 'distrik') {
      return [
        { side: 'asal', level: 'wilayah', order: 1 },
        { side: 'asal', level: 'distrik', order: 2 },
      ];
    }
    return [
      { side: 'asal', level: 'ranting', order: 1 },
      { side: 'asal', level: 'wilayah', order: 2 },
      { side: 'asal', level: 'distrik', order: 3 },
      { side: 'tujuan', level: 'ranting', order: 4 },
      { side: 'tujuan', level: 'wilayah', order: 5 },
      { side: 'tujuan', level: 'distrik', order: 6 },
    ];
  }

  // ── Read ────────────────────────────────────────────────

  private transferInclude() {
    return {
      anggota: { select: { id: true, email: true, namaLengkap: true, nomorAnggota: true, rantingId: true } },
      fromRanting: { include: { wilayah: { include: { distrik: true } } } },
      toRanting: { include: { wilayah: { include: { distrik: true } } } },
      approvals: { orderBy: { order: 'asc' as const } },
    };
  }

  private async withAccess(request: any, scope: UserScope | undefined, userId: string, role: string) {
    const org = this.toOrgContext(request);
    const currentStep = this.currentPendingStep(request.approvals);
    return {
      ...request,
      org,
      currentStep,
      canApprove:
        request.status === 'pending' ? await this.canApproveStep(scope, role, currentStep, org) : false,
    };
  }

  async findOne(id: string, scope?: UserScope, userId?: string, role?: string) {
    const request = await this.prisma.transferRequest.findUnique({
      where: { id },
      include: this.transferInclude(),
    });
    if (!request) throw new NotFoundException('Permintaan mutasi tidak ditemukan');

    if (scope && !(await this.scopeHelper.hasAccessToResourceAsync(this.prisma, scope, request.fromRantingId))) {
      throw new ForbiddenException('Akses ditolak: diluar cakupan wilayah Anda');
    }

    return this.withAccess(request, scope, userId || '', role || '');
  }

  async findAll(status: string | undefined, scope?: UserScope, userId?: string, role?: string) {
    const requests = await this.prisma.transferRequest.findMany({
      where: status ? { status } : {},
      orderBy: { createdAt: 'desc' },
      include: this.transferInclude(),
    });

    const results = [];
    for (const request of requests) {
      const org = this.toOrgContext(request);
      const currentStep = this.currentPendingStep(request.approvals);
      const canSee =
        request.requestedBy === userId ||
        !scope ||
        (await this.scopeHelper.hasAccessToResourceAsync(this.prisma, scope, request.fromRantingId)) ||
        (await this.scopeHelper.hasAccessToResourceAsync(this.prisma, scope, request.toRantingId));
      if (!canSee) continue;

      results.push({
        ...request,
        org,
        currentStep,
        canApprove:
          request.status === 'pending'
            ? await this.canApproveStep(scope, role || '', currentStep, org)
            : false,
      });
    }
    return results;
  }

  async listForMember(anggotaId: string, scope?: UserScope) {
    const member = await this.prisma.anggota.findUnique({
      where: { id: anggotaId },
      select: { id: true, rantingId: true },
    });
    if (!member) throw new NotFoundException('Anggota tidak ditemukan');
    if (scope && !(await this.scopeHelper.hasAccessToResourceAsync(this.prisma, scope, member.rantingId))) {
      throw new ForbiddenException('Akses ditolak: diluar cakupan wilayah Anda');
    }
    return this.prisma.transferRequest.findMany({
      where: { anggotaId },
      orderBy: { createdAt: 'desc' },
      include: this.transferInclude(),
    });
  }

  // ── Approve / Reject ────────────────────────────────────

  async approve(id: string, userId: string, note: string | undefined, role: string, scope?: UserScope) {
    const request = await this.prisma.transferRequest.findUnique({
      where: { id },
      include: this.transferInclude(),
    });
    if (!request) throw new NotFoundException('Permintaan mutasi tidak ditemukan');
    if (request.status !== 'pending') throw new BadRequestException('Permintaan mutasi sudah diproses');

    const org = this.toOrgContext(request);
    const currentStep = this.currentPendingStep(request.approvals);
    if (!currentStep) throw new BadRequestException('Semua persetujuan sudah selesai');

    if (!(await this.canApproveStep(scope, role, currentStep, org))) {
      throw new ForbiddenException('Anda tidak berwenang menyetujui tahap ini');
    }

    const remaining = await this.prisma.$transaction(async (tx) => {
      await tx.transferApproval.update({
        where: { transferRequestId_side_level: { transferRequestId: id, side: currentStep.side, level: currentStep.level } },
        data: { status: 'approved', decidedBy: userId, decidedAt: new Date(), note: note ?? null },
      });

      const remainingCount = await tx.transferApproval.count({ where: { transferRequestId: id, status: 'pending' } });

      if (remainingCount === 0) {
        // Finalisasi: pindahkan anggota + akun user terkait
        await tx.anggota.update({
          where: { id: request.anggotaId },
          data: { rantingId: org.toRantingId },
        });

        const linkedUser = await tx.user.findFirst({
          where: { email: request.anggota.email ?? '___none___', rantingId: org.fromRantingId },
        });
        if (linkedUser) {
          await tx.user.update({
            where: { id: linkedUser.id },
            data: { rantingId: org.toRantingId },
          });
        }

        await tx.transferRequest.update({
          where: { id },
          data: { status: 'approved', approvedBy: userId, approvedAt: new Date() },
        });
      }

      return remainingCount;
    });

    // Notify member bila selesai, atau approver langkah berikutnya
    if (remaining === 0 && this.notificationsService) {
      const memberUser = await this.findMemberUser(request.anggota.email);
      if (memberUser) {
        await this.notificationsService.send(memberUser.id, {
          judul: 'Mutasi Disetujui',
          isi: `Permintaan mutasi anggota ${request.anggota.namaLengkap} telah disetujui sepenuhnya.`,
          tipe: 'status_klaim',
          data: { transferRequestId: id },
        });
      }
    } else if (remaining > 0) {
      const nextStep = request.approvals.find((a) => a.status === 'pending');
      if (nextStep) {
        await this.notifyApprovers(org, nextStep.side as SideKey, nextStep.level as StepKey);
      }
    }

    return this.findOne(id, scope, userId, role);
  }

  async reject(id: string, userId: string, note: string | undefined, role: string, scope?: UserScope) {
    const request = await this.prisma.transferRequest.findUnique({
      where: { id },
      include: this.transferInclude(),
    });
    if (!request) throw new NotFoundException('Permintaan mutasi tidak ditemukan');
    if (request.status !== 'pending') throw new BadRequestException('Permintaan mutasi sudah diproses');

    const org = this.toOrgContext(request);
    const currentStep = this.currentPendingStep(request.approvals);
    if (!currentStep) throw new BadRequestException('Semua persetujuan sudah selesai');

    const isRequester = request.requestedBy === userId;
    const authorized = await this.canApproveStep(scope, role, currentStep, org);

    if (!isRequester && !authorized) {
      throw new ForbiddenException('Anda tidak berwenang menolak permintaan ini');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.transferRequest.update({
        where: { id },
        data: { status: 'rejected', rejectedBy: userId, rejectedAt: new Date(), note: note ?? null },
      });
      await tx.transferApproval.updateMany({
        where: { transferRequestId: id, status: 'pending' },
        data: { status: 'rejected', decidedBy: userId, decidedAt: new Date() },
      });
    });

    if (this.notificationsService) {
      const memberUser = await this.findMemberUser(request.anggota.email);
      if (memberUser) {
        await this.notificationsService.send(memberUser.id, {
          judul: 'Mutasi Ditolak',
          isi: `Permintaan mutasi Anda ditolak${note ? `: ${note}` : '.'}`,
          tipe: 'status_klaim',
          data: { transferRequestId: id },
        });
      }
    }

    return this.findOne(id, scope, userId, role);
  }

  // ── Helpers ─────────────────────────────────────────────

  private async findMemberUser(email: string | null | undefined) {
    if (!email) return null;
    return this.prisma.user.findUnique({ where: { email } });
  }

  private toOrgContext(request: any): OrgContext {
    return {
      fromRantingId: request.fromRantingId,
      fromWilayahId: request.fromRanting?.wilayah?.id,
      fromDistrikId: request.fromRanting?.wilayah?.distrik?.id,
      toRantingId: request.toRantingId,
      toWilayahId: request.toRanting?.wilayah?.id,
      toDistrikId: request.toRanting?.wilayah?.distrik?.id,
    };
  }

  private currentPendingStep(approvals: { side: string; level: string; status: string; order: number }[]) {
    const step = approvals.find((a) => a.status === 'pending');
    if (!step) return null;
    return { side: step.side as SideKey, level: step.level as StepKey, status: step.status, order: step.order };
  }

  /**
   * Apakah user (role + scope) berwenang menyetujui step tertentu?
   * - Superadmin (scope kosong) → semua.
   * - Step 'ranting' → admin_ranting dengan rantingId sesuai.
   * - Step 'wilayah' → admin_wilayah yang rantingnya berada di wilayah itu.
   * - Step 'distrik' → admin_distrik yang rantingnya berada di distrik itu.
   */
  private async canApproveStep(
    scope: UserScope | undefined,
    role: string | undefined,
    step: { side: SideKey; level: StepKey } | null,
    org: OrgContext,
  ): Promise<boolean> {
    if (!step || !role) return false;

    // Superadmin (scope kosong)
    if (scope && !scope.rantingId && !scope.wilayahId && !scope.distrikId) return true;

    const disposition = this.resolveStepDisposition(step.side, step.level, org);
    if (!disposition) return false;

    if (step.level === 'ranting') {
      return role === 'admin_ranting' && scope?.rantingId === disposition.rantingId;
    }

    if (step.level === 'wilayah') {
      if (role !== 'admin_wilayah') return false;
      const node = await this.resolveUserNode(scope);
      return node?.wilayahId === disposition.wilayahId;
    }

    if (step.level === 'distrik') {
      if (role !== 'admin_distrik') return false;
      const node = await this.resolveUserNode(scope);
      return node?.distrikId === disposition.distrikId;
    }

    return false;
  }

  private async resolveUserNode(scope: UserScope | undefined) {
    if (!scope) return null;
    if (scope.wilayahId) return { rantingId: scope.rantingId, wilayahId: scope.wilayahId, distrikId: scope.distrikId };
    if (!scope.rantingId) return null;
    const ranting = await this.prisma.ranting.findUnique({
      where: { id: scope.rantingId },
      include: { wilayah: { include: { distrik: true } } },
    });
    if (!ranting?.wilayah?.distrik) return null;
    return {
      rantingId: ranting.id,
      wilayahId: ranting.wilayah.id,
      distrikId: ranting.wilayah.distrik.id,
    };
  }

  private resolveStepDisposition(
    side: SideKey,
    level: StepKey,
    org: OrgContext,
  ): { type: StepKey; rantingId?: string; wilayahId?: string; distrikId?: string } | null {
    if (side === 'asal') {
      if (level === 'ranting') return { type: 'ranting', rantingId: org.fromRantingId };
      if (level === 'wilayah') return { type: 'wilayah', wilayahId: org.fromWilayahId };
      return { type: 'distrik', distrikId: org.fromDistrikId };
    }
    if (level === 'ranting') return { type: 'ranting', rantingId: org.toRantingId };
    if (level === 'wilayah') return { type: 'wilayah', wilayahId: org.toWilayahId };
    return { type: 'distrik', distrikId: org.toDistrikId };
  }

  private async notifyApprovers(org: OrgContext, side: SideKey, level: StepKey) {
    if (!this.notificationsService) return;
    const ids = await this.findApproverUserIds(org, side, level);
    const label = stepLabel(side, level);
    await Promise.allSettled(
      ids.map((userId) =>
        this.notificationsService!.send(userId, {
          judul: 'Permintaan Mutasi Anggota',
          isi: `Ada permintaan mutasi menunggu persetujuan Anda (${label}).`,
          tipe: 'umum',
          data: { side, level },
        }),
      ),
    );
  }

  private async findApproverUserIds(org: OrgContext, side: SideKey, level: StepKey): Promise<string[]> {
    const role = STEP_ROLE[level];
    if (level === 'ranting') {
      const rantingId = side === 'asal' ? org.fromRantingId : org.toRantingId;
      const users = await this.prisma.user.findMany({
        where: { role: role as never, isActive: true, rantingId },
        select: { id: true },
      });
      return users.map((u) => u.id);
    }

    const wilayahId = side === 'asal' ? org.fromWilayahId : org.toWilayahId;
    const distrikId = side === 'asal' ? org.fromDistrikId : org.toDistrikId;

    const rantings = await this.prisma.ranting.findMany({
      where: level === 'wilayah' ? { wilayahId } : { wilayah: { distrikId } },
      select: { id: true },
    });
    const rantingIds = rantings.map((r) => r.id);
    if (rantingIds.length === 0) return [];

    const users = await this.prisma.user.findMany({
      where: { role: role as never, isActive: true, rantingId: { in: rantingIds } },
      select: { id: true },
    });
    return users.map((u) => u.id);
  }
}

export function stepLabel(side: SideKey, level: StepKey): string {
  const orgPart = side === 'asal' ? 'Ranting Asal' : 'Ranting Tujuan';
  const roleLabels: Record<StepKey, string> = {
    ranting: 'Admin Ranting',
    wilayah: 'Admin Wilayah',
    distrik: 'Admin Distrik',
  };
  return `${orgPart} › ${roleLabels[level]}`;
}