import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export type PeriodeLevel = 'nasional' | 'distrik' | 'wilayah' | 'ranting';

@Injectable()
export class PeriodeService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Periode aktif untuk sebuah unit (nasional/distrik/wilayah/ranting).
   * Mengutamakan relasi PeriodeAktif (per-unit), fallback ke periode isActive global.
   */
  async getActivePeriodeIdForUnit(level: PeriodeLevel, unitId?: string | null): Promise<string | null> {
    // Level nasional memakai unitId nasional; bila tidak ada unitId, pakai nasional pertama.
    let targetUnitId = unitId;
    if (level === 'nasional' && !targetUnitId) {
      const nasional = await this.prisma.nasional.findFirst({ select: { id: true } });
      if (nasional) targetUnitId = nasional.id;
    }

    if (targetUnitId) {
      const pa = await this.prisma.periodeAktif.findUnique({
        where: { level_unitId: { level, unitId: targetUnitId } },
        select: { periodeId: true },
      });
      if (pa) return pa.periodeId;
    }

    // Fallback ke periode global aktif (kompatibilitas dengan perilaku lama)
    const globalActive = await this.prisma.periode.findFirst({
      where: { isActive: true },
      select: { id: true },
    });
    return globalActive?.id ?? null;
  }

  async findAll() {
    return this.prisma.periode.findMany({
      orderBy: { tglMulai: 'desc' },
      include: {
        _count: { select: { pengurus: true } },
        aktifUnits: { orderBy: { createdAt: 'asc' } },
      },
    });
  }

  async findOne(id: string) {
    const periode = await this.prisma.periode.findUnique({
      where: { id },
      include: { _count: { select: { pengurus: true } } },
    });
    if (!periode) throw new NotFoundException('Periode tidak ditemukan');
    return periode;
  }

  async create(data: { nama: string; tglMulai: string; tglSelesai: string; isActive?: boolean }) {
    // If setting as active, deactivate others
    if (data.isActive) {
      await this.prisma.periode.updateMany({ where: { isActive: true }, data: { isActive: false } });
    }
    return this.prisma.periode.create({
      data: {
        nama: data.nama,
        tglMulai: new Date(data.tglMulai),
        tglSelesai: new Date(data.tglSelesai),
        isActive: data.isActive ?? false,
      },
    });
  }

  async update(id: string, data: { nama?: string; tglMulai?: string; tglSelesai?: string; isActive?: boolean }) {
    await this.findOne(id);
    // If setting as active, deactivate others
    if (data.isActive) {
      await this.prisma.periode.updateMany({ where: { isActive: true, id: { not: id } }, data: { isActive: false } });
    }
    const updateData: Record<string, unknown> = {};
    if (data.nama !== undefined) updateData.nama = data.nama;
    if (data.tglMulai !== undefined) updateData.tglMulai = new Date(data.tglMulai);
    if (data.tglSelesai !== undefined) updateData.tglSelesai = new Date(data.tglSelesai);
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    return this.prisma.periode.update({ where: { id }, data: updateData });
  }

  async remove(id: string) {
    const periode = await this.findOne(id);
    if (periode._count.pengurus > 0) {
      throw new ConflictException(`Periode "${periode.nama}" masih digunakan oleh ${periode._count.pengurus} pengurus`);
    }
    return this.prisma.periode.delete({ where: { id } });
  }

  /**
   * Tetapkan periode sebagai periode aktif untuk sebuah unit spesifik.
   * Unit berbeda boleh aktif bersamaan (unpaired). Tidak menonaktifkan periode unit lain.
   */
  async activateUnit(
    periodeId: string,
    level: PeriodeLevel,
    unitId?: string | null,
  ): Promise<{ id: string; periodeId: string; level: string; unitId: string; createdAt: Date }> {
    await this.findOne(periodeId);
    const resolvedUnitId = await this.resolveUnitId(level, unitId);
    await this.validateUnit(level, resolvedUnitId);

    // Ganti pilihan aktif lama untuk unit ini (delete-then-create)
    await this.prisma.periodeAktif.deleteMany({ where: { level, unitId: resolvedUnitId } });

    return this.prisma.periodeAktif.create({
      data: { periodeId, level, unitId: resolvedUnitId },
      select: { id: true, periodeId: true, level: true, unitId: true, createdAt: true },
    });
  }

  /** Hapus periode aktif untuk sebuah unit (unit tidak lagi punya periode aktif eksplisit). */
  async deactivateUnit(level: PeriodeLevel, unitId: string) {
    await this.validateUnit(level, unitId);
    return this.prisma.periodeAktif.deleteMany({ where: { level, unitId } });
  }

  /** Daftar unit yang sedang menggunakan sebuah periode sebagai periode aktifnya. */
  async findUnitsByPeriode(periodeId: string) {
    return this.prisma.periodeAktif.findMany({
      where: { periodeId },
      orderBy: { createdAt: 'asc' },
    });
  }

  private async resolveUnitId(level: PeriodeLevel, unitId?: string | null): Promise<string> {
    if (level === 'nasional' && !unitId) {
      const nasional = await this.prisma.nasional.findFirst({ select: { id: true } });
      if (!nasional) throw new BadRequestException('Nasional belum ditentukan');
      return nasional.id;
    }
    if (!unitId) throw new BadRequestException('unitId wajib diisi untuk level ini');
    return unitId;
  }

  /** Validasi bahwa unitId benar-benar milik level yang sesuai. */
  private async validateUnit(level: PeriodeLevel, unitId: string) {
    const table = level === 'nasional' ? 'nasional' : level === 'distrik' ? 'distrik' : level === 'wilayah' ? 'wilayah' : 'ranting';
    const exists = (await (this.prisma[table] as any).findUnique({ where: { id: unitId } })) as { id: string } | null;
    if (!exists) {
      throw new BadRequestException(`${level} dengan id "${unitId}" tidak ditemukan`);
    }
  }
}
