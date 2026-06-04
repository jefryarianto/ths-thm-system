import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTrainingDto, UpdateTrainingDto, TrainingFilterDto, RecordAttendanceDto, CreateEvaluationDto, UpdateEvaluationDto } from './dto/training.dto';

@Injectable()
export class TrainingsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: TrainingFilterDto) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const where: Record<string, unknown> = {};
    if (query.rantingId) where.rantingId = query.rantingId;

    const [data, total] = await Promise.all([
      this.prisma.latihan.findMany({
        where, skip: (page - 1) * limit, take: limit,
        include: { ranting: true, pelatih: { select: { id: true, namaLengkap: true } } },
        orderBy: { hariTanggal: 'desc' },
      }),
      this.prisma.latihan.count({ where }),
    ]);

    return { success: true, data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const training = await this.prisma.latihan.findUnique({
      where: { id },
      include: {
        ranting: true,
        pelatih: { select: { id: true, namaLengkap: true } },
        absensi: { include: { anggota: { select: { id: true, nomorAnggota: true, namaLengkap: true } } } },
        evaluasi: { include: { anggota: { select: { id: true, nomorAnggota: true, namaLengkap: true } } } },
      },
    });
    if (!training) throw new NotFoundException('Latihan tidak ditemukan');
    return { success: true, data: training };
  }

  async create(dto: CreateTrainingDto) {
    const training = await this.prisma.latihan.create({
      data: {
        rantingId: dto.rantingId,
        kegiatanId: dto.kegiatanId,
        pelatihId: dto.pelatihId,
        hariTanggal: new Date(dto.hariTanggal),
        lokasi: dto.lokasi,
        jenisMateri: dto.jenisMateri,
        hasilLatihanGlobal: dto.hasilLatihanGlobal,
        rekomendasiBerikutnya: dto.rekomendasiBerikutnya,
      },
    });
    return { success: true, data: training, message: 'Latihan berhasil dibuat' };
  }

  async update(id: string, dto: UpdateTrainingDto) {
    const data: Record<string, unknown> = {};
    if (dto.lokasi) data.lokasi = dto.lokasi;
    if (dto.jenisMateri) data.jenisMateri = dto.jenisMateri;
    if (dto.hasilLatihanGlobal !== undefined) data.hasilLatihanGlobal = dto.hasilLatihanGlobal;
    if (dto.rekomendasiBerikutnya !== undefined) data.rekomendasiBerikutnya = dto.rekomendasiBerikutnya;
    if (dto.hariTanggal) data.hariTanggal = new Date(dto.hariTanggal);

    const training = await this.prisma.latihan.update({ where: { id }, data });
    return { success: true, data: training, message: 'Latihan berhasil diperbarui' };
  }

  async remove(id: string) {
    await this.prisma.latihan.delete({ where: { id } });
    return { success: true, message: 'Latihan berhasil dihapus' };
  }

  async getAttendances(trainingId: string) {
    const attendances = await this.prisma.absensiLatihan.findMany({
      where: { latihanId: trainingId },
      include: { anggota: { select: { id: true, nomorAnggota: true, namaLengkap: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, data: attendances };
  }

  async recordAttendance(trainingId: string, dto: RecordAttendanceDto) {
    const latihan = await this.prisma.latihan.findUnique({ where: { id: trainingId } });
    if (!latihan) throw new NotFoundException('Latihan tidak ditemukan');

    const attendance = await this.prisma.absensiLatihan.upsert({
      where: { id: dto.id || '' },
      update: { hadir: dto.hadir !== false, catatan: dto.catatan },
      create: {
        latihanId: trainingId,
        anggotaId: dto.anggotaId,
        hadir: dto.hadir !== false,
        catatan: dto.catatan,
      },
    });
    return { success: true, data: attendance, message: 'Kehadiran tercatat' };
  }

  async importAttendance(trainingId: string, data: Array<{ anggotaId?: string; memberId?: string; hadir?: boolean; catatan?: string }>) {
    const latihan = await this.prisma.latihan.findUnique({ where: { id: trainingId } });
    if (!latihan) throw new NotFoundException('Latihan tidak ditemukan');

    let imported = 0;
    for (const row of data) {
      const anggotaId = row.anggotaId || row.memberId;
      if (!anggotaId) continue;
      const existing = await this.prisma.absensiLatihan.findFirst({
        where: { latihanId: trainingId, anggotaId },
      });
      if (!existing) {
        await this.prisma.absensiLatihan.create({
          data: { latihanId: trainingId, anggotaId, hadir: row.hadir !== false, catatan: row.catatan },
        });
        imported++;
      }
    }
    return { success: true, data: { imported }, message: `${imported} kehadiran berhasil diimpor` };
  }

  async getEvaluations(trainingId: string) {
    const evaluations = await this.prisma.evaluasiLatihan.findMany({
      where: { latihanId: trainingId },
      include: { anggota: { select: { id: true, nomorAnggota: true, namaLengkap: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, data: evaluations };
  }

  async createEvaluation(trainingId: string, dto: CreateEvaluationDto) {
    const latihan = await this.prisma.latihan.findUnique({ where: { id: trainingId } });
    if (!latihan) throw new NotFoundException('Latihan tidak ditemukan');

    const evaluation = await this.prisma.evaluasiLatihan.create({
      data: { latihanId: trainingId, anggotaId: dto.anggotaId, nilai: dto.nilai, catatan: dto.catatan },
    });
    return { success: true, data: evaluation, message: 'Evaluasi berhasil disimpan' };
  }

  async updateEvaluation(trainingId: string, evaluationId: string, dto: UpdateEvaluationDto) {
    const data: Record<string, unknown> = {};
    if (dto.nilai !== undefined) data.nilai = dto.nilai;
    if (dto.catatan !== undefined) data.catatan = dto.catatan;

    const evaluation = await this.prisma.evaluasiLatihan.update({
      where: { id: evaluationId },
      data,
    });
    return { success: true, data: evaluation, message: 'Evaluasi berhasil diperbarui' };
  }

  async removeEvaluation(trainingId: string, evaluationId: string) {
    await this.prisma.evaluasiLatihan.delete({ where: { id: evaluationId } });
    return { success: true, message: 'Evaluasi berhasil dihapus' };
  }
}
