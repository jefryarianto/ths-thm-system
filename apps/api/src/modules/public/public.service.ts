import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

type Level = 'nasional' | 'distrik' | 'wilayah' | 'ranting';

@Injectable()
export class PublicService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Existing methods ──────────────────────────────────

  async getBerita() {
    return this.prisma.berita.findMany({
      where: { isVisible: true },
      orderBy: { tanggal: 'desc' },
    });
  }

  async getGaleri() {
    return this.prisma.galeri.findMany({
      where: { isVisible: true },
      orderBy: { tanggal: 'desc' },
    });
  }

  async getDonasiProgram() {
    return this.prisma.donasiProgram.findMany({
      where: { isVisible: true },
    });
  }

  async getSejarah() {
    return this.prisma.sejarah.findFirst({
      where: { isVisible: true },
    });
  }

  async getSambutan() {
    return this.prisma.sambutan.findFirst({
      where: { isVisible: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getBeranda() {
    const [sambutan, berita, donasi] = await Promise.all([
      this.getSambutan(),
      this.prisma.berita.findMany({
        where: { isVisible: true },
        orderBy: { tanggal: 'desc' },
        take: 3,
      }),
      this.prisma.donasiProgram.findMany({
        where: { isVisible: true },
        take: 3,
      }),
    ]);

    return {
      sambutan,
      berita,
      donasi,
    };
  }

  async getOrganisasi() {
    return this.prisma.organisasi.findFirst({
      where: { isVisible: true },
    });
  }

  async getBankInfo() {
    return this.prisma.bankInfo.findMany({
      where: { isActive: true },
      orderBy: { bankName: 'asc' },
    });
  }

  async getKepengurusan() {
    return this.prisma.kepengurusan.findMany({
      where: {
        periode: { isActive: true },
      },
      include: {
        user: { select: { namaLengkap: true } },
        jabatan: { select: { nama: true, urutan: true } },
        periode: { select: { nama: true } },
        nasional: { select: { nama: true } },
        distrik: { select: { nama: true } },
        wilayah: { select: { nama: true } },
        ranting: { select: { nama: true } },
      },
      orderBy: {
        jabatan: { urutan: 'asc' },
      },
    });
  }

  // ── Struktur Organisasi Public ─────────────────────────

  async getDistriks() {
    return this.prisma.distrik.findMany({
      where: { isVisible: true },
      select: { id: true, nama: true, kodeDistrik: true },
      orderBy: { nama: 'asc' },
    });
  }

  async getWilayahs(distrikId?: string) {
    const where: Record<string, unknown> = { isVisible: true };
    if (distrikId) where.distrikId = distrikId;

    return this.prisma.wilayah.findMany({
      where,
      select: { id: true, nama: true, kodeWilayah: true, distrikId: true },
      orderBy: { nama: 'asc' },
    });
  }

  async getRantings(wilayahId?: string) {
    const where: Record<string, unknown> = { isVisible: true };
    if (wilayahId) where.wilayahId = wilayahId;

    return this.prisma.ranting.findMany({
      where,
      select: { id: true, nama: true, kodeRanting: true, wilayahId: true },
      orderBy: { nama: 'asc' },
    });
  }

  async getPeriodes(level: Level, unitId?: string) {
    // For all levels, find periods that have kepengurusan records
    const where: Record<string, unknown> = {};

    if (level === 'nasional') {
      where.nasionalId = { not: null };
    } else if (level === 'distrik' && unitId) {
      where.distrikId = unitId;
    } else if (level === 'wilayah' && unitId) {
      where.wilayahId = unitId;
    } else if (level === 'ranting' && unitId) {
      where.rantingId = unitId;
    } else if (unitId) {
      // Has unit but specific level handling already covered above
    } else if (level === 'distrik') {
      where.distrikId = { not: null };
    } else if (level === 'wilayah') {
      where.wilayahId = { not: null };
    } else if (level === 'ranting') {
      where.rantingId = { not: null };
    }

    const periodeIds = await this.prisma.kepengurusan.findMany({
      where,
      select: { periodeId: true },
      distinct: ['periodeId'],
    });

    if (periodeIds.length === 0) return [];

    return this.prisma.periode.findMany({
      where: { id: { in: periodeIds.map((p) => p.periodeId) } },
      select: { id: true, nama: true, tglMulai: true, tglSelesai: true, isActive: true },
      orderBy: { tglMulai: 'desc' },
    });
  }

  async getKepengurusanFiltered(level: Level, unitId?: string, periodeId?: string) {
    // Build where clause based on level
    const where: Record<string, unknown> = {};

    if (level === 'nasional') {
      where.nasionalId = { not: null };
    } else if (level === 'distrik') {
      if (!unitId) throw new BadRequestException('unitId wajib untuk level distrik');
      where.distrikId = unitId;
    } else if (level === 'wilayah') {
      if (!unitId) throw new BadRequestException('unitId wajib untuk level wilayah');
      where.wilayahId = unitId;
    } else if (level === 'ranting') {
      if (!unitId) throw new BadRequestException('unitId wajib untuk level ranting');
      where.rantingId = unitId;
    }

    // Filter by period if provided, otherwise use active period
    if (periodeId) {
      where.periodeId = periodeId;
    } else {
      where.periode = { isActive: true };
    }

    const kepengurusans = await this.prisma.kepengurusan.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            namaLengkap: true,
          },
        },
        jabatan: { select: { id: true, nama: true, urutan: true } },
        periode: { select: { id: true, nama: true, tglMulai: true, tglSelesai: true, isActive: true } },
        nasional: { select: { id: true, nama: true } },
        distrik: { select: { id: true, nama: true } },
        wilayah: { select: { id: true, nama: true } },
        ranting: { select: { id: true, nama: true } },
      },
      orderBy: { jabatan: { urutan: 'asc' } },
    });

    // Get unit info for the info card
    let unitInfo: Record<string, unknown> | null = null;
    let memberCount = 0;

    if (level === 'nasional') {
      const nasional = await this.prisma.nasional.findFirst({ where: { id: unitId || undefined } });
      unitInfo = nasional;
    } else if (level === 'distrik' && unitId) {
      unitInfo = await this.prisma.distrik.findUnique({ where: { id: unitId } });
      // Count members in all rantings under this distrik
      const wilayahs = await this.prisma.wilayah.findMany({
        where: { distrikId: unitId },
        select: { id: true },
      });
      const rantings = await this.prisma.ranting.findMany({
        where: { wilayahId: { in: wilayahs.map((w) => w.id) } },
        select: { id: true },
      });
      if (rantings.length > 0) {
        memberCount = await this.prisma.anggota.count({
          where: { rantingId: { in: rantings.map((r) => r.id) } },
        });
      }
    } else if (level === 'wilayah' && unitId) {
      unitInfo = await this.prisma.wilayah.findUnique({ where: { id: unitId } });
      const rantings = await this.prisma.ranting.findMany({
        where: { wilayahId: unitId },
        select: { id: true },
      });
      if (rantings.length > 0) {
        memberCount = await this.prisma.anggota.count({
          where: { rantingId: { in: rantings.map((r) => r.id) } },
        });
      }
    } else if (level === 'ranting' && unitId) {
      unitInfo = await this.prisma.ranting.findUnique({ where: { id: unitId } });
      memberCount = await this.prisma.anggota.count({
        where: { rantingId: unitId },
      });
    }

    const activePeriode = kepengurusans[0]?.periode;

    return {
      unitInfo,
      unitLevel: level,
      periode: activePeriode || null,
      pengurusCount: kepengurusans.length,
      memberCount,
      pengurus: kepengurusans.map((k) => ({
        id: k.id,
        nama: k.user?.namaLengkap || '-',
        fotoPath: null,
        jabatan: k.jabatan.nama,
        jabatanUrutan: k.jabatan.urutan,
        parentId: k.parentId,
        status: 'aktif',
        distrik: k.distrik?.nama || null,
        wilayah: k.wilayah?.nama || null,
        ranting: k.ranting?.nama || null,
        nasional: k.nasional?.nama || null,
      })),
    };
  }

  async searchKepengurusan(q: string) {
    if (!q || q.trim().length < 2) return [];

    const search = q.trim();

    const results = await this.prisma.kepengurusan.findMany({
      where: {
        OR: [
          {
            user: { namaLengkap: { contains: search, mode: 'insensitive' } },
          },
          {
            jabatan: { nama: { contains: search, mode: 'insensitive' } },
          },
        ],
      },
      include: {
        user: { select: { id: true, namaLengkap: true } },
        jabatan: { select: { nama: true } },
        periode: { select: { nama: true, isActive: true } },
        nasional: { select: { id: true, nama: true } },
        distrik: { select: { id: true, nama: true } },
        wilayah: { select: { id: true, nama: true } },
        ranting: { select: { id: true, nama: true } },
      },
      take: 20,
    });

    return results.map((k) => ({
      id: k.id,
      nama: k.user?.namaLengkap || '-',
      fotoPath: null,
      jabatan: k.jabatan.nama,
      periode: k.periode.nama,
      periodeId: k.periodeId,
      level: k.rantingId ? 'ranting' : k.wilayahId ? 'wilayah' : k.distrikId ? 'distrik' : 'nasional',
      unitId: k.rantingId || k.wilayahId || k.distrikId || k.nasionalId,
      unitName: k.ranting?.nama || k.wilayah?.nama || k.distrik?.nama || k.nasional?.nama || '-',
    }));
  }

  async getUnitChildren(level: Level, unitId: string) {
    if (level === 'nasional') {
      const distriks = await this.prisma.distrik.findMany({
        where: { isVisible: true },
        select: { id: true, nama: true, kodeDistrik: true },
        orderBy: { nama: 'asc' },
      });
      return { level: 'distrik', items: distriks };
    }

    if (level === 'distrik') {
      const wilayahs = await this.prisma.wilayah.findMany({
        where: { distrikId: unitId, isVisible: true },
        select: { id: true, nama: true, kodeWilayah: true },
        orderBy: { nama: 'asc' },
      });
      return { level: 'wilayah', items: wilayahs };
    }

    if (level === 'wilayah') {
      const rantings = await this.prisma.ranting.findMany({
        where: { wilayahId: unitId, isVisible: true },
        select: { id: true, nama: true, kodeRanting: true },
        orderBy: { nama: 'asc' },
      });
      return { level: 'ranting', items: rantings };
    }

    // Ranting has no children
    return { level: null, items: [] };
  }
}
