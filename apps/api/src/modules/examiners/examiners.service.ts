import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import bcrypt from 'bcryptjs';

@Injectable()
export class ExaminersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: any) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const where: any = { role: 'penguji', isActive: true };
    if (query.search) where.namaLengkap = { contains: query.search };

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({ where, skip: (page - 1) * limit, take: limit, select: { id: true, email: true, namaLengkap: true, createdAt: true } }),
      this.prisma.user.count({ where }),
    ]);
    return { success: true, data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const examiner = await this.prisma.user.findUnique({ where: { id, role: 'penguji' } });
    if (!examiner) throw new NotFoundException('Penguji tidak ditemukan');
    return { success: true, data: examiner };
  }

  async create(dto: any) {
    const passwordHash = await bcrypt.hash(dto.password || 'password123', 12);
    const examiner = await this.prisma.user.create({ data: { ...dto, role: 'penguji', passwordHash } });
    return { success: true, data: examiner, message: 'Penguji berhasil ditambahkan' };
  }

  async update(id: string, dto: any) {
    const data = { ...dto };
    if (dto.password) data.passwordHash = await bcrypt.hash(dto.password, 12);
    const examiner = await this.prisma.user.update({ where: { id }, data });
    return { success: true, data: examiner, message: 'Data penguji diperbarui' };
  }

  async remove(id: string) {
    await this.prisma.user.update({ where: { id }, data: { isActive: false } });
    return { success: true, message: 'Penguji dinonaktifkan' };
  }

  async importCsv(data: any[]) {
    let imported = 0;
    const passwordHash = await bcrypt.hash('password123', 12);
    for (const row of data) {
      try {
        await this.prisma.user.create({ data: { email: row.email, namaLengkap: row.nama || row.name, role: 'penguji', passwordHash } });
        imported++;
      } catch { /* skip duplicate email */ }
    }
    return { success: true, data: { imported, total: data.length } };
  }

  async assign(id: string, dto: any) {
    const examiner = await this.prisma.user.findUnique({ where: { id, role: 'penguji' } });
    if (!examiner) throw new NotFoundException('Penguji tidak ditemukan');
    const kegiatan = await this.prisma.kegiatan.findUnique({ where: { id: dto.kegiatanId || dto.graduationId } });
    if (!kegiatan) throw new NotFoundException('Kegiatan tidak ditemukan');

    const assignment = await this.prisma.penugasanPenguji.create({
      data: { pengujiUserId: id, kegiatanId: dto.kegiatanId || dto.graduationId, peran: dto.peran || 'penguji', catatan: dto.catatan },
    });
    return { success: true, data: assignment, message: 'Penguji berhasil ditugaskan' };
  }

  async getAssignments(id: string) {
    const assignments = await this.prisma.penugasanPenguji.findMany({
      where: { pengujiUserId: id },
      include: { kegiatan: { select: { id: true, nama: true, tipe: true, tanggalMulai: true, status: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, data: assignments };
  }

  async getSchedules(id: string) {
    const assignments = await this.prisma.penugasanPenguji.findMany({
      where: { pengujiUserId: id },
      include: { kegiatan: { select: { id: true, nama: true, tipe: true, tanggalMulai: true, tanggalSelesai: true, lokasi: true } } },
      orderBy: { kegiatan: { tanggalMulai: 'asc' } },
    });
    const schedules = assignments.filter(a => a.kegiatan.tanggalMulai >= new Date());
    return { success: true, data: schedules };
  }
}