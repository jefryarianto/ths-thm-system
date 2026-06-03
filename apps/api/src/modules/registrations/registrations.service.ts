import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RegistrationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: any) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const where: any = {};
    if (query.status) where.status = query.status;

    const [data, total] = await Promise.all([
      this.prisma.pendaftaran.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.pendaftaran.count({ where }),
    ]);
    return { success: true, data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const reg = await this.prisma.pendaftaran.findUnique({ where: { id } });
    if (!reg) throw new NotFoundException('Pendaftaran tidak ditemukan');
    return { success: true, data: reg };
  }

  async create(dto: any) {
    const reg = await this.prisma.pendaftaran.create({ data: { ...dto, status: 'pending' } });
    return { success: true, data: reg, message: 'Pendaftaran berhasil dibuat' };
  }

  async update(id: string, dto: any) {
    const reg = await this.prisma.pendaftaran.update({ where: { id }, data: dto });
    return { success: true, data: reg, message: 'Pendaftaran berhasil diperbarui' };
  }

  async remove(id: string) {
    await this.prisma.pendaftaran.delete({ where: { id } });
    return { success: true, message: 'Pendaftaran berhasil dihapus' };
  }

  async verify(id: string) {
    const reg = await this.prisma.pendaftaran.findUnique({ where: { id } });
    if (!reg) throw new NotFoundException('Pendaftaran tidak ditemukan');
    const missing: string[] = [];
    if (!reg.namaLengkap) missing.push('nama_lengkap');
    if (!reg.jenisKelamin) missing.push('jenis_kelamin');
    if (missing.length > 0) return { success: true, data: { valid: false, missingFields: missing } };
    return { success: true, data: { valid: true } };
  }

  async approve(id: string, userId?: string) {
    const reg = await this.prisma.pendaftaran.findUnique({ where: { id } });
    if (!reg) throw new NotFoundException('Pendaftaran tidak ditemukan');

    const candidate = await this.prisma.calonAnggota.create({
      data: {
        rantingId: reg.sumberInfo as string || '',
        namaLengkap: reg.namaLengkap,
        jenisKelamin: reg.jenisKelamin,
        tempatLahir: reg.tempatLahir,
        tanggalLahir: reg.tanggalLahir,
        alamat: reg.alamat,
        noHp: reg.noHp,
        email: reg.email,
        status: 'diusulkan',
        usulOlehId: userId || reg.id,
      },
    });

    await this.prisma.pendaftaran.update({ where: { id }, data: { status: 'approved' } });
    return { success: true, data: candidate, message: 'Pendaftaran disetujui, calon anggota berhasil dibuat' };
  }

  async reject(id: string, reason?: string) {
    await this.prisma.pendaftaran.update({ where: { id }, data: { status: 'rejected', catatan: reason } });
    return { success: true, message: reason || 'Pendaftaran ditolak' };
  }

  async importCsv(data: any[]) {
    let imported = 0;
    for (const row of data) {
      try {
        await this.prisma.pendaftaran.create({
          data: {
            namaLengkap: row.nama_lengkap || row.name,
            jenisKelamin: row.jenis_kelamin || 'L',
            noHp: row.no_hp,
            email: row.email,
            alamat: row.alamat,
            sumberInfo: row.sumber_info,
            status: 'pending',
          },
        });
        imported++;
      } catch { /* skip */ }
    }
    return { success: true, data: { imported, total: data.length } };
  }
}