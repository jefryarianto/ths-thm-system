import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/services/cache.service';
import {
  CreateDistrikDto,
  UpdateDistrikDto,
  CreateWilayahDto,
  UpdateWilayahDto,
  CreateRantingDto,
  UpdateRantingDto,
} from './dto/org-structure.dto';

export interface ImportOrgRow {
  distrik: string;
  wilayah?: string;
  ranting?: string;
  lokasiLatihan?: string;
}

@Injectable()
export class OrgStructureService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  // ─── DISTRIK ───

  async getAllDistrik() {
    return await this.cache.getOrSet(
      'distrik:all',
      async () => {
        const data = await this.prisma.distrik.findMany({
          orderBy: { nama: 'asc' },
          include: { _count: { select: { wilayahs: true } } },
        });
        return data;
      },
      60_000,
    );
  }

  async getDistrik(id: string) {
    const data = await this.prisma.distrik.findUnique({
      where: { id },
      include: {
        wilayahs: {
          include: { _count: { select: { rantings: true } } },
          orderBy: { nama: 'asc' },
        },
        _count: { select: { wilayahs: true } },
      },
    });
    if (!data) throw new NotFoundException('Distrik tidak ditemukan');
    return data;
  }

  async createDistrik(dto: CreateDistrikDto) {
    const nasional = await this.prisma.nasional.findFirst();
    const data = await this.prisma.distrik.create({
      data: {
        kodeDistrik: dto.kodeDistrik,
        nama: dto.nama,
        alamat: dto.alamat,
        nasionalId: dto.nasionalId || nasional?.id || 'seed',
      },
    });
    this.cache.invalidatePrefix('distrik:all');
    return data;
  }

  async updateDistrik(id: string, dto: UpdateDistrikDto) {
    const existing = await this.prisma.distrik.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Distrik tidak ditemukan');

    const data = await this.prisma.distrik.update({ where: { id }, data: dto });
    this.cache.invalidatePrefix('distrik:all');
    return data;
  }

  async deleteDistrik(id: string) {
    const existing = await this.prisma.distrik.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Distrik tidak ditemukan');

    // Cascade: wilayah, ranting, anggota, calon, latihan, kepengurusan, unit latihan
    // serta seluruh data terkait ikut terhapus (lihat onDelete pada schema).
    await this.prisma.distrik.delete({ where: { id } });
    this.cache.invalidatePrefix('distrik:all');
  }

  // ─── WILAYAH ───

  async getAllWilayah(distrikId?: string) {
    const cacheKey = distrikId ? `wilayah:all:${distrikId}` : 'wilayah:all';
    return await this.cache.getOrSet(
      cacheKey,
      async () => {
        const where = distrikId ? { distrikId } : {};
        const data = await this.prisma.wilayah.findMany({
          where,
          orderBy: { nama: 'asc' },
          include: {
            distrik: { select: { id: true, nama: true } },
            _count: { select: { rantings: true } },
          },
        });
        return data;
      },
      60_000,
    );
  }

  async getWilayah(id: string) {
    const data = await this.prisma.wilayah.findUnique({
      where: { id },
      include: {
        distrik: { select: { id: true, nama: true } },
        rantings: {
          include: { _count: { select: { anggota: true } } },
          orderBy: { nama: 'asc' },
        },
      },
    });
    if (!data) throw new NotFoundException('Wilayah tidak ditemukan');
    return data;
  }

  async createWilayah(dto: CreateWilayahDto) {
    const data = await this.prisma.wilayah.create({ data: dto });
    this.cache.invalidatePrefix('wilayah:all');
    return data;
  }

  async updateWilayah(id: string, dto: UpdateWilayahDto) {
    const existing = await this.prisma.wilayah.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Wilayah tidak ditemukan');

    const data = await this.prisma.wilayah.update({ where: { id }, data: dto });
    this.cache.invalidatePrefix('wilayah:all');
    return data;
  }

  async deleteWilayah(id: string) {
    const existing = await this.prisma.wilayah.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Wilayah tidak ditemukan');

    // Cascade: ranting, anggota, calon, latihan, kepengurusan beserta data terkait.
    await this.prisma.wilayah.delete({ where: { id } });
    this.cache.invalidatePrefix('wilayah:all');
  }

  // ─── RANTING ───

  async getAllRanting(wilayahId?: string) {
    const cacheKey = wilayahId ? `ranting:all:${wilayahId}` : 'ranting:all';
    return await this.cache.getOrSet(
      cacheKey,
      async () => {
        const where = wilayahId ? { wilayahId } : {};
        const data = await this.prisma.ranting.findMany({
          where,
          orderBy: { nama: 'asc' },
          include: {
            wilayah: { select: { id: true, nama: true, distrik: { select: { id: true, nama: true } } } },
            _count: { select: { anggota: true } },
          },
        });
        return data;
      },
      60_000,
    );
  }

  async getRanting(id: string) {
    const data = await this.prisma.ranting.findUnique({
      where: { id },
      include: {
        wilayah: { select: { id: true, nama: true, distrik: { select: { id: true, nama: true } } } },
        _count: { select: { anggota: true, calonAnggotas: true } },
      },
    });
    if (!data) throw new NotFoundException('Ranting tidak ditemukan');
    return data;
  }

  async createRanting(dto: CreateRantingDto) {
    const data = await this.prisma.ranting.create({ data: dto });
    this.cache.invalidatePrefix('ranting:all');
    return data;
  }

  async updateRanting(id: string, dto: UpdateRantingDto) {
    const existing = await this.prisma.ranting.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Ranting tidak ditemukan');

    const data = await this.prisma.ranting.update({ where: { id }, data: dto });
    this.cache.invalidatePrefix('ranting:all');
    return data;
  }

  async deleteRanting(id: string) {
    const existing = await this.prisma.ranting.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Ranting tidak ditemukan');

    // Cascade: anggota, calon, latihan, kepengurusan beserta seluruh data terkait
    // (iuran, klaim, dokumen, absensi, pendadaran, chat, forum, gamification, QR, dll).
    await this.prisma.ranting.delete({ where: { id } });
    this.cache.invalidatePrefix('ranting:all');
  }

  // ─── IMPORT ORGANIZATION DATA ───

  /**
   * Import struktur organisasi dari daftar baris { distrik, wilayah?, ranting? }.
   * Upsert berdasarkan nama (case-insensitive) — data yang sudah ada dilewati.
   * Kode (kodeDistrik/kodeWilayah/kodeRanting) digenerate otomatis jika belum ada.
   */
  async importOrg(data: ImportOrgRow[]) {
    const nasional = await this.prisma.nasional.findFirst();

    // Muat nama yang sudah ada sekaligus; pencocokan case-insensitive dilakukan
    // di JS (hindari ketergantungan pada fitur Prisma mode:'insensitive').
    const distrikMap = new Map<string, string>(); // nama.toLowerCase() -> id
    for (const d of await this.prisma.distrik.findMany({ select: { id: true, nama: true } })) {
      distrikMap.set(d.nama.toLowerCase(), d.id);
    }
    const wilayahMap = new Map<string, string>(); // `${distrikId}:${nama.toLowerCase()}` -> id
    for (const w of await this.prisma.wilayah.findMany({ select: { id: true, nama: true, distrikId: true } })) {
      wilayahMap.set(`${w.distrikId}:${w.nama.toLowerCase()}`, w.id);
    }
    const rantingMap = new Map<string, string>(); // `${wilayahId}:${nama.toLowerCase()}` -> id
    for (const r of await this.prisma.ranting.findMany({ select: { id: true, nama: true, wilayahId: true } })) {
      rantingMap.set(`${r.wilayahId}:${r.nama.toLowerCase()}`, r.id);
    }

    let importedDistrik = 0;
    let importedWilayah = 0;
    let importedRanting = 0;
    let skipped = 0;

    for (const row of data) {
      const distrikName = row.distrik?.trim();
      if (!distrikName) {
        skipped++;
        continue;
      }
      const wilayahName = row.wilayah?.trim();
      const rantingName = row.ranting?.trim();

      // ── Distrik (upsert by nama) ──
      let distrikId = distrikMap.get(distrikName.toLowerCase());
      if (!distrikId) {
        const created = await this.prisma.distrik.create({
          data: {
            kodeDistrik: await this.nextKode('distrik', 'D'),
            nama: distrikName,
            nasionalId: nasional?.id || 'seed',
          },
        });
        distrikId = created.id;
        distrikMap.set(distrikName.toLowerCase(), distrikId);
        importedDistrik++;
      }

      if (!wilayahName) {
        // Baris hanya berisi distrik — sudah diproses (distrik dibuat/ditemukan).
        continue;
      }

      // ── Wilayah (upsert by nama dalam distrik) ──
      let wilayahId = wilayahMap.get(`${distrikId}:${wilayahName.toLowerCase()}`);
      if (!wilayahId) {
        const created = await this.prisma.wilayah.create({
          data: {
            kodeWilayah: await this.nextKode('wilayah', 'W'),
            nama: wilayahName,
            distrikId,
          },
        });
        wilayahId = created.id;
        wilayahMap.set(`${distrikId}:${wilayahName.toLowerCase()}`, wilayahId);
        importedWilayah++;
      }

      if (!rantingName) {
        // Baris hanya berisi distrik + wilayah — sudah diproses.
        continue;
      }

      // ── Ranting (upsert by nama dalam wilayah) ──
      const rantingKey = `${wilayahId}:${rantingName.toLowerCase()}`;
      if (!rantingMap.has(rantingKey)) {
        await this.prisma.ranting.create({
          data: {
            kodeRanting: await this.nextKode('ranting', 'R'),
            nama: rantingName,
            wilayahId,
            lokasiLatihan: row.lokasiLatihan?.trim() || null,
          },
        });
        rantingMap.set(rantingKey, wilayahId);
        importedRanting++;
      } else {
        skipped++;
      }
    }

    if (importedDistrik > 0) this.cache.invalidatePrefix('distrik:all');
    if (importedWilayah > 0) this.cache.invalidatePrefix('wilayah:all');
    if (importedRanting > 0) this.cache.invalidatePrefix('ranting:all');

    return { importedDistrik, importedWilayah, importedRanting, skipped, total: data.length };
  }

  /** Generate kode unik berikutnya (mis. D001, D002, …) berdasarkan kode yang sudah terpakai. */
  private async nextKode(
    model: 'distrik' | 'wilayah' | 'ranting',
    prefix: string,
  ): Promise<string> {
    const field =
      model === 'distrik'
        ? 'kodeDistrik'
        : model === 'wilayah'
          ? 'kodeWilayah'
          : 'kodeRanting';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const all = await (this.prisma[model] as any).findMany({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      select: { [field]: true } as any,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const used = new Set(all.map((x: any) => x[field] as string));
    let i = 1;
    let kode = `${prefix}${String(i).padStart(3, '0')}`;
    while (used.has(kode)) {
      i++;
      kode = `${prefix}${String(i).padStart(3, '0')}`;
    }
    return kode;
  }

  // ─── ORGANIZATION TREE ───

  async getOrgTree() {
    const data = await this.prisma.distrik.findMany({
      orderBy: { nama: 'asc' },
      include: {
        wilayahs: {
          orderBy: { nama: 'asc' },
          include: {
            rantings: {
              orderBy: { nama: 'asc' },
              include: { _count: { select: { anggota: true } } },
            },
          },
        },
      },
    });
    return { success: true, data };
  }
}
