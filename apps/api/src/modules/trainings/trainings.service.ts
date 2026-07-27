import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ScopeHelper } from '../../common/utils/scope-helpers';
import { CacheService } from '../../common/services/cache.service';
import { BaseCrudService, CrudConfig } from '../../common/utils/base-crud.service';
import { MailService } from '../../mail/mail.service';
import { attendanceConfirmationEmail } from '../../mail/email-templates';
import {
  CreateTrainingDto,
  UpdateTrainingDto,
  TrainingFilterDto,
  RecordAttendanceDto,
  CreateEvaluationDto,
  UpdateEvaluationDto,
} from './dto/training.dto';
import { UserScope } from '../../common/interfaces/user-scope.interface';
import { MemberMailService } from '../../common/services/member-mail.service';
import { GamificationService } from '../gamification/gamification.service';

const CRUD_CONFIG: CrudConfig = {
  model: 'latihan',
  prefix: 'trainings:',
  notFound: 'Latihan tidak ditemukan',
  softDelete: false,
};

@Injectable()
export class TrainingsService extends BaseCrudService<CreateTrainingDto, UpdateTrainingDto> {
  constructor(
    prisma: PrismaService,
    scopeHelper: ScopeHelper,
    cache: CacheService,
    private readonly mailService: MailService,
    private readonly memberMailService: MemberMailService,
    @Inject(forwardRef(() => GamificationService))
    private readonly gamificationService: GamificationService,
  ) {
    super(prisma, scopeHelper, cache, CRUD_CONFIG);
  }

  // ═══════════════════════════════════════════════════════════
  //  HOOKS — invoked automatically by base CRUD methods
  // ═══════════════════════════════════════════════════════════

  /**
   * Transform DTO → Prisma data before creation.
   * Handles auto-scope assignment, field validation, and date conversion.
   */
  protected async beforeCreate(
    dto: CreateTrainingDto,
    scope?: UserScope,
    userId?: string,
  ): Promise<Record<string, unknown>> {
    // Resolve rantingId from DTO or user scope
    const rantingId = dto.rantingId || scope?.rantingId;
    if (!rantingId) throw new BadRequestException('rantingId diperlukan');
    const pelatihId = userId || dto.pelatihId;
    if (!pelatihId) throw new BadRequestException('pelatihId diperlukan');

    return {
      rantingId,
      kegiatanId: dto.kegiatanId,
      pelatihId,
      hariTanggal: new Date(dto.hariTanggal),
      lokasi: dto.lokasi,
      jenisMateri: dto.jenisMateri,
      hasilLatihanGlobal: dto.hasilLatihanGlobal,
      rekomendasiLatihanBerikutnya: dto.rekomendasiBerikutnya,
    };
  }

  /**
   * Transform DTO → Prisma update data before updating.
   * Only includes fields that are explicitly provided.
   */
  protected async beforeUpdate(
    _id: string,
    dto: UpdateTrainingDto,
  ): Promise<Record<string, unknown>> {
    const data: Record<string, unknown> = {};
    if (dto.lokasi) data.lokasi = dto.lokasi;
    if (dto.jenisMateri) data.jenisMateri = dto.jenisMateri;
    if (dto.hasilLatihanGlobal !== undefined) data.hasilLatihanGlobal = dto.hasilLatihanGlobal;
    if (dto.rekomendasiBerikutnya !== undefined) data.rekomendasiBerikutnya = dto.rekomendasiBerikutnya;
    if (dto.hariTanggal) data.hariTanggal = new Date(dto.hariTanggal);
    return data;
  }

  // ═══════════════════════════════════════════════════════════
  //  STANDARD CRUD — minimal wrappers that delegate to base
  // ═══════════════════════════════════════════════════════════

  async findAll(query: TrainingFilterDto, scope?: UserScope) {
    const cacheKey = `${this.CACHE_PREFIX}list:${scope?.rantingId || scope?.wilayahId || scope?.distrikId || 'all'}:${query.page || 1}:${query.limit || 10}:${query.rantingId || ''}`;

    return this.baseFindAll(
      cacheKey,
      () => {
        const where: Record<string, unknown> = this.buildScopeFilter(scope);
        if (query.rantingId) where.rantingId = query.rantingId;
        return where;
      },
      {
        page: query.page,
        limit: query.limit,
        orderBy: { hariTanggal: 'desc' },
        include: {
          ranting: true,
          pelatih: { select: { id: true, namaLengkap: true } },
        },
      },
      30,
    );
  }

  async findOne(id: string, scope?: UserScope) {
    return this.baseFindOne(id, scope, {
      ranting: true,
      pelatih: { select: { id: true, namaLengkap: true } },
      absensi: {
        include: { anggota: { select: { id: true, nomorAnggota: true, namaLengkap: true } } },
      },
      evaluasi: {
        include: { anggota: { select: { id: true, nomorAnggota: true, namaLengkap: true } } },
      },
    });
  }

  async create(dto: CreateTrainingDto, scope?: UserScope, userId?: string) {
    // `beforeCreate` hook handles validation + data transformation
    return this.baseCreate(dto, scope, userId, 'Latihan berhasil dibuat');
  }

  async update(id: string, dto: UpdateTrainingDto, scope?: UserScope) {
    // `beforeUpdate` hook handles field mapping
    return this.baseUpdate(id, dto, scope, 'Latihan berhasil diperbarui');
  }

  async remove(id: string, scope?: UserScope) {
    return this.baseRemove(id, scope, 'Latihan berhasil dihapus');
  }

  // ═══════════════════════════════════════════════════════════
  //  DOMAIN METHODS — attendances, evaluations
  // ═══════════════════════════════════════════════════════════

  async getAttendances(trainingId: string) {
    const attendances = await this.prisma.absensiLatihan.findMany({
      where: { latihanId: trainingId },
      include: { anggota: { select: { id: true, nomorAnggota: true, namaLengkap: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return attendances;
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

    // Auto-award gamification points
    if (hadir && dto.anggotaId) {
      try {
        await this.gamificationService.recordTraining(dto.anggotaId);
      } catch (error) {
        this.logger.warn('Failed to award gamification points:', (error as Error).message);
      }
    }

    // Send confirmation email
    if (dto.anggotaId) {
      this.sendAttendanceConfirmation(dto.anggotaId, latihan.jenisMateri || '', hadir);
    }

    this.invalidateCache();
    return attendance;
  }

  async importAttendance(
    trainingId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: Array<{ anggotaId?: string; memberId?: string; hadir?: boolean; catatan?: string }>,
  ) {
    const latihan = await this.prisma.latihan.findUnique({ where: { id: trainingId } });
    if (!latihan) throw new NotFoundException('Latihan tidak ditemukan');

    const allAnggotaIds = data
      .map((row) => row.anggotaId || row.memberId)
      .filter(Boolean) as string[];

    if (allAnggotaIds.length === 0) {
      return { imported: 0 };
    }

    const existingRecords = await this.prisma.absensiLatihan.findMany({
      where: { latihanId: trainingId, anggotaId: { in: allAnggotaIds } },
      select: { anggotaId: true },
    });
    const existingSet = new Set(existingRecords.map((r) => r.anggotaId));

    const toCreate = data
      .filter((row) => {
        const id = row.anggotaId || row.memberId;
        return id && !existingSet.has(id);
      })
      .map((row) => ({
        latihanId: trainingId,
        anggotaId: (row.anggotaId || row.memberId)!,
        hadir: row.hadir !== false,
        catatan: row.catatan,
      }));

    if (toCreate.length > 0) {
      await this.prisma.absensiLatihan.createMany({ data: toCreate });
    }

    return { imported: toCreate.length };
  }

  async getEvaluations(trainingId: string) {
    const evaluations = await this.prisma.evaluasiLatihan.findMany({
      where: { latihanId: trainingId },
      include: { anggota: { select: { id: true, nomorAnggota: true, namaLengkap: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return evaluations;
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
    this.invalidateCache();
    return evaluation;
  }

  async updateEvaluation(trainingId: string, evaluationId: string, dto: UpdateEvaluationDto) {
    const data: Record<string, unknown> = {};
    if (dto.nilai !== undefined) data.nilai = dto.nilai;
    if (dto.catatan !== undefined) data.catatan = dto.catatan;

    const evaluation = await this.prisma.evaluasiLatihan.update({
      where: { id: evaluationId },
      data,
    });
    this.invalidateCache();
    return evaluation;
  }

  async removeEvaluation(trainingId: string, evaluationId: string) {
    await this.prisma.evaluasiLatihan.delete({ where: { id: evaluationId } });
    this.invalidateCache();
    // void — interceptor returns { success: true }
  }

  // ── Private helpers ──────────────────────────────────────

  private sendAttendanceConfirmation(
    anggotaId: string,
    jenisMateri: string,
    hadir: boolean,
  ): void {
    this.memberMailService.sendToMemberWithArgs(
      anggotaId,
      attendanceConfirmationEmail,
      [jenisMateri, hadir],
      { template: 'attendanceConfirmationEmail' },
      'trainings',
      { jenisMateri, hadir: hadir ? 'Hadir' : 'Tidak Hadir' },
    );
  }
}
