import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async membersReport() {
    const [total, byStatus, byRanting] = await Promise.all([
      this.prisma.anggota.count({ where: { deletedAt: null } }),
      this.prisma.anggota.groupBy({ by: ['statusKeanggotaan'], _count: true }),
      this.prisma.ranting.findMany({ include: { _count: { select: { anggota: true } } } }),
    ]);
    return { success: true, data: { total, byStatus, byRanting: byRanting.map(r => ({ ranting: r.nama, count: r._count.anggota })) } };
  }

  async assessmentsReport(query: any) {
    const data = await this.prisma.nilaiPendadaran.findMany({
      where: query.kegiatanId ? { kegiatanId: query.kegiatanId } : {},
      include: {
        calonAnggota: { select: { namaLengkap: true } },
        itemPenilaian: { select: { namaItem: true, aspek: { select: { namaAspek: true } } } },
      },
    });
    return { success: true, data };
  }

  async dashboardStats() {
    const [totalMembers, totalCandidates, totalGraduated, totalDuesCollected, pendingValidasi, incompleteData, byStatus, monthlyDues] = await Promise.all([
      this.prisma.anggota.count({ where: { deletedAt: null } }),
      this.prisma.calonAnggota.count(),
      this.prisma.calonAnggota.count({ where: { status: 'lulus' } }),
      this.prisma.iuran.aggregate({ where: { status: 'lunas' }, _sum: { jumlah: true } }),
      this.prisma.anggota.count({ where: { statusValidasi: 'pending', deletedAt: null } }),
      this.prisma.anggota.count({ where: { statusData: 'incomplete', deletedAt: null } }),
      this.prisma.anggota.groupBy({ by: ['statusKeanggotaan'], _count: true, where: { deletedAt: null } }),
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

  async scanStats() {
    const [totalAbsensi, absensiHarian, totalDokumen, activeKegiatan, recentAbsensi] = await Promise.all([
      this.prisma.absensiLatihan.count(),
      this.getAbsensiHarian(),
      this.prisma.dokumen.count({ where: { status: 'generated' } }),
      this.prisma.kegiatan.count({ where: { status: 'published' } }),
      this.prisma.absensiLatihan.findMany({
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
        recentAbsensi: recentAbsensi.map((a: any) => ({
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

      return rows.map((r: any) => ({ tanggal: r.tanggal, count: Number(r.count) }));
    } catch {
      return [];
    }
  }

  async exportReport(type: string, query: any) {
    let data: any[] = [];
    switch (type) {
      case 'members':
        data = await this.prisma.anggota.findMany({ where: { deletedAt: null }, include: { ranting: true } });
        break;
      case 'dues':
        data = await this.prisma.iuran.findMany({ include: { anggota: { select: { nomorAnggota: true, namaLengkap: true } } } });
        break;
      case 'graduates':
        data = await this.prisma.calonAnggota.findMany({ where: { status: 'lulus' } });
        break;
    }
    return { success: true, data };
  }
}