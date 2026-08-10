import { Injectable, NotFoundException, ForbiddenException, Logger, Optional } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserScope } from '../../common/interfaces/user-scope.interface';
import { ScopeHelper } from '../../common/utils/scope-helpers';
import { NotificationsService } from '../notifications/notifications.service';

export interface SubmitApprovalDto {
  requestType: 'member_create' | 'member_update' | 'claim' | 'letter' | 'certificate';
  itemId: string;
  note?: string;
}

@Injectable()
export class ApprovalService {
  private readonly logger = new Logger(ApprovalService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeHelper: ScopeHelper,
    @Optional() private readonly notificationsService?: NotificationsService,
  ) {}

  async submit(dto: SubmitApprovalDto, userId: string, scope?: UserScope) {
    // Get approval levels based on request type
    const levels = await this.prisma.approvalLevel.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
    });

    if (levels.length === 0) {
      // Auto-approve if no levels configured
      return { autoApproved: true };
    }

    // Create approval request
    const request = await this.prisma.approvalRequest.create({
      data: {
        requestType: dto.requestType,
        itemId: dto.itemId,
        submittedBy: userId,
        status: 'pending',
      },
    });

    // Create levels
    for (const level of levels) {
      await this.prisma.approvalRequestLevel.create({
        data: {
          requestId: request.id,
          approvalLevelId: level.id,
          status: 'pending',
        },
      });
    }

    this.logger.log(`Approval request created: ${request.id} type=${dto.requestType}`);

    // Send notification to first-level approvers
    await this.notifyApprovers(request.id, levels[0].id, scope, dto.requestType);

    return { id: request.id, status: request.status };
  }

  async approve(requestId: string, userId: string, note?: string, scope?: UserScope) {
    const request = await this.prisma.approvalRequest.findUnique({
      where: { id: requestId },
      include: { levels: { include: { approvalLevel: true }, orderBy: { approvalLevel: { order: 'asc' } } } },
    });

    if (!request) throw new NotFoundException('Pengajuan tidak ditemukan');
    if (request.status !== 'pending') throw new ForbiddenException('Pengajuan sudah diproses');

    // Find current pending level (first one)
    const currentLevel = request.levels.find((l) => l.status === 'pending');
    if (!currentLevel) throw new ForbiddenException('Semua level sudah diproses');

    // Approve current level
    await this.prisma.approvalRequestLevel.update({
      where: { requestId_approvalLevelId: { requestId, approvalLevelId: currentLevel.approvalLevelId } },
      data: { status: 'approved', decidedBy: userId, decidedAt: new Date(), note: note || null },
    });

    // Check if all levels are approved
    const remainingLevels = request.levels.filter((l) => l.status === 'pending' && l.approvalLevelId !== currentLevel.approvalLevelId);
    
    if (remainingLevels.length === 0) {
      // All approved — finalize
      await this.prisma.approvalRequest.update({
        where: { id: requestId },
        data: { status: 'approved', completedAt: new Date() },
      });
      
      await this.finalizeApproval(request);
      this.logger.log(`Approval completed: ${requestId}`);
    } else {
      // Notify next level approvers
      const nextLevel = remainingLevels[0];
      await this.notifyApprovers(requestId, nextLevel.approvalLevelId, scope, request.requestType);
    }

  }

  async reject(requestId: string, userId: string, note?: string) {
    const request = await this.prisma.approvalRequest.findUnique({
      where: { id: requestId },
      include: { levels: true },
    });

    if (!request) throw new NotFoundException('Pengajuan tidak ditemukan');
    if (request.status !== 'pending') throw new ForbiddenException('Pengajuan sudah diproses');

    // Reject current pending level
    const currentLevel = request.levels.find((l) => l.status === 'pending');
    if (currentLevel) {
      await this.prisma.approvalRequestLevel.update({
        where: { requestId_approvalLevelId: { requestId, approvalLevelId: currentLevel.approvalLevelId } },
        data: { status: 'rejected', decidedBy: userId, decidedAt: new Date(), note: note || null },
      });
    }

    // Reject whole request
    await this.prisma.approvalRequest.update({
      where: { id: requestId },
      data: { status: 'rejected', completedAt: new Date() },
    });

    this.logger.log(`Approval rejected: ${requestId}`);
  }

  async findOne(id: string, scope?: UserScope) {
    const request = await this.prisma.approvalRequest.findUnique({
      where: { id },
      include: {
        levels: {
          include: { approvalLevel: true },
          orderBy: { approvalLevel: { order: 'asc' } },
        },
      },
    });

    if (!request) throw new NotFoundException('Pengajuan tidak ditemukan');
    return request;
  }

  async getPending(scope?: UserScope) {
    const where: Record<string, unknown> = { status: 'pending' };
    
    const requests = await this.prisma.approvalRequest.findMany({
      where,
      include: {
        levels: {
          include: { approvalLevel: true },
          orderBy: { approvalLevel: { order: 'asc' } },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return requests;
  }

  private async notifyApprovers(requestId: string, levelId: string, scope?: UserScope, requestType?: string) {
    try {
      const level = await this.prisma.approvalLevel.findUnique({ where: { id: levelId } });
      if (!level) return;

      const approvers = await this.prisma.user.findMany({
        where: { role: level.roleName as never, isActive: true },
        select: { id: true },
      });

      const requestTypeLabel = this.getRequestTypeLabel(requestType || 'umum');

      for (const approver of approvers) {
        // NotificationsService.send() handles: in-app notif, preference check,
        // socket.io events, email notification, FCM push, & cache invalidation — one call
        this.notificationsService?.send(approver.id, {
          judul: '✅ Persetujuan Dibutuhkan',
          isi: `${level.name}: ${requestTypeLabel}`,
          tipe: 'approval_request',
          data: {
            approvalId: requestId,
            screen: 'approvals',
            screenId: requestId,
          },
        }).catch((err) => this.logger.error(`Push notif failed for ${approver.id}: ${err.message}`));
      }
    } catch (error) {
      this.logger.error(`Failed to notify approvers: ${(error as Error).message}`);
    }
  }

  private getRequestTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      member_create: 'Pembuatan Anggota Baru',
      member_update: 'Perubahan Data Anggota',
      claim: 'Klaim',
      letter: 'Surat',
      certificate: 'Sertifikat',
    };
    return labels[type] || type;
  }

  private async finalizeApproval(request: { requestType: string; itemId: string }) {
    // Auto-execute based on request type
    switch (request.requestType) {
      case 'member_create':
        await this.prisma.anggota.update({
          where: { id: request.itemId },
          data: { statusValidasi: 'approved', statusKeanggotaan: 'aktif' },
        });
        break;
      case 'member_update':
        // Approve data update — set statusValidasi to approved
        await this.prisma.anggota.update({
          where: { id: request.itemId },
          data: { statusValidasi: 'approved', statusData: 'complete' },
        });
        // Notify the member that their data has been approved
        await this.notifyMemberApproved(request.itemId);
        break;
      case 'claim':
        await this.prisma.klaim.update({
          where: { id: request.itemId },
          data: { status: 'disetujui' },
        });
        break;
      case 'letter':
        await this.prisma.suratKeluar.update({
          where: { id: request.itemId },
          data: { status: 'terkirim' },
        });
        break;
      case 'certificate':
        // Certificate generation handled by documents service
        break;
    }
  }

  private async notifyMemberApproved(anggotaId: string) {
    try {
      const member = await this.prisma.anggota.findUnique({
        where: { id: anggotaId },
        select: { email: true, namaLengkap: true },
      });

      if (!member?.email) return;

      // Find user by email to send notification
      const user = await this.prisma.user.findUnique({
        where: { email: member.email },
        select: { id: true },
      });

      if (user && this.notificationsService) {
        this.notificationsService.send(user.id, {
          judul: '✅ Data Anggota Disetujui',
          isi: `Halo ${member.namaLengkap}, data keanggotaan Anda telah disetujui.`,
          tipe: 'umum',
          data: {
            screen: 'members',
            anggotaId,
          },
        }).catch((err) => this.logger.error(`Failed to notify member approval: ${err.message}`));
      }
    } catch (error) {
      this.logger.error(`Failed to notify member ${anggotaId}: ${(error as Error).message}`);
    }
  }
}