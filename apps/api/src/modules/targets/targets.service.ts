import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserScope } from '../../common/interfaces/user-scope.interface';

@Injectable()
export class TargetsService {
  private readonly logger = new Logger(TargetsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getTargets(scope?: UserScope) {
    const anggotaWhere: Record<string, unknown> = { deletedAt: null };
    if (scope?.rantingId) anggotaWhere.rantingId = scope.rantingId;
    else if (scope?.wilayahId) anggotaWhere.ranting = { wilayahId: scope.wilayahId };
    else if (scope?.distrikId) anggotaWhere.ranting = { wilayah: { distrikId: scope.distrikId } };

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const [totalMembers, activeMembers, duesThisMonth, paidDues, recentCandidates, graduatedCandidates] = await Promise.all([
      this.prisma.anggota.count({ where: anggotaWhere }),
      this.prisma.anggota.count({ where: { ...anggotaWhere, statusKeanggotaan: 'aktif' } }),
      this.prisma.iuran.count({ where: { periode: currentMonth } }),
      this.prisma.iuran.count({ where: { periode: currentMonth, status: 'lunas' } }),
      this.prisma.calonAnggota.count({ where: { status: 'diusulkan' } }),
      this.prisma.calonAnggota.count({ where: { status: 'lulus' } }),
    ]);

    // Calculate progress percentages
    const targetMembers = Math.max(totalMembers, 1);
    const targetDues = Math.max(duesThisMonth, 1);

    return {
      success: true,
      data: {
        members: {
          total: totalMembers,
          active: activeMembers,
          target: targetMembers,
          progress: Math.round((activeMembers / targetMembers) * 100),
          label: 'Anggota Aktif',
        },
        dues: {
          total: duesThisMonth,
          paid: paidDues,
          unpaid: duesThisMonth - paidDues,
          target: targetDues,
          progress: Math.round((paidDues / targetDues) * 100),
          label: 'Pembayaran Iuran',
        },
        candidates: {
          total: recentCandidates,
          graduated: graduatedCandidates,
          label: 'Kandidat & Kelulusan',
        },
        periode: currentMonth,
      },
    };
  }
}