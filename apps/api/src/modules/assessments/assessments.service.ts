import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AssessmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAspects(query: any) {
    const data = await this.prisma.aspekPenilaian.findMany({ include: { itemPenilaian: true } });
    return { success: true, data };
  }

  async getAspect(id: string) {
    const aspect = await this.prisma.aspekPenilaian.findUnique({ where: { id }, include: { itemPenilaian: true } });
    if (!aspect) throw new NotFoundException('Aspek tidak ditemukan');
    return { success: true, data: aspect };
  }

  async createAspect(dto: any) {
    const aspect = await this.prisma.aspekPenilaian.create({ data: dto });
    return { success: true, data: aspect, message: 'Aspek penilaian berhasil dibuat' };
  }

  async updateAspect(id: string, dto: any) {
    const aspect = await this.prisma.aspekPenilaian.update({ where: { id }, data: dto });
    return { success: true, data: aspect, message: 'Aspek penilaian diperbarui' };
  }

  async deleteAspect(id: string) {
    await this.prisma.aspekPenilaian.update({ where: { id }, data: { isActive: false } });
    return { success: true, message: 'Aspek penilaian dinonaktifkan' };
  }

  async getItems(query: any) {
    const where: any = {};
    if (query.aspekId) where.aspekId = query.aspekId;
    const data = await this.prisma.itemPenilaian.findMany({ where, include: { aspek: true }, orderBy: { urutan: 'asc' } });
    return { success: true, data };
  }

  async getItem(id: string) {
    const item = await this.prisma.itemPenilaian.findUnique({ where: { id }, include: { aspek: true } });
    if (!item) throw new NotFoundException('Item tidak ditemukan');
    return { success: true, data: item };
  }

  async createItem(dto: any) {
    const item = await this.prisma.itemPenilaian.create({ data: dto });
    return { success: true, data: item, message: 'Item penilaian berhasil dibuat' };
  }

  async updateItem(id: string, dto: any) {
    const item = await this.prisma.itemPenilaian.update({ where: { id }, data: dto });
    return { success: true, data: item, message: 'Item penilaian diperbarui' };
  }

  async deleteItem(id: string) {
    await this.prisma.itemPenilaian.update({ where: { id }, data: { isActive: false } });
    return { success: true, message: 'Item penilaian dinonaktifkan' };
  }

  async getScores(query: any) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;
    const where: any = {};
    if (query.kegiatanId) where.kegiatanId = query.kegiatanId;
    if (query.calonAnggotaId) where.calonAnggotaId = query.calonAnggotaId;

    const [data, total] = await Promise.all([
      this.prisma.nilaiPendadaran.findMany({ where, skip: (page - 1) * limit, take: limit, include: { itemPenilaian: true, penguji: { select: { id: true, namaLengkap: true } } }, orderBy: { createdAt: 'desc' } }),
      this.prisma.nilaiPendadaran.count({ where }),
    ]);
    return { success: true, data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async createScore(dto: any) {
    const score = await this.prisma.nilaiPendadaran.create({ data: dto });
    return { success: true, data: score, message: 'Nilai berhasil disimpan' };
  }

  async importScores(data: any[]) {
    let imported = 0;
    for (const row of data) {
      try {
        await this.prisma.nilaiPendadaran.create({
          data: {
            kegiatanId: row.kegiatan_id,
            calonAnggotaId: row.calon_anggota_id,
            itemPenilaianId: row.item_penilaian_id,
            pengujiUserId: row.penguji_user_id,
            skor: parseFloat(row.skor),
          },
        });
        imported++;
      } catch { /* skip */ }
    }
    return { success: true, data: { imported, total: data.length } };
  }
}