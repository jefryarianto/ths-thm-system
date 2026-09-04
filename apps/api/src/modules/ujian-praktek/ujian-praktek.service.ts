import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateUjianPraktekDto,
  UpdateUjianPraktekDto,
  AssignExaminerDto,
  RemoveExaminerDto,
  AssignItemDto,
  BulkScoreDto,
} from './dto/ujian-praktek.dto';

@Injectable()
export class UjianPraktekService {
  private readonly logger = new Logger(UjianPraktekService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── CRUD ────────────────────────────────────────────────

  async findByKegiatan(kegiatanId: string) {
    const data = await this.prisma.ujianPraktek.findMany({
      where: { kegiatanId },
      include: {
        penilais: {
          include: { pengujiUser: { select: { id: true, namaLengkap: true, email: true } } },
        },
        items: {
          include: { itemPenilaian: { include: { aspek: true } } },
          orderBy: { urutan: 'asc' },
        },
        _count: { select: { penilaians: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    return data;
  }

  async findOne(id: string) {
    const data = await this.prisma.ujianPraktek.findUnique({
      where: { id },
      include: {
        kegiatan: { select: { id: true, nama: true, status: true } },
        penilais: {
          include: { pengujiUser: { select: { id: true, namaLengkap: true, email: true } } },
        },
        items: {
          include: { itemPenilaian: { include: { aspek: true } } },
          orderBy: { urutan: 'asc' },
        },
        _count: { select: { penilaians: true } },
      },
    });
    if (!data) throw new NotFoundException('Ujian praktek tidak ditemukan');
    return data;
  }

  async create(kegiatanId: string, dto: CreateUjianPraktekDto) {
    const kegiatan = await this.prisma.kegiatan.findUnique({ where: { id: kegiatanId } });
    if (!kegiatan) throw new NotFoundException('Kegiatan tidak ditemukan');

    const data = await this.prisma.ujianPraktek.create({
      data: {
        kegiatanId,
        nama: dto.nama,
        deskripsi: dto.deskripsi,
        tanggal: dto.tanggal ? new Date(dto.tanggal) : null,
        durasiMenit: dto.durasiMenit,
        status: 'draft',
      },
    });
    return data;
  }

  async update(id: string, dto: UpdateUjianPraktekDto) {
    const existing = await this.prisma.ujianPraktek.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Ujian praktek tidak ditemukan');

    const updateData: Record<string, unknown> = {};
    if (dto.nama !== undefined) updateData.nama = dto.nama;
    if (dto.deskripsi !== undefined) updateData.deskripsi = dto.deskripsi;
    if (dto.tanggal !== undefined) updateData.tanggal = new Date(dto.tanggal);
    if (dto.durasiMenit !== undefined) updateData.durasiMenit = dto.durasiMenit;
    if (dto.status !== undefined) updateData.status = dto.status;

    const data = await this.prisma.ujianPraktek.update({ where: { id }, data: updateData });
    return data;
  }

  async remove(id: string) {
    const existing = await this.prisma.ujianPraktek.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Ujian praktek tidak ditemukan');
    await this.prisma.ujianPraktek.delete({ where: { id } });
    // void — interceptor returns { success: true }
  }

  // ─── Examiner Management ─────────────────────────────────

  async assignExaminer(ujianPraktekId: string, dto: AssignExaminerDto) {
    const ujian = await this.prisma.ujianPraktek.findUnique({ where: { id: ujianPraktekId } });
    if (!ujian) throw new NotFoundException('Ujian praktek tidak ditemukan');

    const user = await this.prisma.user.findUnique({ where: { id: dto.pengujiUserId } });
    if (!user) throw new NotFoundException('User tidak ditemukan');

    try {
      const data = await this.prisma.ujianPraktekPenilai.create({
        data: {
          ujianPraktekId,
          pengujiUserId: dto.pengujiUserId,
          catatan: dto.catatan,
        },
        include: { pengujiUser: { select: { id: true, namaLengkap: true, email: true } } },
      });
      return data;
    } catch (err: unknown) {
      if ((err as { code?: string }).code === 'P2002') {
        throw new BadRequestException('Penguji sudah ditugaskan ke ujian ini');
      }
      throw err;
    }
  }

  async removeExaminer(ujianPraktekId: string, dto: RemoveExaminerDto) {
    const existing = await this.prisma.ujianPraktekPenilai.findUnique({
      where: { ujianPraktekId_pengujiUserId: { ujianPraktekId, pengujiUserId: dto.pengujiUserId } },
    });
    if (!existing) throw new NotFoundException('Penugasan penguji tidak ditemukan');
    await this.prisma.ujianPraktekPenilai.delete({ where: { id: existing.id } });
    // void — interceptor returns { success: true }
  }

  // ─── Assessment Items Management ─────────────────────────

  async assignItem(ujianPraktekId: string, dto: AssignItemDto) {
    const ujian = await this.prisma.ujianPraktek.findUnique({ where: { id: ujianPraktekId } });
    if (!ujian) throw new NotFoundException('Ujian praktek tidak ditemukan');

    const item = await this.prisma.itemPenilaian.findUnique({ where: { id: dto.itemPenilaianId } });
    if (!item) throw new NotFoundException('Item penilaian tidak ditemukan');

    try {
      const data = await this.prisma.ujianPraktekItem.create({
        data: {
          ujianPraktekId,
          itemPenilaianId: dto.itemPenilaianId,
          urutan: dto.urutan ?? 0,
        },
        include: { itemPenilaian: { include: { aspek: true } } },
      });
      return data;
    } catch (err: unknown) {
      if ((err as { code?: string }).code === 'P2002') {
        throw new BadRequestException('Item penilaian sudah ditambahkan');
      }
      throw err;
    }
  }

  async removeItem(ujianPraktekId: string, itemPenilaianId: string) {
    const existing = await this.prisma.ujianPraktekItem.findUnique({
      where: { ujianPraktekId_itemPenilaianId: { ujianPraktekId, itemPenilaianId } },
    });
    if (!existing) throw new NotFoundException('Item penilaian tidak ditemukan');
    await this.prisma.ujianPraktekItem.delete({ where: { id: existing.id } });
    // void — interceptor returns { success: true }
  }

  // ─── Scoring ─────────────────────────────────────────────

  async getScores(ujianPraktekId: string) {
    const data = await this.prisma.nilaiPendadaran.findMany({
      where: { ujianPraktekId },
      include: {
        calonAnggota: { select: { id: true, namaLengkap: true, ranting: { select: { nama: true } } } },
        itemPenilaian: { select: { id: true, namaItem: true, skorMaksimal: true, bobot: true } },
        penguji: { select: { id: true, namaLengkap: true } },
      },
      orderBy: [{ calonAnggotaId: 'asc' }, { createdAt: 'asc' }],
    });
    return data;
  }

  async scoreCandidate(ujianPraktekId: string, dto: BulkScoreDto, pengujiUserId: string) {
    const ujian = await this.prisma.ujianPraktek.findUnique({ where: { id: ujianPraktekId } });
    if (!ujian) throw new NotFoundException('Ujian praktek tidak ditemukan');
    if (ujian.status === 'selesai' || ujian.status === 'dibatalkan') {
      throw new BadRequestException('Ujian praktek sudah selesai atau dibatalkan');
    }

    const results: Array<{ calonAnggotaId: string; itemPenilaianId: string; skor: number }> = [];

    for (const scoreDto of dto.scores) {
      for (const item of scoreDto.items) {
        // Upsert: create or update the score for this candidate/item/penguji combination
        const where = {
          kegiatanId_ujianPraktekId_calonAnggotaId_itemPenilaianId_pengujiUserId: {
            kegiatanId: ujian.kegiatanId,
            ujianPraktekId,
            calonAnggotaId: scoreDto.calonAnggotaId,
            itemPenilaianId: item.itemPenilaianId,
            pengujiUserId,
          },
        };
        const existing = await this.prisma.nilaiPendadaran.findFirst({
          where: {
            kegiatanId: ujian.kegiatanId,
            ujianPraktekId,
            calonAnggotaId: scoreDto.calonAnggotaId,
            itemPenilaianId: item.itemPenilaianId,
            pengujiUserId,
          },
        });

        if (existing) {
          await this.prisma.nilaiPendadaran.update({
            where: { id: existing.id },
            data: { skor: item.skor, komentar: item.komentar },
          });
        } else {
          await this.prisma.nilaiPendadaran.create({
            data: {
              kegiatanId: ujian.kegiatanId,
              ujianPraktekId,
              calonAnggotaId: scoreDto.calonAnggotaId,
              itemPenilaianId: item.itemPenilaianId,
              pengujiUserId,
              skor: item.skor,
              komentar: item.komentar,
            },
          });
        }

        results.push({
          calonAnggotaId: scoreDto.calonAnggotaId,
          itemPenilaianId: item.itemPenilaianId,
          skor: item.skor,
        });
      }
    }

    return { scored: results.length };
  }

  // ─── Available Assessment Items ──────────────────────────

  /**
   * Item penilaian yang bisa dipakai ujian dalam pendadaran ini:
   * utamakan set milik pendadaran (hasil clone template); bila pendadaran
   * belum punya set sendiri (legacy), fallback ke template global.
   * Hanya aspek & item AKTIF — item yang disembunyikan tidak ditawarkan.
   */
  async getAvailableItems(kegiatanId: string) {
    const owned = await this.prisma.aspekPenilaian.count({
      where: { kegiatanId, isActive: true },
    });
    const scopeKegiatanId = owned > 0 ? kegiatanId : null;
    return this.prisma.itemPenilaian.findMany({
      where: { isActive: true, aspek: { kegiatanId: scopeKegiatanId, isActive: true } },
      include: { aspek: true },
      orderBy: [{ aspek: { namaAspek: 'asc' } }, { urutan: 'asc' }],
    });
  }

  async getAvailableExaminers(kegiatanId: string) {
    // Get examiners already assigned (approved) to this kegiatan, plus all users with penguji role
    const [assigned, allPenguji] = await Promise.all([
      this.prisma.penugasanPenguji.findMany({
        where: { kegiatanId, status: 'approved' },
        select: {
          pengujiUser: { select: { id: true, namaLengkap: true, email: true, role: true } },
        },
      }),
      this.prisma.user.findMany({
        where: { role: 'penguji', isActive: true },
        select: { id: true, namaLengkap: true, email: true, role: true },
      }),
    ]);

    // Gabungkan penguji dari daftar hadir (bukan role=penguji) yang sudah disetujui
    // untuk kegiatan ini agar bisa ditugaskan ke sesi ujian praktek.
    const merged = new Map(allPenguji.map((u) => [u.id, u]));
    for (const a of assigned) {
      if (a.pengujiUser.role !== 'penguji' && !merged.has(a.pengujiUser.id)) {
        merged.set(a.pengujiUser.id, a.pengujiUser);
      }
    }

    return {
      assignedToKegiatan: assigned.map((a) => a.pengujiUser),
      allPenguji: Array.from(merged.values()),
    };
  }

  // ─── Sesi Ujian per Peserta (timer otoritatif dari server) ──
  // Aturan: 1 peserta = 1 sesi (dijaga unique constraint). Default 30 menit,
  // penguji bisa menambah +10 menit SEKALI. Waktu hanya pedoman — input nilai
  // TIDAK diblokir setelah waktu habis.

  private async getUjianOrThrow(id: string) {
    const ujian = await this.prisma.ujianPraktek.findUnique({ where: { id } });
    if (!ujian) throw new NotFoundException('Ujian praktek tidak ditemukan');
    return ujian;
  }

  /** Hitung metadata timer dari timestamp server (sisaDetik bisa negatif). */
  private withTimer<T extends { mulaiAt: Date | null; selesaiAt: Date | null; durasiStandarMenit: number; tambahanMenit: number }>(
    sesi: T,
  ) {
    const durasiTotalMenit = sesi.durasiStandarMenit + sesi.tambahanMenit;
    const batasAt =
      sesi.mulaiAt ? new Date(sesi.mulaiAt.getTime() + durasiTotalMenit * 60_000) : null;
    const sisaDetik =
      sesi.mulaiAt && !sesi.selesaiAt && batasAt
        ? Math.floor((batasAt.getTime() - Date.now()) / 1000)
        : null;
    return {
      ...sesi,
      durasiTotalMenit,
      batasAt,
      sisaDetik,
      waktuHabis: sisaDetik !== null && sisaDetik <= 0,
    };
  }

  /** Daftar sesi semua peserta pada satu ujian + sisa waktu live. */
  async getSesi(ujianPraktekId: string) {
    await this.getUjianOrThrow(ujianPraktekId);
    const rows = await this.prisma.sesiUjianPeserta.findMany({
      where: { ujianPraktekId },
      include: { calonAnggota: { select: { id: true, namaLengkap: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((s) => this.withTimer(s));
  }

  /** Mulai sesi peserta (sekali — sesi kedua ditolak). */
  async startSesi(
    ujianPraktekId: string,
    calonAnggotaId: string,
    userId?: string,
    durasiStandarMenit?: number,
  ) {
    const ujian = await this.getUjianOrThrow(ujianPraktekId);
    if (ujian.status === 'selesai' || ujian.status === 'dibatalkan') {
      throw new BadRequestException('Ujian praktek sudah selesai atau dibatalkan');
    }

    const calon = await this.prisma.calonAnggota.findUnique({
      where: { id: calonAnggotaId },
      select: { id: true },
    });
    if (!calon) throw new NotFoundException('Calon anggota tidak ditemukan');

    try {
      const sesi = await this.prisma.sesiUjianPeserta.create({
        data: {
          ujianPraktekId,
          calonAnggotaId,
          durasiStandarMenit: durasiStandarMenit ?? ujian.durasiMenit ?? 30,
          mulaiAt: new Date(),
          status: 'berlangsung',
        },
        include: { calonAnggota: { select: { id: true, namaLengkap: true } } },
      });
      this.logger.log(`Sesi ujian dimulai (ujian ${ujianPraktekId}, calon ${calonAnggotaId}, oleh ${userId ?? 'system'})`);
      return this.withTimer(sesi);
    } catch (err) {
      if ((err as { code?: string }).code === 'P2002') {
        throw new BadRequestException(
          'Peserta sudah memiliki sesi — ujian hanya menggunakan 1 sesi',
        );
      }
      throw err;
    }
  }

  /** Tambah waktu +10 menit — maksimal SEKALI per peserta. */
  async extendSesi(ujianPraktekId: string, calonAnggotaId: string, userId?: string) {
    const sesi = await this.prisma.sesiUjianPeserta.findUnique({
      where: { ujianPraktekId_calonAnggotaId: { ujianPraktekId, calonAnggotaId } },
    });
    if (!sesi) throw new NotFoundException('Sesi belum dimulai untuk peserta ini');
    if (sesi.status === 'selesai') {
      throw new BadRequestException('Sesi sudah selesai — tidak bisa menambah waktu');
    }
    if (sesi.tambahanMenit >= 10) {
      throw new BadRequestException('Tambahan waktu (+10 menit) sudah digunakan');
    }

    const updated = await this.prisma.sesiUjianPeserta.update({
      where: { id: sesi.id },
      data: { tambahanMenit: sesi.tambahanMenit + 10, diperpanjangOleh: userId },
      include: { calonAnggota: { select: { id: true, namaLengkap: true } } },
    });
    return this.withTimer(updated);
  }

  /** Akhiri sesi (opsional — waktu hanya pedoman). */
  async finishSesi(ujianPraktekId: string, calonAnggotaId: string) {
    const sesi = await this.prisma.sesiUjianPeserta.findUnique({
      where: { ujianPraktekId_calonAnggotaId: { ujianPraktekId, calonAnggotaId } },
    });
    if (!sesi) throw new NotFoundException('Sesi belum dimulai untuk peserta ini');
    if (sesi.status === 'selesai') {
      return this.withTimer(sesi);
    }

    const updated = await this.prisma.sesiUjianPeserta.update({
      where: { id: sesi.id },
      data: { status: 'selesai', selesaiAt: new Date() },
      include: { calonAnggota: { select: { id: true, namaLengkap: true } } },
    });
    return this.withTimer(updated);
  }
}
