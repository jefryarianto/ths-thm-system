import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ReportFilterDto } from './dto/report.dto';
import { UserScope } from '../../common/interfaces/user-scope.interface';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async membersReport(scope?: UserScope) {
    // Scope filtering for members report
    const anggotaWhere: Record<string, unknown> = { deletedAt: null };
    const rantingWhere: Record<string, unknown> = {};

    if (scope?.rantingId) {
      anggotaWhere.rantingId = scope.rantingId;
      rantingWhere.id = scope.rantingId;
    } else if (scope?.wilayahId) {
      anggotaWhere.ranting = { wilayahId: scope.wilayahId };
      rantingWhere.wilayahId = scope.wilayahId;
    } else if (scope?.distrikId) {
      anggotaWhere.ranting = { wilayah: { distrikId: scope.distrikId } };
      rantingWhere.wilayah = { distrikId: scope.distrikId };
    }

    const [total, byStatus, byRanting] = await Promise.all([
      this.prisma.anggota.count({ where: anggotaWhere }),
      this.prisma.anggota.groupBy({ by: ['statusKeanggotaan'], _count: true, where: anggotaWhere }),
      this.prisma.ranting.findMany({ where: rantingWhere, include: { _count: { select: { anggota: true } } } }),
    ]);
    return { success: true, data: { total, byStatus, byRanting: byRanting.map(r => ({ ranting: r.nama, count: r._count.anggota })) } };
  }

  async assessmentsReport(query: ReportFilterDto, scope?: UserScope) {
    const where: Record<string, unknown> = {};
    if (query.kegiatanId) where.kegiatanId = query.kegiatanId;

    // Scope filtering through kegiatan
    if (scope?.rantingId) {
      where.kegiatan = { scopeType: 'ranting', scopeId: scope.rantingId };
    } else if (scope?.wilayahId) {
      where.kegiatan = { scopeType: 'wilayah', scopeId: scope.wilayahId };
    } else if (scope?.distrikId) {
      where.kegiatan = { scopeType: 'distrik', scopeId: scope.distrikId };
    }

    const data = await this.prisma.nilaiPendadaran.findMany({
      where,
      include: {
        calonAnggota: { select: { namaLengkap: true } },
        itemPenilaian: { select: { namaItem: true, aspek: { select: { namaAspek: true } } } },
      },
    });
    return { success: true, data };
  }

  async dashboardStats(scope?: UserScope) {
    // Build scope-aware where clauses
    const anggotaWhere: Record<string, unknown> = { deletedAt: null };
    const iuranWhere: Record<string, unknown> = { status: 'lunas' };

    if (scope?.rantingId) {
      anggotaWhere.rantingId = scope.rantingId;
      iuranWhere.anggota = { rantingId: scope.rantingId };
    } else if (scope?.wilayahId) {
      anggotaWhere.ranting = { wilayahId: scope.wilayahId };
      iuranWhere.anggota = { ranting: { wilayahId: scope.wilayahId } };
    } else if (scope?.distrikId) {
      anggotaWhere.ranting = { wilayah: { distrikId: scope.distrikId } };
      iuranWhere.anggota = { ranting: { wilayah: { distrikId: scope.distrikId } } };
    }

    const [totalMembers, totalCandidates, totalGraduated, totalDuesCollected, pendingValidasi, incompleteData, byStatus, monthlyDues] = await Promise.all([
      this.prisma.anggota.count({ where: anggotaWhere }),
      this.prisma.calonAnggota.count(),
      this.prisma.calonAnggota.count({ where: { status: 'lulus' } }),
      this.prisma.iuran.aggregate({ where: iuranWhere, _sum: { jumlah: true } }),
      this.prisma.anggota.count({ where: { ...anggotaWhere, statusValidasi: 'pending' } }),
      this.prisma.anggota.count({ where: { ...anggotaWhere, statusData: 'incomplete' } }),
      this.prisma.anggota.groupBy({ by: ['statusKeanggotaan'], _count: true, where: anggotaWhere }),
      this.getMonthlyDues(),
    ]);

    return {
      success: true,
      data: {
        totalMembers, totalCandidates, totalGraduated,
        totalDuesCollected: totalDuesCollected._sum.jumlah || 0,
        pendingValidasi, incompleteData,
        memberStatus: byStatus.map(s => ({ status: s.statusKeanggotaan, count: s._count })),
        monthlyDues,
      },
    };
  }

  private async getMonthlyDues() {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(now.getMonth() - 5);

    const rows: Array<{ bulan: number; tahun: number; jumlah: string; count: bigint }> =
      await this.prisma.$queryRaw`
        SELECT
          EXTRACT(MONTH FROM "tanggal_bayar")::int as "bulan",
          EXTRACT(YEAR FROM "tanggal_bayar")::int as "tahun",
          CAST(COALESCE(SUM("jumlah"), 0) AS TEXT) as "jumlah",
          CAST(COUNT(*) AS BIGINT) as "count"
        FROM "iuran"
        WHERE "tanggal_bayar" IS NOT NULL
          AND (("tahun" = ${sixMonthsAgo.getFullYear()} AND EXTRACT(MONTH FROM "tanggal_bayar")::int >= ${sixMonthsAgo.getMonth() + 1})
            OR ("tahun" = ${currentYear} AND EXTRACT(MONTH FROM "tanggal_bayar")::int <= ${currentMonth})
            OR ("tahun" > ${sixMonthsAgo.getFullYear()} AND "tahun" < ${currentYear}))
        GROUP BY "tahun", "bulan"
        ORDER BY "tahun" ASC, "bulan" ASC
      `;

    const monthMap: Record<string, { jumlah: number; count: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - 1 - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      monthMap[key] = { jumlah: 0, count: 0 };
    }

    for (const row of rows) {
      const key = `${row.tahun}-${row.bulan}`;
      if (monthMap[key]) {
        monthMap[key] = { jumlah: Number(row.jumlah), count: Number(row.count) };
      }
    }

    const bulanNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

    return Object.entries(monthMap).map(([key, val]) => {
      const [tahun, bulan] = key.split('-').map(Number);
      return { bulan: `${bulanNames[bulan - 1]} ${tahun}`, jumlah: val.jumlah, transaksi: val.count };
    });
  }

  async scanStats(scope?: UserScope) {
    // Build scope-aware where for absensi
    const absensiWhere: Record<string, unknown> = {};
    if (scope?.rantingId) {
      absensiWhere.anggota = { rantingId: scope.rantingId };
    } else if (scope?.wilayahId) {
      absensiWhere.anggota = { ranting: { wilayahId: scope.wilayahId } };
    } else if (scope?.distrikId) {
      absensiWhere.anggota = { ranting: { wilayah: { distrikId: scope.distrikId } } };
    }

    const [totalAbsensi, absensiHarian, totalDokumen, activeKegiatan, recentAbsensi] = await Promise.all([
      this.prisma.absensiLatihan.count({ where: absensiWhere }),
      this.getAbsensiHarian(),
      this.prisma.dokumen.count({ where: { status: 'generated' } }),
      this.prisma.kegiatan.count({ where: { status: 'published' } }),
      this.prisma.absensiLatihan.findMany({
        where: absensiWhere,
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          anggota: { select: { namaLengkap: true, nomorAnggota: true } },
          latihan: { select: { jenisMateri: true, kegiatan: { select: { nama: true } } } },
        },
      }),
    ]);

    return {
      success: true,
      data: {
        totalAbsensi,
        totalDokumen,
        activeKegiatan,
        absensiHarian,
        recentAbsensi: recentAbsensi.map((a) => ({
          namaAnggota: a.anggota?.namaLengkap || '-',
          nomorAnggota: a.anggota?.nomorAnggota || '-',
          kegiatan: a.latihan?.kegiatan?.nama || a.latihan?.jenisMateri || '-',
          hadir: a.hadir,
          catatan: a.catatan,
          tanggal: a.createdAt,
        })),
      },
    };
  }

  private async getAbsensiHarian() {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(now.getDate() - 30);

      const rows: Array<{ tanggal: string; count: bigint }> = await this.prisma.$queryRaw`
        SELECT
          TO_CHAR("created_at"::date, 'YYYY-MM-DD') as "tanggal",
          CAST(COUNT(*) AS BIGINT) as "count"
        FROM "absensi_latihan"
        WHERE "created_at" >= ${thirtyDaysAgo}
        GROUP BY "created_at"::date
        ORDER BY "created_at"::date ASC
      `;

      return rows.map((r) => ({ tanggal: r.tanggal, count: Number(r.count) }));
    } catch {
      return [];
    }
  }

  async exportReport(type: string, _query: ReportFilterDto, scope?: UserScope) {
    // Build scope-aware where clauses per report type
    let data: unknown[] = [];
    switch (type) {
      case 'members': {
        const where: Record<string, unknown> = { deletedAt: null };
        if (scope?.rantingId) where.rantingId = scope.rantingId;
        else if (scope?.wilayahId) where.ranting = { wilayahId: scope.wilayahId };
        else if (scope?.distrikId) where.ranting = { wilayah: { distrikId: scope.distrikId } };
        data = await this.prisma.anggota.findMany({ where, include: { ranting: true } });
        break;
      }
      case 'dues': {
        const where: Record<string, unknown> = {};
        if (scope?.rantingId) where.anggota = { rantingId: scope.rantingId };
        else if (scope?.wilayahId) where.anggota = { ranting: { wilayahId: scope.wilayahId } };
        else if (scope?.distrikId) where.anggota = { ranting: { wilayah: { distrikId: scope.distrikId } } };
        data = await this.prisma.iuran.findMany({ where, include: { anggota: { select: { nomorAnggota: true, namaLengkap: true } } } });
        break;
      }
      case 'graduates':
        data = await this.prisma.calonAnggota.findMany({ where: { status: 'lulus' } });
        break;
    }
    return { success: true, data };
  }
}
