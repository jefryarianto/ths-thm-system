import { Injectable, NotFoundException, ForbiddenException, Optional } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserScope } from '../../common/interfaces/user-scope.interface';
import { ScopeHelper } from '../../common/utils/scope-helpers';
import { PersistentAuditService } from '../../common/services/persistent-audit.service';
import { calculateMissingFields } from '../../common/utils/member-completeness';

@Injectable()
export class MembersWorkflowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeHelper: ScopeHelper,
    @Optional() private readonly persistentAudit?: PersistentAuditService,
  ) {}

  private audit(action: string, id: string, details?: Record<string, unknown> | null) {
    void this.persistentAudit?.log({
      action,
      entity: 'Anggota',
      entityId: id,
      userId: null,
      ipAddress: null,
      userAgent: null,
      details: details ?? null,
    });
  }

  async validate(id: string, scope?: UserScope) {
    const member = await this.prisma.anggota.findUnique({
      where: { id, deletedAt: null },
      select: {
        id: true,
        rantingId: true,
        namaLengkap: true,
        jenisKelamin: true,
        tempatLahir: true,
        tanggalLahir: true,
        tempatDadar: true,
        tahunDadar: true,
        tingkat: true,
        alamat: true,
        noHp: true,
        email: true,
        statusData: true,
      },
    });

    if (!member) throw new NotFoundException('Anggota tidak ditemukan');

    if (
      scope &&
      !(await this.scopeHelper.hasAccessToResourceAsync(this.prisma, scope, member.rantingId))
    ) {
      throw new ForbiddenException('Akses ditolak: diluar cakupan wilayah Anda');
    }

    // Use shared utility — only checks fields the user can edit from the mobile app.
    const missingFields = calculateMissingFields(member as Record<string, unknown>);

    if (missingFields.length > 0) {
      await this.prisma.anggota.update({
        where: { id },
        data: { statusData: 'incomplete', missingFields },
      });
      return { valid: false, missingFields };
    }

    await this.prisma.anggota.update({
      where: { id },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { statusData: 'complete', missingFields: undefined as any },
    });

    return { valid: true };
  }

  async approve(id: string, scope?: UserScope) {
    await this.scopeHelper.verifyResourceAccess(
      this.prisma,
      scope,
      id,
      (prisma, rid) =>
        prisma.anggota.findUnique({ where: { id: rid }, select: { rantingId: true } }),
      'Anggota tidak ditemukan',
    );

    await this.prisma.anggota.update({
      where: { id },
      data: { statusValidasi: 'approved', statusKeanggotaan: 'aktif' },
    });

    this.audit('MEMBER_APPROVE', id);

    // void — interceptor returns { success: true }
  }

  async suspend(id: string, scope?: UserScope) {
    await this.scopeHelper.verifyResourceAccess(
      this.prisma,
      scope,
      id,
      (prisma, rid) =>
        prisma.anggota.findUnique({ where: { id: rid }, select: { rantingId: true } }),
      'Anggota tidak ditemukan',
    );

    await this.prisma.anggota.update({
      where: { id },
      data: { statusKeanggotaan: 'nonaktif' },
    });

    this.audit('MEMBER_SUSPEND', id);

    // void — interceptor returns { success: true }
  }

  async reactivate(id: string, scope?: UserScope) {
    await this.scopeHelper.verifyResourceAccess(
      this.prisma,
      scope,
      id,
      (prisma, rid) =>
        prisma.anggota.findUnique({ where: { id: rid }, select: { rantingId: true } }),
      'Anggota tidak ditemukan',
    );

    await this.prisma.anggota.update({
      where: { id },
      data: { statusKeanggotaan: 'aktif' },
    });

    this.audit('MEMBER_REACTIVATE', id);

    // void — interceptor returns { success: true }
  }
}
