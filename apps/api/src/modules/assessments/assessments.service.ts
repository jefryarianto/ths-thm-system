import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAspectDto, UpdateAspectDto, CreateItemDto, UpdateItemDto, CreateScoreDto, ScoreFilterDto, AssessmentFilterDto } from './dto/assessment.dto';
import { UserScope } from '../../common/interfaces/user-scope.interface';
import { ScopeHelper } from '../../common/utils/scope-helpers';

@Injectable()
export class AssessmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeHelper: ScopeHelper,
  ) {}

  async getAspects(query: AssessmentFilterDto) {
    const data = await this.prisma.aspekPenilaian.findMany({ include: { itemPenilaian: true } });
    return { success: true, data };
  }

  async getAspect(id: string) {
    const aspect = await this.prisma.aspekPenilaian.findUnique({ where: { id }, include: { itemPenilaian: true } });
    if (!aspect) throw new NotFoundException('Aspek tidak ditemukan');
    return { success: true, data: aspect };
  }

  async createAspect(dto: CreateAspectDto) {
    const aspect = await this.prisma.aspekPenilaian.create({ data: dto });
    return { success: true, data: aspect, message: 'Aspek penilaian berhasil dibuat' };
  }

  async updateAspect(id: string, dto: UpdateAspectDto) {
    const aspect = await this.prisma.aspekPenilaian.update({ where: { id }, data: dto });
    return { success: true, data: aspect, message: 'Aspek penilaian diperbarui' };
  }

  async deleteAspect(id: string) {
    await this.prisma.aspekPenilaian.update({ where: { id }, data: { isActive: false } });
    return { success: true, message: 'Aspek penilaian dinonaktifkan' };
  }

  async getItems(query: AssessmentFilterDto) {
    const where: Record<string, unknown> = {};
    if (query.aspekId) where.aspekId = query.aspekId;
    const data = await this.prisma.itemPenilaian.findMany({ where, include: { aspek: true }, orderBy: { urutan: 'asc' } });
    return { success: true, data };
  }

  async getItem(id: string) {
    const item = await this.prisma.itemPenilaian.findUnique({ where: { id }, include: { aspek: true } });
    if (!item) throw new NotFoundException('Item tidak ditemukan');
    return { success: true, data: item };
  }

  async createItem(dto: CreateItemDto) {
    const item = await this.prisma.itemPenilaian.create({ data: dto as never });
    return { success: true, data: item, message: 'Item penilaian berhasil dibuat' };
  }

  async updateItem(id: string, dto: UpdateItemDto) {
    const item = await this.prisma.itemPenilaian.update({ where: { id }, data: dto });
    return { success: true, data: item, message: 'Item penilaian diperbarui' };
  }

  async deleteItem(id: string) {
    await this.prisma.itemPenilaian.update({ where: { id }, data: { isActive: false } });
    return { success: true, message: 'Item penilaian dinonaktifkan' };
  }

  async getScores(query: ScoreFilterDto, scope?: UserScope) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const where: Record<string, unknown> = {};
    if (query.kegiatanId) where.kegiatanId = query.kegiatanId;
    if (query.calonAnggotaId) where.calonAnggotaId = query.calonAnggotaId;

    // Scope-based: when branch-level user and no kegiatan filter,
    // we can't easily filter through kegiatan -> creator relation.
    // The @RequireScope decorator already ensures access-level gating.
    // Data-level filtering for scores is handled at the controller level.

    const [data, total] = await Promise.all([
      this.prisma.nilaiPendadaran.findMany({ where, skip: (page - 1) * limit, take: limit, include: { itemPenilaian: true, penguji: { select: { id: true, namaLengkap: true } } }, orderBy: { createdAt: 'desc' } }),
      this.prisma.nilaiPendadaran.count({ where }),
    ]);
    return { success: true, data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async createScore(dto: CreateScoreDto) {
    const score = await this.prisma.nilaiPendadaran.create({
      data: {
        kegiatanId: dto.kegiatanId,
        calonAnggotaId: dto.calonAnggotaId,
        anggotaId: dto.anggotaId,
        itemPenilaianId: dto.itemPenilaianId,
        pengujiUserId: dto.pengujiUserId,
        skor: dto.skor,
        komentar: dto.komentar,
      },
    });
    return { success: true, data: score, message: 'Nilai berhasil disimpan' };
  }

  async importScores(data: Record<string, unknown>[]) {
    let imported = 0;
    for (const row of data) {
      try {
        await this.prisma.nilaiPendadaran.create({
          data: {
            kegiatanId: row.kegiatan_id as string,
            calonAnggotaId: row.calon_anggota_id as string,
            itemPenilaianId: row.item_penilaian_id as string,
            pengujiUserId: row.penguji_user_id as string,
            skor: parseFloat(row.skor as string),
          },
        });
        imported++;
      } catch { /* skip */ }
    }
    return { success: true, data: { imported, total: data.length } };
  }
}
