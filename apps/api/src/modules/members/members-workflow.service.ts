import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserScope } from '../../common/interfaces/user-scope.interface';
import { ScopeHelper } from '../../common/utils/scope-helpers';

@Injectable()
export class MembersWorkflowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeHelper: ScopeHelper,
  ) {}

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

    const missingFields: string[] = [];
    if (!member.namaLengkap) missingFields.push('nama_lengkap');
    if (!member.jenisKelamin) missingFields.push('jenis_kelamin');
    if (!member.tempatLahir) missingFields.push('tempat_lahir');
    if (!member.tanggalLahir) missingFields.push('tanggal_lahir');
    if (!member.tempatDadar) missingFields.push('tempat_dadar');
    if (!member.tahunDadar) missingFields.push('tahun_dadar');
    if (!member.tingkat) missingFields.push('tingkat');

    if (missingFields.length > 0) {
      await this.prisma.anggota.update({
        where: { id },
        data: { statusData: 'incomplete', missingFields },
      });
      return { success: true, data: { valid: false, missingFields } };
    }

    await this.prisma.anggota.update({
      where: { id },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { statusData: 'complete', missingFields: undefined as any },
    });

    return { success: true, data: { valid: true } };
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

    return { success: true, message: 'Anggota berhasil disetujui' };
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

    return { success: true, message: 'Anggota berhasil ditangguhkan' };
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

    return { success: true, message: 'Anggota berhasil diaktifkan kembali' };
  }
}
