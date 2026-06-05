import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDueDto, UpdateDueDto, DueFilterDto, BatchPaymentDto } from './dto/dues.dto';
import { UserScope } from '../../common/interfaces/user-scope.interface';
import { ScopeHelper } from '../../common/utils/scope-helpers';
import { CacheService } from '../../common/services/cache.service';

@Injectable()
export class DuesService {
  private readonly CACHE_PREFIX = 'dues:';
  private readonly CACHE_TTL = 30_000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeHelper: ScopeHelper,
    private readonly cache: CacheService,
  ) {}

  async findAll(query: DueFilterDto, scope?: UserScope) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const cacheKey = `${this.CACHE_PREFIX}list:${scope?.rantingId || 'all'}:${page}:${limit}:${query.status || ''}:${query.periode || ''}`;

    return this.cache.getOrSet(cacheKey, async () => {
      const scopeFilter = this.scopeHelper.buildIndirectScopeFilter(scope || {}, 'anggota');
      const where: Record<string, unknown> = { ...scopeFilter };
      if (query.status) where.status = query.status;
      if (query.periode) where.periode = query.periode;

      const [data, total] = await Promise.all([
        this.prisma.iuran.findMany({
          where, skip: (page - 1) * limit, take: limit,
          include: { anggota: { select: { id: true, nomorAnggota: true, namaLengkap: true } } },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.iuran.count({ where }),
      ]);

      return { success: true, data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    }, this.CACHE_TTL);
  }

  async create(dto: CreateDueDto) {
    const due = await this.prisma.iuran.create({ data: dto as never });
    this.cache.invalidatePrefix(this.CACHE_PREFIX);
    this.cache.invalidatePrefix('reports:');
    return { success: true, data: due, message: 'Pembayaran iuran berhasil dicatat' };
  }

  async findOne(id: string, scope?: UserScope) {
    const due = await this.prisma.iuran.findUnique({ where: { id }, include: { anggota: { select: { id: true, nomorAnggota: true, namaLengkap: true, rantingId: true } } } });
    if (!due) throw new NotFoundException('Iuran tidak ditemukan');
    if (scope && !(await this.scopeHelper.hasAccessToResourceAsync(this.prisma, scope, due.anggota?.rantingId))) {
      throw new ForbiddenException('Akses ditolak: diluar cakupan wilayah Anda');
    }
    return { success: true, data: due };
  }

  async update(id: string, dto: UpdateDueDto, scope?: UserScope) {
    if (scope) {
      const existing = await this.prisma.iuran.findUnique({ where: { id }, include: { anggota: { select: { rantingId: true } } } });
      if (!existing) throw new NotFoundException('Iuran tidak ditemukan');
      if (!(await this.scopeHelper.hasAccessToResourceAsync(this.prisma, scope, existing.anggota?.rantingId))) {
        throw new ForbiddenException('Akses ditolak: diluar cakupan wilayah Anda');
      }
    }

    const data: Record<string, unknown> = {};
    if (dto.periode) data.periode = dto.periode;
    if (dto.jumlah !== undefined) data.jumlah = dto.jumlah;
    if (dto.tanggalBayar) data.tanggalBayar = new Date(dto.tanggalBayar);
    if (dto.metodeBayar) data.metodeBayar = dto.metodeBayar;
    if (dto.status) data.status = dto.status;
    if (dto.buktiBayarPath) data.buktiBayarPath = dto.buktiBayarPath;

    const due = await this.prisma.iuran.update({ where: { id }, data });
    this.cache.invalidatePrefix(this.CACHE_PREFIX);
    this.cache.invalidatePrefix('reports:');
    return { success: true, data: due, message: 'Data iuran berhasil diperbarui' };
  }

  async remove(id: string, scope?: UserScope) {
    if (scope) {
      const existing = await this.prisma.iuran.findUnique({ where: { id }, include: { anggota: { select: { rantingId: true } } } });
      if (!existing) throw new NotFoundException('Iuran tidak ditemukan');
      if (!(await this.scopeHelper.hasAccessToResourceAsync(this.prisma, scope, existing.anggota?.rantingId))) {
        throw new ForbiddenException('Akses ditolak: diluar cakupan wilayah Anda');
      }
    }

    await this.prisma.iuran.delete({ where: { id } });
    this.cache.invalidatePrefix(this.CACHE_PREFIX);
    this.cache.invalidatePrefix('reports:');
    return { success: true, message: 'Data iuran berhasil dihapus' };
  }

  async getMemberDues(memberId: string) {
    const dues = await this.prisma.iuran.findMany({
      where: { anggotaId: memberId },
      orderBy: { periode: 'desc' },
    });
    return { success: true, data: dues };
  }

  async getArrears(_query: Record<string, unknown>) {
    const arrears = await this.prisma.iuran.findMany({
      where: { status: 'menunggak' },
      include: { anggota: { select: { id: true, nomorAnggota: true, namaLengkap: true, noHp: true } } },
      orderBy: { periode: 'asc' },
    });

    const totalArrears = arrears.reduce((sum, i) => sum + Number(i.jumlah), 0);

    return { success: true, data: { items: arrears, totalArrears, count: arrears.length } };
  }

  async getDashboardStats() {
    const cacheKey = `${this.CACHE_PREFIX}dashboard`;
    return this.cache.getOrSet(cacheKey, async () => {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      const periode = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

      const [totalIuran, totalLunas, totalMenunggak, iuranBulanIni, anggotaAktif] =
        await Promise.all([
          this.prisma.iuran.aggregate({ _sum: { jumlah: true }, _count: true }),
          this.prisma.iuran.aggregate({ _sum: { jumlah: true }, where: { status: 'lunas' } }),
          this.prisma.iuran.aggregate({ _sum: { jumlah: true }, where: { status: 'menunggak' } }),
          this.prisma.iuran.findMany({ where: { periode }, select: { jumlah: true, status: true } }),
          this.prisma.anggota.count({ where: { statusKeanggotaan: 'aktif' } }),
        ]);

      const iuranBulanIniTotal = iuranBulanIni.reduce((sum, i) => sum + Number(i.jumlah), 0);
      const lunasBulanIni = iuranBulanIni.filter(i => i.status === 'lunas').length;
      const belumBayarBulanIni = anggotaAktif - iuranBulanIni.length;

      return {
        success: true,
        data: {
          totalIuran: Number(totalIuran._sum.jumlah || 0),
          totalTransaksi: totalIuran._count,
          totalLunas: Number(totalLunas._sum.jumlah || 0),
          totalMenunggak: Number(totalMenunggak._sum.jumlah || 0),
          iuranBulanIni: iuranBulanIniTotal,
          lunasBulanIni,
          belumBayarBulanIni,
          anggotaAktif,
        },
      };
    }, this.CACHE_TTL);
  }

  async getReport(_query: Record<string, unknown>) {
    const stats = await this.prisma.iuran.groupBy({
      by: ['status'],
      _count: true,
      _sum: { jumlah: true },
    });

    return { success: true, data: stats };
  }

  async exportReport(_query: Record<string, unknown>) {
    const dues = await this.prisma.iuran.findMany({
      include: { anggota: { select: { nomorAnggota: true, namaLengkap: true } } },
    });
    return { success: true, data: dues };
  }

  async importDues(data: Record<string, unknown>[]) {
    let success = 0;
    for (const row of data) {
      try {
        await this.prisma.iuran.create({
          data: {
            anggotaId: row.anggota_id as string,
            periode: row.periode as string,
            jumlah: parseFloat(row.jumlah as string),
            tanggalBayar: row.tanggal_bayar ? new Date(row.tanggal_bayar as string) : null,
            metodeBayar: (row.metode_bayar as 'manual' | 'transfer' | 'online') || 'manual',
            status: (row.status as 'belum_dibayar' | 'menunggu_verifikasi' | 'lunas' | 'menunggak') || 'lunas',
          },
        });
        success++;
      } catch { /* skip errors */ }
    }
    this.cache.invalidatePrefix(this.CACHE_PREFIX);
    this.cache.invalidatePrefix('reports:');
    return { success: true, data: { imported: success, failed: data.length - success } };
  }

  async batchPayment(dto: BatchPaymentDto) {
    const { memberIds, periode, jumlah } = dto;
    for (const memberId of memberIds) {
      await this.prisma.iuran.create({
        data: { anggotaId: memberId, periode, jumlah, status: 'lunas', tanggalBayar: new Date(), metodeBayar: 'manual' },
      });
    }
    this.cache.invalidatePrefix(this.CACHE_PREFIX);
    this.cache.invalidatePrefix('reports:');
    return { success: true, message: `Pembayaran massal untuk ${memberIds.length} anggota berhasil` };
  }
}
