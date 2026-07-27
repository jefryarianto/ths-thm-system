import { Injectable, NotFoundException } from '@nestjs/common';
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

    for (const result of dto.results || []) {
      await this.prisma.hasilPendadaran.create({
        data: {
          kegiatanId: graduationId,
          calonAnggotaId: result.candidateId,
          totalSkor: result.totalSkor,
          ranking: result.ranking,
          statusKelulusan: result.lulus ? 'lulus' : 'gagal',
          statusValidasi: 'pending',
        },
      });

      const candidate = await this.prisma.calonAnggota.update({
        where: { id: result.candidateId },
        data: { status: result.lulus ? 'lulus' : 'gagal' },
      });

      if (candidate.email) {
        this.sendGraduationResultEmail(
          candidate.namaLengkap,
          candidate.email,
          result.lulus,
          result.totalSkor,
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
