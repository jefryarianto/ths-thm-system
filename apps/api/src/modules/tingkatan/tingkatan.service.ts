import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTingkatanDto, UpdateTingkatanDto } from './dto/tingkatan.dto';

export interface LevelVisual {
  stripCount: number;
  color: string;
  label: string;
}

/**
 * Fallback bawaan bila tabel `tingkatan` belum ter-seed (sama dengan seeder).
 * Dipakai untuk kartu digital agar selalu ada nilai visual.
 */
export const DEFAULT_TINGKATAN: Record<string, LevelVisual> = {
  Anggota: { stripCount: 0, color: '#94a3b8', label: 'Tanpa strip' },
  Pratama: { stripCount: 1, color: '#1d4ed8', label: 'Biru 1' },
  Tamtama: { stripCount: 2, color: '#1d4ed8', label: 'Biru 2' },
  Muda:    { stripCount: 1, color: '#ca8a04', label: 'Kuning 1' },
  Madya:   { stripCount: 2, color: '#ca8a04', label: 'Kuning 2' },
  Utama:   { stripCount: 3, color: '#ca8a04', label: 'Kuning 3' },
};

@Injectable()
export class TingkatanService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.tingkatan.findMany({
      orderBy: [{ urutan: 'asc' }, { nama: 'asc' }],
    });
  }

  async create(dto: CreateTingkatanDto) {
    const maxUrutan = await this.prisma.tingkatan.aggregate({ _max: { urutan: true } });
    return this.prisma.tingkatan.create({
      data: {
        nama: dto.nama,
        stripCount: dto.stripCount ?? 0,
        stripWarna: dto.stripWarna || '#94a3b8',
        urutan: dto.urutan ?? (maxUrutan._max.urutan ?? 0) + 1,
      },
    });
  }

  async update(id: string, dto: UpdateTingkatanDto) {
    const existing = await this.prisma.tingkatan.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Tingkatan tidak ditemukan');
    return this.prisma.tingkatan.update({
      where: { id },
      data: {
        ...(dto.nama !== undefined && { nama: dto.nama }),
        ...(dto.stripCount !== undefined && { stripCount: dto.stripCount }),
        ...(dto.stripWarna !== undefined && { stripWarna: dto.stripWarna }),
        ...(dto.urutan !== undefined && { urutan: dto.urutan }),
      },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.tingkatan.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Tingkatan tidak ditemukan');
    await this.prisma.tingkatan.delete({ where: { id } });
    return { deleted: true };
  }

  /**
   * Resolve visual strip untuk satu tingkat. Prioritas dari tabel `tingkatan`,
   * fallback ke DEFAULT_TINGKATAN bila tabel belum ter-seed / tingkat tak dikenal.
   */
  async resolveLevelVisual(tingkat?: string | null): Promise<LevelVisual> {
    if (!tingkat) return DEFAULT_TINGKATAN.Anggota;
    try {
      const row = await this.prisma.tingkatan.findUnique({ where: { nama: tingkat } });
      if (row) {
        return {
          stripCount: row.stripCount,
          color: row.stripWarna,
          label: row.stripCount === 0 ? 'Tanpa strip' : `${row.stripWarna} x${row.stripCount}`,
        };
      }
    } catch {
      // tabel belum migrate — lanjut ke fallback
    }
    return DEFAULT_TINGKATAN[tingkat] || DEFAULT_TINGKATAN.Anggota;
  }

  /** Mapping lengkap tingkat → visual untuk konsumsi web/mobile (cached per request). */
  async getAllLevelVisuals(): Promise<Record<string, LevelVisual>> {
    try {
      const rows = await this.prisma.tingkatan.findMany({ orderBy: [{ urutan: 'asc' }] });
      if (rows.length === 0) return { ...DEFAULT_TINGKATAN };
      const map: Record<string, LevelVisual> = {};
      for (const r of rows) {
        map[r.nama] = {
          stripCount: r.stripCount,
          color: r.stripWarna,
          label: r.stripCount === 0 ? 'Tanpa strip' : `${r.nama} (${r.stripCount} balok)`,
        };
      }
      return map;
    } catch {
      return { ...DEFAULT_TINGKATAN };
    }
  }
}
