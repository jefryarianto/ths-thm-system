import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTrainingDto, UpdateTrainingDto, TrainingFilterDto, RecordAttendanceDto, CreateEvaluationDto, UpdateEvaluationDto } from './dto/training.dto';
import { UserScope } from '../../common/interfaces/user-scope.interface';
import { ScopeHelper } from '../../common/utils/scope-helpers';
import { CacheService } from '../../common/services/cache.service';

@Injectable()
export class TrainingsService {
  private readonly CACHE_PREFIX = 'trainings:';

  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeHelper: ScopeHelper,
    private readonly cache: CacheService,
  ) {}

  async findAll(query: TrainingFilterDto, scope?: UserScope) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const cacheKey = `${this.CACHE_PREFIX}list:${scope?.rantingId || scope?.wilayahId || scope?.distrikId || 'all'}:${page}:${limit}:${query.rantingId || ''}`;

    return this.cache.getOrSet(cacheKey, async () => {
      const scopeFilter = this.scopeHelper.buildScopeFilter(scope || {});
      const where: Record<string, unknown> = { ...scopeFilter };
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
    }, 30);
  }

  async findOne(id: string, scope?: UserScope) {
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
    if (scope && !(await this.scopeHelper.hasAccessToResourceAsync(this.prisma, scope, training.rantingId))) {
      throw new NotFoundException('Latihan tidak ditemukan');
    }
    return { success: true, data: training };
  }

  async create(dto: CreateTrainingDto, scope?: UserScope) {
    if (scope?.rantingId && !dto.rantingId) {
      (dto as any).rantingId = scope.rantingId;
    }
    const training = await this.prisma.latihan.create({
      data: {
        rantingId: dto.rantingId,
        kegiatanId: dto.kegiatanId,
        pelatihId: dto.pelatihId,
        hariTanggal: new Date(dto.hariTanggal),
        lokasi: dto.lokasi,
        jenisMateri: dto.jenisMateri,
        hasilLatihanGlobal: dto.hasilLatihanGlobal,
        rekomendasiLatihanBerikutnya: dto.rekomendasiBerikutnya,
      },
    });
    this.cache.invalidatePrefix(this.CACHE_PREFIX);
    return { success: true, data: training, message: 'Latihan berhasil dibuat' };
  }

  async update(id: string, dto: UpdateTrainingDto, scope?: UserScope) {
    if (scope) {
      const training = await this.prisma.latihan.findUnique({ where: { id }, select: { rantingId: true } });
      if (!training) throw new NotFoundException('Latihan tidak ditemukan');
      if (!(await this.scopeHelper.hasAccessToResourceAsync(this.prisma, scope, training.rantingId))) {
        throw new ForbiddenException('Akses ditolak: diluar cakupan wilayah Anda');
      }
    }

    const data: Record<string, unknown> = {};
    if (dto.lokasi) data.lokasi = dto.lokasi;
    if (dto.jenisMateri) data.jenisMateri = dto.jenisMateri;
    if (dto.hasilLatihanGlobal !== undefined) data.hasilLatihanGlobal = dto.hasilLatihanGlobal;
    if (dto.rekomendasiBerikutnya !== undefined) data.rekomendasiBerikutnya = dto.rekomendasiBerikutnya;
    if (dto.hariTanggal) data.hariTanggal = new Date(dto.hariTanggal);

    const training = await this.prisma.latihan.update({ where: { id }, data });
    this.cache.invalidatePrefix(this.CACHE_PREFIX);
    return { success: true, data: training, message: 'Latihan berhasil diperbarui' };
  }

  async remove(id: string, scope?: UserScope) {
    if (scope) {
      const training = await this.prisma.latihan.findUnique({ where: { id }, select: { rantingId: true } });
      if (!training) throw new NotFoundException('Latihan tidak ditemukan');
      if (!(await this.scopeHelper.hasAccessToResourceAsync(this.prisma, scope, training.rantingId))) {
        throw new ForbiddenException('Akses ditolak: diluar cakupan wilayah Anda');
      }
    }

    await this.prisma.latihan.delete({ where: { id } });
    this.cache.invalidatePrefix(this.CACHE_PREFIX);
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
    this.cache.invalidatePrefix(this.CACHE_PREFIX);
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
    this.cache.invalidatePrefix(this.CACHE_PREFIX);
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
    this.cache.invalidatePrefix(this.CACHE_PREFIX);
    return { success: true, data: evaluation, message: 'Evaluasi berhasil diperbarui' };
  }

  async removeEvaluation(trainingId: string, evaluationId: string) {
    await this.prisma.evaluasiLatihan.delete({ where: { id: evaluationId } });
    this.cache.invalidatePrefix(this.CACHE_PREFIX);
    return { success: true, message: 'Evaluasi berhasil dihapus' };
  }
}
