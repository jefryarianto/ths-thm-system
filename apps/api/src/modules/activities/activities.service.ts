import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ActivitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: any) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const where: any = {};
    if (query.tipe) where.tipe = query.tipe;
    if (query.status) where.status = query.status;
    if (query.scopeType) where.scopeType = query.scopeType;

    const [data, total] = await Promise.all([
      this.prisma.kegiatan.findMany({
        where: { ...where, tipe: { not: 'pendadaran' } },
        skip: (page - 1) * limit, take: limit,
        include: { creator: { select: { id: true, namaLengkap: true } }, peserta: true, presensi: true, dokumenKegiatan: true },
        orderBy: { tanggalMulai: 'desc' },
      }),
      this.prisma.kegiatan.count({ where: { ...where, tipe: { not: 'pendadaran' } } }),
    ]);
    return { success: true, data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const activity = await this.prisma.kegiatan.findUnique({
      where: { id },
      include: { creator: { select: { id: true, namaLengkap: true } }, peserta: { include: { anggota: { select: { id: true, nomorAnggota: true, namaLengkap: true } } } }, presensi: true, dokumenKegiatan: true },
    });
    if (!activity) throw new NotFoundException('Kegiatan tidak ditemukan');
    return { success: true, data: activity };
  }

  async create(dto: any) {
    const activity = await this.prisma.kegiatan.create({ data: dto });
    return { success: true, data: activity, message: 'Kegiatan berhasil dibuat' };
  }

  async update(id: string, dto: any) {
    const activity = await this.prisma.kegiatan.update({ where: { id }, data: dto });
    return { success: true, data: activity, message: 'Kegiatan berhasil diperbarui' };
  }

  async remove(id: string) {
    await this.prisma.kegiatan.update({ where: { id }, data: { status: 'cancelled' } });
    return { success: true, message: 'Kegiatan dibatalkan' };
  }

  async addParticipant(activityId: string, dto: any) {
    const kegiatan = await this.prisma.kegiatan.findUnique({ where: { id: activityId } });
    if (!kegiatan) throw new NotFoundException('Kegiatan tidak ditemukan');

    const participant = await this.prisma.kegiatanPeserta.create({
      data: { kegiatanId: activityId, anggotaId: dto.anggotaId || dto.memberId },
    });
    return { success: true, data: participant, message: 'Peserta berhasil ditambahkan' };
  }

  async removeParticipant(activityId: string, participantId: string) {
    await this.prisma.kegiatanPeserta.delete({ where: { id: participantId } });
    return { success: true, message: 'Peserta berhasil dihapus' };
  }

  async importParticipants(activityId: string, data: any[]) {
    const kegiatan = await this.prisma.kegiatan.findUnique({ where: { id: activityId } });
    if (!kegiatan) throw new NotFoundException('Kegiatan tidak ditemukan');

    let imported = 0;
    for (const row of data) {
      const anggotaId = row.anggotaId || row.memberId;
      const existing = await this.prisma.kegiatanPeserta.findFirst({
        where: { kegiatanId: activityId, anggotaId },
      });
      if (!existing) {
        await this.prisma.kegiatanPeserta.create({
          data: { kegiatanId: activityId, anggotaId },
        });
        imported++;
      }
    }
    return { success: true, data: { imported }, message: `${imported} peserta berhasil diimpor` };
  }

  async getPresence(activityId: string) {
    const presence = await this.prisma.presensiKegiatan.findMany({
      where: { kegiatanId: activityId },
      include: { anggota: { select: { id: true, nomorAnggota: true, namaLengkap: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, data: presence };
  }

  async recordPresence(activityId: string, dto: any) {
    const kegiatan = await this.prisma.kegiatan.findUnique({ where: { id: activityId } });
    if (!kegiatan) throw new NotFoundException('Kegiatan tidak ditemukan');

    const presence = await this.prisma.presensiKegiatan.create({
      data: { kegiatanId: activityId, anggotaId: dto.anggotaId || dto.memberId, hadir: dto.hadir !== false },
    });
    return { success: true, data: presence, message: 'Kehadiran tercatat' };
  }

  async getDocuments(activityId: string) {
    const documents = await this.prisma.dokumenKegiatan.findMany({
      where: { kegiatanId: activityId },
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, data: documents };
  }

  async uploadDocument(activityId: string, dto: any) {
    const doc = await this.prisma.dokumenKegiatan.create({
      data: { kegiatanId: activityId, nama: dto.nama, filePath: dto.filePath, tipe: dto.tipe || 'dokumen' },
    });
    return { success: true, data: doc, message: 'Dokumen berhasil diupload' };
  }
}