import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserScope } from '../../common/interfaces/user-scope.interface';
import { ScopeHelper } from '../../common/utils/scope-helpers';

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeHelper: ScopeHelper,
  ) {}

  async getCalendarEvents(year: number, month: number, scope?: UserScope) {
    // Build date range for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const scopeFilter = this.scopeHelper.buildScopeFilter(scope || {});

    // Get trainings in this month
    const trainings = await this.prisma.latihan.findMany({
      where: {
        hariTanggal: { gte: startDate, lte: endDate },
        ...scopeFilter,
      },
      select: {
        id: true,
        hariTanggal: true,
        lokasi: true,
        jenisMateri: true,
        ranting: { select: { nama: true } },
      },
      orderBy: { hariTanggal: 'asc' },
    });

    // Get activities/events in this month
    const activities = await this.prisma.kegiatan.findMany({
      where: {
        tanggalMulai: { gte: startDate },
        tanggalSelesai: { lte: endDate },
        status: { not: 'cancelled' },
        ...scopeFilter,
      },
      select: {
        id: true,
        nama: true,
        tipe: true,
        tanggalMulai: true,
        tanggalSelesai: true,
        lokasi: true,
      },
      orderBy: { tanggalMulai: 'asc' },
    });

    // Get graduations in this month
    const graduations = await this.prisma.kegiatan.findMany({
      where: {
        tipe: 'pendadaran',
        tanggalMulai: { gte: startDate, lte: endDate },
        status: { not: 'cancelled' },
        ...scopeFilter,
      },
      select: {
        id: true,
        nama: true,
        tanggalMulai: true,
        tanggalSelesai: true,
        lokasi: true,
      },
      orderBy: { tanggalMulai: 'asc' },
    });

    // Format events
    const events = [
      ...trainings.map((t) => ({
        id: t.id,
        title: `Latihan: ${t.jenisMateri || t.ranting?.nama || 'Latihan'}`,
        date: t.hariTanggal.toISOString(),
        type: 'training' as const,
        location: t.lokasi,
        description: `Latihan di ${t.ranting?.nama || 'ranting'}`,
      })),
      ...activities.map((a) => ({
        id: a.id,
        title: a.nama,
        date: a.tanggalMulai.toISOString(),
        endDate: a.tanggalSelesai?.toISOString(),
        type: a.tipe as string,
        location: a.lokasi,
      })),
      ...graduations.map((g) => ({
        id: g.id,
        title: `Pendadaran: ${g.nama}`,
        date: g.tanggalMulai.toISOString(),
        endDate: g.tanggalSelesai?.toISOString(),
        type: 'pendadaran' as const,
        location: g.lokasi,
      })),
    ];

    // Sort by date
    events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return {
      success: true,
      data: {
        year,
        month,
        events,
        total: events.length,
      },
    };
  }

  async getUpcomingEvents(days: number = 7, scope?: UserScope) {
    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + days);
    future.setHours(23, 59, 59, 999);

    const scopeFilter = this.scopeHelper.buildScopeFilter(scope || {});

    // Get upcoming trainings
    const trainings = await this.prisma.latihan.findMany({
      where: {
        hariTanggal: { gte: now, lte: future },
        ...scopeFilter,
      },
      include: {
        ranting: { select: { nama: true } },
      },
      orderBy: { hariTanggal: 'asc' },
      take: 20,
    });

    // Get upcoming dues payment deadlines
    const upcomingDues = await this.prisma.iuran.findMany({
      where: {
        status: { in: ['belum_dibayar', 'menunggak'] },
        createdAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) },
      },
      include: {
        anggota: { select: { id: true, namaLengkap: true } },
      },
      orderBy: { createdAt: 'asc' },
      take: 20,
    });

    return {
      success: true,
      data: {
        trainings: trainings.map((t) => ({
          id: t.id,
          title: `Latihan: ${t.jenisMateri || 'Latihan'}`,
          date: t.hariTanggal,
          location: t.lokasi || t.ranting?.nama,
          ranting: t.ranting?.nama,
        })),
        dues: upcomingDues.map((d) => ({
          id: d.id,
          memberName: d.anggota?.namaLengkap,
          periode: d.periode,
          amount: d.jumlah,
          status: d.status,
        })),
      },
    };
  }
}