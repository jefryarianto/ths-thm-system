import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserScope } from '../../common/interfaces/user-scope.interface';
import { ScopeHelper } from '../../common/utils/scope-helpers';

@Injectable()
export class MemberActivityService {
  private readonly logger = new Logger(MemberActivityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeHelper: ScopeHelper,
  ) {}

  async getActivity(memberId: string, page = 1, limit = 20, scope?: UserScope) {
    // Verify member exists and scope access
    const member = await this.prisma.anggota.findUnique({
      where: { id: memberId, deletedAt: null },
      select: { id: true, rantingId: true, namaLengkap: true },
    });
    if (!member) {
      return { success: false, message: 'Anggota tidak ditemukan' };
    }
    if (
      scope &&
      !(await this.scopeHelper.hasAccessToResourceAsync(this.prisma, scope, member.rantingId))
    ) {
      return { success: false, message: 'Akses ditolak' };
    }

    // Gather activities from multiple tables in parallel
    const [trainings, iuran, documents, kegiatan, assessments] = await Promise.all([
      // Training attendances
      this.prisma.absensiLatihan.findMany({
        where: { anggotaId: memberId },
        include: { latihan: { select: { hariTanggal: true, lokasi: true, jenisMateri: true } } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      // Dues payments
      this.prisma.iuran.findMany({
        where: { anggotaId: memberId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      // Documents
      this.prisma.dokumen.findMany({
        where: { anggotaId: memberId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      // Activity participations
      this.prisma.kegiatanPeserta.findMany({
        where: { anggotaId: memberId },
        include: { kegiatan: { select: { nama: true, tipe: true, tanggalMulai: true } } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      // Assessment scores
      this.prisma.nilaiPendadaran.findMany({
        where: { anggotaId: memberId },
        include: { itemPenilaian: { select: { namaItem: true } }, kegiatan: { select: { nama: true } } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);

    // Format into unified activity timeline
    const activities: Array<{
      date: Date;
      type: string;
      title: string;
      description: string;
      icon: string;
    }> = [
      ...trainings.map((t) => ({
        date: t.createdAt,
        type: 'training' as const,
        title: 'Latihan',
        description: `Hadir latihan ${t.latihan?.jenisMateri || ''} di ${t.latihan?.lokasi || '-'}`,
        icon: '🏋️',
      })),
      ...iuran.map((d) => ({
        date: d.createdAt,
        type: 'dues' as const,
        title: d.status === 'lunas' ? 'Pembayaran Iuran' : 'Iuran',
        description: `Iuran periode ${d.periode} - ${d.status === 'lunas' ? 'Lunas' : d.status === 'menunggu_verifikasi' ? 'Menunggu Verifikasi' : 'Belum Dibayar'}`,
        icon: d.status === 'lunas' ? '✅' : '⏳',
      })),
      ...documents.map((d) => ({
        date: d.createdAt,
        type: 'document' as const,
        title: `Dokumen: ${d.tipe}`,
        description: `Dokumen ${d.nomorDokumen} - ${d.status}`,
        icon: '📄',
      })),
      ...kegiatan.map((k) => ({
        date: k.createdAt,
        type: 'activity' as const,
        title: `Kegiatan: ${k.kegiatan?.nama || ''}`,
        description: `Berpartisipasi dalam kegiatan ${k.kegiatan?.tipe || ''}`,
        icon: '📋',
      })),
      ...assessments.map((a) => ({
        date: a.createdAt,
        type: 'assessment' as const,
        title: 'Penilaian Pendadaran',
        description: `Nilai ${a.skor} - ${a.itemPenilaian?.namaItem || ''} (${a.kegiatan?.nama || ''})`,
        icon: '🎯',
      })),
    ];

    // Sort by date descending
    activities.sort((a, b) => b.date.getTime() - a.date.getTime());

    // Paginate
    const start = (page - 1) * limit;
    const paginated = activities.slice(start, start + limit);

    return {
      success: true,
      data: {
        member: { id: member.id, namaLengkap: member.namaLengkap },
        activities: paginated,
        meta: {
          total: activities.length,
          page,
          limit,
          totalPages: Math.ceil(activities.length / limit),
        },
      },
    };
  }
}