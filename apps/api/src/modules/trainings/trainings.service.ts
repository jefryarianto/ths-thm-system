import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../mail/mail.service';
import { trainingNotificationEmail, attendanceConfirmationEmail } from '../../mail/email-templates';
import {
  CreateTrainingDto,
  UpdateTrainingDto,
  TrainingFilterDto,
  RecordAttendanceDto,
  CreateEvaluationDto,
  UpdateEvaluationDto,
} from './dto/training.dto';
import { UserScope } from '../../common/interfaces/user-scope.interface';
import { ScopeHelper } from '../../common/utils/scope-helpers';
import { CacheService } from '../../common/services/cache.service';
import { MemberMailService } from '../../common/services/member-mail.service';
import { GamificationService } from '../gamification/gamification.service';
import { paginate } from '../../common/utils/pagination';

@Injectable()
export class TrainingsService {
  private readonly logger = new Logger(TrainingsService.name);
  private readonly CACHE_PREFIX = 'trainings:';

  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeHelper: ScopeHelper,
    private readonly cache: CacheService,
    private readonly mailService: MailService,
    private readonly memberMailService: MemberMailService,
    @Inject(forwardRef(() => GamificationService))
    private readonly gamificationService: GamificationService,
  ) {}

  async findAll(query: TrainingFilterDto, scope?: UserScope) {
    const cacheKey = `${this.CACHE_PREFIX}list:${scope?.rantingId || scope?.wilayahId || scope?.distrikId || 'all'}:${query.page || 1}:${query.limit || 10}:${query.rantingId || ''}`;

    return this.cache.getOrSet(
      cacheKey,
      async () => {
        const scopeFilter = this.scopeHelper.buildScopeFilter(scope || {});
        const where: Record<string, unknown> = { ...scopeFilter };
        if (query.rantingId) where.rantingId = query.rantingId;

        return paginate(this.prisma.latihan, where, {
          page: query.page,
          limit: query.limit,
          orderBy: { hariTanggal: 'desc' },
          include: { ranting: true, pelatih: { select: { id: true, namaLengkap: true } } },
        });
      },
      30,
    );
  }

  async findOne(id: string, scope?: UserScope) {
    const training = await this.prisma.latihan.findUnique({
      where: { id },
      include: {
        ranting: true,
        pelatih: { select: { id: true, namaLengkap: true } },
        absensi: {
          include: { anggota: { select: { id: true, nomorAnggota: true, namaLengkap: true } } },
        },
        evaluasi: {
          include: { anggota: { select: { id: true, nomorAnggota: true, namaLengkap: true } } },
        },
      },
    });
    if (!training) throw new NotFoundException('Latihan tidak ditemukan');
    if (
      scope &&
      !(await this.scopeHelper.hasAccessToResourceAsync(this.prisma, scope, training.rantingId))
    ) {
      throw new NotFoundException('Latihan tidak ditemukan');
    }
    return { success: true, data: training };
  }

  async create(dto: CreateTrainingDto, scope?: UserScope, userId?: string) {
    if (scope?.rantingId && !dto.rantingId) {
      (dto as any).rantingId = scope.rantingId;
    }
    // Resolve rantingId and pelatihId with runtime validation
    const rantingId = dto.rantingId || scope?.rantingId;
    if (!rantingId) throw new BadRequestException('rantingId diperlukan');
    const pelatihId = userId || dto.pelatihId;
    if (!pelatihId) throw new BadRequestException('pelatihId diperlukan');

    const training = await this.prisma.latihan.create({
      data: {
        rantingId,
        kegiatanId: dto.kegiatanId,
        pelatihId,
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
      await this.scopeHelper.verifyResourceAccess(
        this.prisma,
        scope,
        id,
        (prisma, rid) =>
          prisma.latihan.findUnique({ where: { id: rid }, select: { rantingId: true } }),
        'Latihan tidak ditemukan',
      );
    }

    const data: Record<string, unknown> = {};
    if (dto.lokasi) data.lokasi = dto.lokasi;
    if (dto.jenisMateri) data.jenisMateri = dto.jenisMateri;
    if (dto.hasilLatihanGlobal !== undefined) data.hasilLatihanGlobal = dto.hasilLatihanGlobal;
    if (dto.rekomendasiBerikutnya !== undefined)
      data.rekomendasiBerikutnya = dto.rekomendasiBerikutnya;
    if (dto.hariTanggal) data.hariTanggal = new Date(dto.hariTanggal);

    const training = await this.prisma.latihan.update({ where: { id }, data });
    this.cache.invalidatePrefix(this.CACHE_PREFIX);
    return { success: true, data: training, message: 'Latihan berhasil diperbarui' };
  }

  async remove(id: string, scope?: UserScope) {
    if (scope) {
      await this.scopeHelper.verifyResourceAccess(
        this.prisma,
        scope,
        id,
        (prisma, rid) =>
          prisma.latihan.findUnique({ where: { id: rid }, select: { rantingId: true } }),
        'Latihan tidak ditemukan',
      );
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

    const hadir = dto.hadir !== false;

    // Auto-award gamification points for training attendance
    if (hadir && dto.anggotaId) {
      try {
        await this.gamificationService.recordTraining(dto.anggotaId);
      } catch (error) {
        console.warn('Failed to award gamification points for training:', (error as Error).message);
      }
    }

    // Send attendance confirmation email (method handles errors internally)
    if (dto.anggotaId) {
      this.sendAttendanceConfirmation(dto.anggotaId, latihan.jenisMateri || '', hadir);
    }

    this.cache.invalidatePrefix(this.CACHE_PREFIX);
    return { success: true, data: attendance, message: 'Kehadiran tercatat' };
  }

  async importAttendance(
    trainingId: string,
    data: Array<{ anggotaId?: string; memberId?: string; hadir?: boolean; catatan?: string }>,
  ) {
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
          data: {
            latihanId: trainingId,
            anggotaId,
            hadir: row.hadir !== false,
            catatan: row.catatan,
          },
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
      data: {
        latihanId: trainingId,
        anggotaId: dto.anggotaId,
        nilai: dto.nilai,
        catatan: dto.catatan,
      },
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

  private sendAttendanceConfirmation(anggotaId: string, jenisMateri: string, hadir: boolean): void {
    this.memberMailService.sendToMemberWithArgs(
      anggotaId,
      attendanceConfirmationEmail,
      [jenisMateri, hadir],
      { template: 'attendanceConfirmationEmail' },
      'trainings',
    );
  }
}
