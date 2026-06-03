import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ClaimsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: any) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.tipe) where.tipe = query.tipe;

    const [data, total] = await Promise.all([
      this.prisma.klaim.findMany({ where, skip: (page - 1) * limit, take: limit, include: { anggota: { select: { id: true, nomorAnggota: true, namaLengkap: true } } }, orderBy: { createdAt: 'desc' } }),
      this.prisma.klaim.count({ where }),
    ]);
    return { success: true, data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const claim = await this.prisma.klaim.findUnique({ where: { id }, include: { anggota: true } });
    if (!claim) throw new NotFoundException('Klaim tidak ditemukan');
    return { success: true, data: claim };
  }

  async create(dto: any) {
    const claim = await this.prisma.klaim.create({ data: { ...dto, status: 'pending' } });
    return { success: true, data: claim, message: 'Klaim berhasil diajukan' };
  }

  async update(id: string, dto: any) {
    const claim = await this.prisma.klaim.update({ where: { id }, data: dto });
    return { success: true, data: claim, message: 'Klaim berhasil diperbarui' };
  }

  async remove(id: string) {
    await this.prisma.klaim.delete({ where: { id } });
    return { success: true, message: 'Klaim berhasil dihapus' };
  }

  async approve(id: string) {
    await this.prisma.klaim.update({ where: { id }, data: { status: 'disetujui' } });
    return { success: true, message: 'Klaim disetujui, dokumen dalam antrian generate' };
  }

  async reject(id: string, reason?: string) {
    await this.prisma.klaim.update({ where: { id }, data: { status: 'ditolak', catatan: reason } });
    return { success: true, message: reason || 'Klaim ditolak' };
  }

  async process(id: string) {
    const claim = await this.prisma.klaim.update({ where: { id }, data: { status: 'diproses' } });
    return { success: true, data: claim, message: 'Klaim sedang diproses' };
  }
}