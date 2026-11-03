import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ReportFilterDto } from './dto/report.dto';
import { UserScope } from '../../common/interfaces/user-scope.interface';
import { CacheService } from '../../common/services/cache.service';

@Injectable()
export class ReportsService {
  private readonly CACHE_PREFIX = 'reports:';
  private readonly CACHE_TTL = 30_000; // 30 seconds

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async getMembersOverTime(scope?: UserScope) {
    // Return daily count of members created over last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    // Scope hierarki: admin hanya melihat pertumbuhan anggota di cakupannya.
    const where: Record<string, unknown> = {
      createdAt: { gte: thirtyDaysAgo },
      deletedAt: null,
    };
    if (scope?.rantingId) where.rantingId = scope.rantingId;
    else if (scope?.wilayahId) where.ranting = { wilayahId: scope.wilayahId };
    else if (scope?.distrikId) where.ranting = { wilayah: { distrikId: scope.distrikId } };

    const raw = await this.prisma.anggota.groupBy({
      by: ['createdAt'],
      where,
      _count: true,
      orderBy: { createdAt: 'asc' },
    });
    // Aggregate by day (YYYY-MM-DD)
    const map = new Map();
    for (const r of raw) {
      const day = r.createdAt.toISOString().split('T')[0];
      const count = r._count ?? 0;
      map.set(day, (map.get(day) ?? 0) + count);
    }
    const result = Array.from(map.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
    return result;
  }

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
      this.prisma.ranting.findMany({
        where: rantingWhere,
        include: { _count: { select: { anggota: true } } },
      }),
    ]);
    return {
      total,
      byStatus,
      byRanting: byRanting.map((r) => ({ ranting: r.nama, count: r._count.anggota })),
    };
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
    return data;
  }

  async dashboardStats(scope?: UserScope, userId?: string) {
    const cacheKey = `${this.CACHE_PREFIX}dashboard:${scope?.rantingId || scope?.wilayahId || scope?.distrikId || 'all'}:${userId || 'anon'}`;
    return this.cache.getOrSet(
      cacheKey,
      async () => this.computeDashboardStats(scope, userId),
      this.CACHE_TTL,
    );
  }

  private async computeDashboardStats(scope?: UserScope, userId?: string) {
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

    const [
      totalMembers,
      totalCandidates,
      totalGraduated,
      totalDuesCollected,
      pendingValidasi,
      incompleteData,
      byStatus,
      monthlyDues,
      totalKegiatan,
      totalLatihan,
      totalKlaim,
      totalDokumen,
      totalPendaftaran,
      totalUsers,
      recentNotifications,
      emailSummary,
    ] = await Promise.all([
      this.prisma.anggota.count({ where: anggotaWhere }),
      this.prisma.calonAnggota.count(),
      this.prisma.calonAnggota.count({ where: { status: 'lulus' } }),
      this.prisma.iuran.aggregate({ where: iuranWhere, _sum: { jumlah: true } }),
      this.prisma.anggota.count({ where: { ...anggotaWhere, statusValidasi: 'pending' } }),
      this.prisma.anggota.count({ where: { ...anggotaWhere, statusData: 'incomplete' } }),
      this.prisma.anggota.groupBy({ by: ['statusKeanggotaan'], _count: true, where: anggotaWhere }),
      this.getMonthlyDues(scope),
      this.prisma.kegiatan.count({ where: { status: 'published' } }),
      this.prisma.latihan.count(),
      this.prisma.klaim.count({ where: { status: { in: ['pending', 'diproses'] } } }),
      this.prisma.dokumen.count({ where: { status: 'generated' } }),
      this.prisma.pendaftaran.count({ where: { status: 'pending' } }),
      this.prisma.user.count({ where: { isActive: true } }),
      this.getRecentNotifications(userId),
      this.getEmailSummary(),
    ]);

    return {
      totalMembers,
      totalCandidates,
      totalGraduated,
      totalDuesCollected: totalDuesCollected._sum.jumlah || 0,
      pendingValidasi,
      incompleteData,
      totalKegiatan: Number(totalKegiatan),
      totalLatihan: Number(totalLatihan),
      totalKlaim: Number(totalKlaim),
      totalDokumen: Number(totalDokumen),
      totalPendaftaran: Number(totalPendaftaran),
      totalUsers: Number(totalUsers),
      memberStatus: byStatus.map((s) => ({ status: s.statusKeanggotaan, count: s._count })),
      monthlyDues,
      recentNotifications,
      emailSummary,
    };
  }

  private async getRecentNotifications(userId?: string): Promise<
    Array<{
      id: string;
      judul: string;
      isi: string;
      tipe: string;
      isRead: boolean;
      createdAt: Date;
    }>
  > {
    const where: Record<string, unknown> = {};
    if (userId) {
      where.userId = userId;
    }
    try {
      return await this.prisma.notifikasi.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, judul: true, isi: true, tipe: true, isRead: true, createdAt: true },
      });
    } catch {
      return [];
    }
  }

  private async getEmailSummary() {
    try {
      const [totalSent, totalFailed, totalSkipped, totalSuppressed] = await Promise.all([
        this.prisma.emailLog.count({ where: { status: 'sent' } }),
        this.prisma.emailLog.count({ where: { status: 'failed' } }),
        this.prisma.emailLog.count({ where: { status: 'skipped' } }),
        this.prisma.suppressedEmail.count(),
      ]);
      return { totalSent, totalFailed, totalSkipped, totalSuppressed };
    } catch {
      return null;
    }
  }

  private async getMonthlyDues(scope?: UserScope) {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(now.getMonth() - 5);

    // Build scope-aware where clause for Prisma
    const where: Record<string, unknown> = {
      tanggalBayar: { not: null },
    };

    if (scope?.rantingId) {
      where.anggota = { rantingId: scope.rantingId };
    } else if (scope?.wilayahId) {
      where.anggota = { ranting: { wilayahId: scope.wilayahId } };
    } else if (scope?.distrikId) {
      where.anggota = { ranting: { wilayah: { distrikId: scope.distrikId } } };
    }

    // Use Prisma groupBy with typed aggregation (safer than raw SQL)
    const rows = await this.prisma.iuran.groupBy({
      by: ['tanggalBayar'],
      where,
      _sum: { jumlah: true },
      _count: { id: true },
    });

    // Filter to last 6 months and aggregate by month/year
    const monthMap: Record<string, { jumlah: number; count: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - 1 - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      monthMap[key] = { jumlah: 0, count: 0 };
    }

    for (const row of rows) {
      if (!row.tanggalBayar) continue;
      const date = new Date(row.tanggalBayar);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const key = `${year}-${month}`;

      // Only include last 6 months
      if (monthMap[key] === undefined) continue;

      monthMap[key] = {
        jumlah: Number(row._sum.jumlah ?? 0),
        count: row._count.id,
      };
    }

    const bulanNames = [
      'Januari',
      'Februari',
      'Maret',
      'April',
      'Mei',
      'Juni',
      'Juli',
      'Agustus',
      'September',
      'Oktober',
      'November',
      'Desember',
    ];

    return Object.entries(monthMap).map(([key, val]) => {
      const [tahun, bulan] = key.split('-').map(Number);
      return {
        bulan: `${bulanNames[bulan - 1]} ${tahun}`,
        jumlah: val.jumlah,
        transaksi: val.count,
      };
    });
  }

  async scanStats(scope?: UserScope) {
    const cacheKey = `${this.CACHE_PREFIX}scan:${scope?.rantingId || scope?.wilayahId || scope?.distrikId || 'all'}`;
    return this.cache.getOrSet(cacheKey, async () => this.computeScanStats(scope), this.CACHE_TTL);
  }

  private async computeScanStats(scope?: UserScope) {
    // Build scope-aware where for absensi
    const absensiWhere: Record<string, unknown> = {};
    if (scope?.rantingId) {
      absensiWhere.anggota = { rantingId: scope.rantingId };
    } else if (scope?.wilayahId) {
      absensiWhere.anggota = { ranting: { wilayahId: scope.wilayahId } };
    } else if (scope?.distrikId) {
      absensiWhere.anggota = { ranting: { wilayah: { distrikId: scope.distrikId } } };
    }

    const [totalAbsensi, absensiHarian, totalDokumen, activeKegiatan, recentAbsensi] =
      await Promise.all([
        this.prisma.absensiLatihan.count({ where: absensiWhere }),
        this.getAbsensiHarian(scope),
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
    };
  }

  private async getAbsensiHarian(scope?: UserScope) {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(now.getDate() - 30);

      // Build scope-aware where clause
      const where: Record<string, unknown> = {
        createdAt: { gte: thirtyDaysAgo },
      };

      if (scope?.rantingId) {
        where.anggota = { rantingId: scope.rantingId };
      } else if (scope?.wilayahId) {
        where.anggota = { ranting: { wilayahId: scope.wilayahId } };
      } else if (scope?.distrikId) {
        where.anggota = { ranting: { wilayah: { distrikId: scope.distrikId } } };
      }

      // Use Prisma groupBy for daily absensi counts
      const rows = await this.prisma.absensiLatihan.groupBy({
        by: ['createdAt'],
        where,
        _count: { id: true },
        orderBy: { createdAt: 'asc' },
      });

      // Aggregate by date (groupBy groups by exact timestamp, so we need to group by date)
      const dateMap: Record<string, number> = {};
      for (const row of rows) {
        const dateStr = row.createdAt.toISOString().split('T')[0]; // YYYY-MM-DD
        dateMap[dateStr] = (dateMap[dateStr] ?? 0) + row._count.id;
      }

      // Fill missing dates with 0
      const result: Array<{ tanggal: string; count: number }> = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        result.push({ tanggal: dateStr, count: dateMap[dateStr] ?? 0 });
      }

      return result;
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
        else if (scope?.distrikId)
          where.anggota = { ranting: { wilayah: { distrikId: scope.distrikId } } };
        data = await this.prisma.iuran.findMany({
          where,
          include: { anggota: { select: { nomorAnggota: true, namaLengkap: true } } },
        });
        break;
      }
      case 'graduates':
        data = await this.prisma.calonAnggota.findMany({ where: { status: 'lulus' } });
        break;
    }
    return data;
  }
}
