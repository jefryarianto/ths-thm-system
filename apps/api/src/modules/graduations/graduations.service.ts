import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ScopeHelper } from '../../common/utils/scope-helpers';
import { CacheService } from '../../common/services/cache.service';
import { BaseCrudService } from '../../common/utils/base-crud.service';
import { MailService } from '../../mail/mail.service';
import { graduationResultEmail, graduationRegisteredEmail } from '../../mail/email-templates';
import {
  CreateGraduationDto,
  UpdateGraduationDto,
  GraduationFilterDto,
  RegisterParticipantDto,
  GraduateDto,
} from './dto/graduation.dto';
import { UserScope } from '../../common/interfaces/user-scope.interface';

@Injectable()
export class GraduationsService extends BaseCrudService<CreateGraduationDto, UpdateGraduationDto> {
  constructor(
    prisma: PrismaService,
    scopeHelper: ScopeHelper,
    cache: CacheService,
    private readonly mailService: MailService,
  ) {
    super(prisma, scopeHelper, cache, {
      model: 'kegiatan',
      prefix: 'graduations:',
      notFound: 'Pendadaran tidak ditemukan',
      scopeStrategy: 'kegiatan',
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  HOOKS
  // ═══════════════════════════════════════════════════════════

  /**
   * Before create: auto-resolve scope, convert dates, set fixed fields.
   * Eliminates the `as never` cast on the entire data object.
   */
  protected async beforeCreate(
    dto: CreateGraduationDto,
    scope?: UserScope,
    userId?: string,
  ): Promise<Record<string, unknown>> {
    const resolvedScopeType =
      dto.scopeType ||
      (scope?.rantingId ? 'ranting' : scope?.wilayahId ? 'wilayah' : scope?.distrikId ? 'distrik' : 'nasional');
    const resolvedScopeId =
      dto.scopeId || scope?.rantingId || scope?.wilayahId || scope?.distrikId || 'national';

    return {
      nama: dto.nama,
      lokasi: dto.lokasi,
      tanggalMulai: new Date(dto.tanggalMulai),
      // tanggalSelesai is required in schema — fall back to tanggalMulai if not provided
      tanggalSelesai: dto.tanggalSelesai ? new Date(dto.tanggalSelesai) : new Date(dto.tanggalMulai),
      scopeType: resolvedScopeType,
      scopeId: resolvedScopeId,
      createdBy: userId || 'system',
      adminKegiatanId: dto.adminKegiatanId || null,
      tipe: 'pendadaran',
      status: 'draft',
    };
  }

  /**
   * Before update: sparse field mapping with date conversion.
   */
  protected async beforeUpdate(
    _id: string,
    dto: UpdateGraduationDto,
  ): Promise<Record<string, unknown>> {
    const data: Record<string, unknown> = {};
    if (dto.nama !== undefined) data.nama = dto.nama;
    if (dto.lokasi !== undefined) data.lokasi = dto.lokasi;
    if (dto.tanggalMulai !== undefined) data.tanggalMulai = new Date(dto.tanggalMulai);
    if (dto.tanggalSelesai !== undefined) data.tanggalSelesai = new Date(dto.tanggalSelesai);
    if (dto.status !== undefined) data.status = dto.status;
    return data;
  }

  // ═══════════════════════════════════════════════════════════
  //  STANDARD CRUD
  // ═══════════════════════════════════════════════════════════

  async findAll(query: GraduationFilterDto, scope?: UserScope) {
    return this.baseFindAll(
      `graduations:list:${scope?.rantingId || scope?.wilayahId || scope?.distrikId || 'all'}:${query.page || 1}:${query.limit || 10}:${query.status || 'all'}`,
      async () => {
        const where: Record<string, unknown> = { tipe: 'pendadaran' };

        // Apply kegiatan-based scope filter
        Object.assign(where, this.buildKegiatanScopeFilter(scope));

        if (query.status) where.status = query.status;

        return where;
      },
      {
        page: query.page,
        limit: query.limit,
        orderBy: { tanggalMulai: 'desc' },
      },
    );
  }

  async findOne(id: string, scope?: UserScope) {
    return this.baseFindOne(id, scope);
  }

  async create(dto: CreateGraduationDto, scope?: UserScope, userId?: string) {
    return this.baseCreate(dto, scope, userId, 'Pendadaran berhasil dibuat');
  }

  async update(id: string, dto: UpdateGraduationDto, scope?: UserScope) {
    return this.baseUpdate(id, dto, scope, 'Pendadaran berhasil diperbarui');
  }

  // ═══════════════════════════════════════════════════════════
  //  DOMAIN METHODS
  // ═══════════════════════════════════════════════════════════

  async registerParticipant(graduationId: string, dto: RegisterParticipantDto) {
    const candidate = await this.prisma.calonAnggota.update({
      where: { id: dto.candidateId },
      data: { status: 'mengikuti_pendadaran' },
    });

    if (candidate.email) {
      this.sendGraduationRegisteredEmail(candidate.namaLengkap, candidate.email, graduationId);
    }

    return candidate;
  }

  async unregisterParticipant(_graduationId: string, dto: RegisterParticipantDto) {
    await this.prisma.calonAnggota.update({
      where: { id: dto.candidateId },
      data: { status: 'diusulkan' },
    });

    // void — interceptor returns { success: true }
  }

  async getParticipants(_graduationId: string) {
    const participants = await this.prisma.calonAnggota.findMany({
      where: { status: 'mengikuti_pendadaran' },
      include: { ranting: true },
    });

    return participants;
  }

  async importParticipants(
    _graduationId: string,
    data: Array<{ candidateId?: string; id?: string }>,
  ) {
    const kegiatan = await this.prisma.kegiatan.findUnique({ where: { id: _graduationId } });
    if (!kegiatan) throw new NotFoundException('Pendadaran tidak ditemukan');

    let imported = 0;
    for (const row of data) {
      const candidateId = row.candidateId || row.id;
      if (!candidateId) continue;
      const candidate = await this.prisma.calonAnggota.findUnique({ where: { id: candidateId } });
      if (candidate && candidate.status === 'diusulkan') {
        await this.prisma.calonAnggota.update({
          where: { id: candidateId },
          data: { status: 'mengikuti_pendadaran' },
        });
        imported++;
      }
    }

    return { imported };
  }

  async graduate(graduationId: string, dto: GraduateDto, scope?: UserScope) {
    if (scope) {
      const graduation = await this.prisma.kegiatan.findUnique({
        where: { id: graduationId },
        select: { scopeType: true, scopeId: true },
      });
      if (!graduation) throw new NotFoundException('Pendadaran tidak ditemukan');
      this.scopeHelper.verifyKegiatanScope(scope, graduation.scopeType, graduation.scopeId);
    }

    // Aggregate scores from Ujian Praktek for each candidate
    const ujianPrakteks = await this.prisma.ujianPraktek.findMany({
      where: { kegiatanId: graduationId },
      include: {
        items: {
          include: {
            itemPenilaian: {
              select: { skorMaksimal: true, bobot: true }
            }
          }
        }
      }
    });

    for (const result of dto.results || []) {
      // Calculate aggregated score from all ujian praktek if not provided
      let calculatedTotalSkor = result.totalSkor;
      
      if (calculatedTotalSkor === undefined || calculatedTotalSkor === null) {
        // Aggregate from nilai_pendadaran
        const scores = await this.prisma.nilaiPendadaran.findMany({
          where: {
            kegiatanId: graduationId,
            calonAnggotaId: result.candidateId,
          },
          include: {
            itemPenilaian: {
              select: { skorMaksimal: true, bobot: true }
            }
          }
        });

        if (scores.length > 0) {
          // Calculate weighted score
          let totalWeightedScore = 0;
          let totalMaxWeight = 0;

          for (const score of scores) {
            const weight = score.itemPenilaian.bobot || 1;
            const maxScore = score.itemPenilaian.skorMaksimal || 100;
            const normalizedScore = (Number(score.skor) / maxScore) * 100;
            totalWeightedScore += normalizedScore * weight;
            totalMaxWeight += weight;
          }

          calculatedTotalSkor = totalMaxWeight > 0 
            ? (totalWeightedScore / totalMaxWeight) * 100 
            : 0;
        } else {
          calculatedTotalSkor = 0;
        }
      }

      const isLulus = result.lulus !== undefined 
        ? result.lulus 
        : Number(calculatedTotalSkor) >= 70; // Default passing grade

      await this.prisma.hasilPendadaran.create({
        data: {
          kegiatanId: graduationId,
          calonAnggotaId: result.candidateId,
          totalSkor: calculatedTotalSkor,
          ranking: result.ranking,
          statusKelulusan: isLulus ? 'lulus' : 'gagal',
          statusValidasi: 'pending',
        },
      });

      const candidate = await this.prisma.calonAnggota.update({
        where: { id: result.candidateId },
        data: { status: isLulus ? 'lulus' : 'gagal' },
      });

      if (candidate.email) {
        this.sendGraduationResultEmail(
          candidate.namaLengkap,
          candidate.email,
          isLulus,
          Number(calculatedTotalSkor),
        );
      }
    }

    // void — interceptor returns { success: true }
  }

  async generateDocuments(graduationId: string) {
    const graduates = await this.prisma.hasilPendadaran.findMany({
      where: { kegiatanId: graduationId, statusKelulusan: 'lulus' },
    });

    return { totalGraduates: graduates.length };
  }

  /**
   * Validate graduation results (Admin only)
   */
  async validateResults(graduationId: string, validatorUserId: string) {
    const results = await this.prisma.hasilPendadaran.findMany({
      where: { kegiatanId: graduationId, statusValidasi: 'pending' },
    });

    if (results.length === 0) {
      throw new BadRequestException('Tidak ada hasil yang perlu divalidasi');
    }

    await this.prisma.hasilPendadaran.updateMany({
      where: { kegiatanId: graduationId, statusValidasi: 'pending' },
      data: {
        statusValidasi: 'validated',
        divalidasiOleh: validatorUserId,
        divalidasiAt: new Date(),
      },
    });

    // Update candidates to 'menunggu_pelantikan' if validated and passed
    const passedCandidates = await this.prisma.hasilPendadaran.findMany({
      where: { 
        kegiatanId: graduationId, 
        statusKelulusan: 'lulus',
        statusValidasi: 'validated'
      },
      select: { calonAnggotaId: true }
    });

    for (const result of passedCandidates) {
      await this.prisma.calonAnggota.update({
        where: { id: result.calonAnggotaId },
        data: { status: 'menunggu_pelantikan' },
      });
    }

    return { validated: results.length };
  }

  /**
   * Get recapitulation of graduation results
   */
  async getRecapitulation(graduationId: string) {
    const results = await this.prisma.hasilPendadaran.findMany({
      where: { kegiatanId: graduationId },
      include: {
        calonAnggota: {
          select: {
            id: true,
            namaLengkap: true,
            email: true,
            ranting: { select: { nama: true } }
          }
        },
        kegiatan: { select: { nama: true, tanggalMulai: true } }
      },
      orderBy: { totalSkor: 'desc' }
    });

    const total = results.length;
    const lulus = results.filter(r => r.statusKelulusan === 'lulus').length;
    const gagal = results.filter(r => r.statusKelulusan === 'gagal').length;
    const validated = results.filter(r => r.statusValidasi === 'validated').length;
    const pending = results.filter(r => r.statusValidasi === 'pending').length;

    const averageScore = results.reduce((sum, r) => sum + Number(r.totalSkor), 0) / (total || 1);

    return {
      summary: {
        total,
        lulus,
        gagal,
        validated,
        pending,
        averageScore: Math.round(averageScore * 100) / 100,
        passingRate: total > 0 ? Math.round((lulus / total) * 10000) / 100 : 0,
      },
      results,
    };
  }

  // ═══════════════════════════════════════════════════════════
  //  PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════

  private async sendGraduationRegisteredEmail(
    nama: string,
    email: string,
    graduationId: string,
  ): Promise<void> {
    try {
      const graduation = await this.prisma.kegiatan.findUnique({
        where: { id: graduationId },
        select: { nama: true, tanggalMulai: true },
      });
      const namaPendadaran = graduation?.nama || 'Pendadaran';
      const tanggal = graduation?.tanggalMulai
        ? graduation.tanggalMulai.toLocaleDateString('id-ID', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
        : '-';
      const tpl = await this.mailService.renderWithOverride(
        'graduationRegisteredEmail',
        () => graduationRegisteredEmail(nama, namaPendadaran, tanggal),
        { nama, namaPendadaran, tanggal },
      );
      await this.mailService.sendMail({
        to: email,
        subject: tpl.subject,
        html: tpl.html,
        metadata: { module: 'graduations', template: 'graduationRegisteredEmail' },
      });
    } catch (error) {
      this.logger.error(`sendGraduationRegisteredEmail failed: ${(error as Error).message}`);
    }
  }

  private async sendGraduationResultEmail(
    nama: string,
    email: string,
    lulus: boolean,
    skor?: number,
  ): Promise<void> {
    try {
      const tpl = await this.mailService.renderWithOverride(
        'graduationResultEmail',
        () => graduationResultEmail(nama, lulus, skor),
        { nama, lulus: lulus ? 'Lulus' : 'Gagal', skor: String(skor || 0) },
      );
      await this.mailService.sendMail({
        to: email,
        subject: tpl.subject,
        html: tpl.html,
        metadata: { module: 'graduations', template: 'graduationResultEmail' },
      });
    } catch (error) {
      this.logger.error(
        `sendGraduationResultEmail failed for ${email}: ${(error as Error).message}`,
      );
    }
  }
}
