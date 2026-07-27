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
    return { data };
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
    return { data };
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
    return { data, message: 'Ujian praktek berhasil dibuat' };
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
    return { data, message: 'Ujian praktek berhasil diperbarui' };
  }

  async remove(id: string) {
    const existing = await this.prisma.ujianPraktek.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Ujian praktek tidak ditemukan');
    await this.prisma.ujianPraktek.delete({ where: { id } });
    return { message: 'Ujian praktek berhasil dihapus' };
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
      return { data, message: 'Penguji berhasil ditambahkan' };
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
    return { message: 'Penguji berhasil dihapus' };
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
      return { data, message: 'Item penilaian berhasil ditambahkan' };
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
    return { message: 'Item penilaian berhasil dihapus' };
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
    return { data };
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

    return {
      data: { scored: results.length },
      message: `${results.length} nilai berhasil disimpan`,
    };
  }

  // ─── Available Assessment Items ──────────────────────────

  async getAvailableItems() {
    const data = await this.prisma.itemPenilaian.findMany({
      where: { isActive: true },
      include: { aspek: true },
      orderBy: [{ aspek: { namaAspek: 'asc' } }, { urutan: 'asc' }],
    });
    return { data };
  }

  async getAvailableExaminers(kegiatanId: string) {
    // Get examiners already assigned to this kegiatan, plus all users with penguji role
    const [assigned, allPenguji] = await Promise.all([
      this.prisma.penugasanPenguji.findMany({
        where: { kegiatanId },
        select: { pengujiUser: { select: { id: true, namaLengkap: true, email: true } } },
      }),
      this.prisma.user.findMany({
        where: { role: 'penguji', isActive: true },
        select: { id: true, namaLengkap: true, email: true, role: true },
      }),
    ]);

    return {
      data: {
        assignedToKegiatan: assigned.map((a) => a.pengujiUser),
        allPenguji,
      },
    };
  }
}
