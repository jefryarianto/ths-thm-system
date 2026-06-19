import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../mail/mail.service';
import { graduationResultEmail, graduationRegisteredEmail } from '../../mail/email-templates';
import {
  CreateGraduationDto,
  GraduationFilterDto,
  RegisterParticipantDto,
  GraduateDto,
} from './dto/graduation.dto';
import { UserScope } from '../../common/interfaces/user-scope.interface';
import { ScopeHelper } from '../../common/utils/scope-helpers';
import { MemberMailService } from '../../common/services/member-mail.service';
import { paginate } from '../../common/utils/pagination';

@Injectable()
export class GraduationsService {
  private readonly logger = new Logger(GraduationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeHelper: ScopeHelper,
    private readonly mailService: MailService,
    private readonly memberMailService: MemberMailService,
  ) {}

  async findAll(query: GraduationFilterDto, scope?: UserScope) {
    const where: Record<string, unknown> = { tipe: 'pendadaran' };

    if (scope?.rantingId) {
      where.OR = [
        { scopeType: 'ranting', scopeId: scope.rantingId },
        { scopeType: 'unit_latihan', scopeId: scope.rantingId },
      ];
    } else if (scope?.wilayahId) {
      where.OR = [{ scopeType: 'wilayah', scopeId: scope.wilayahId }, { scopeType: 'ranting' }];
    } else if (scope?.distrikId) {
      where.OR = [
        { scopeType: 'distrik', scopeId: scope.distrikId },
        { scopeType: 'wilayah' },
        { scopeType: 'ranting' },
      ];
    }

    if (query.status) where.status = query.status;

    return paginate(this.prisma.kegiatan, where, {
      page: query.page,
      limit: query.limit,
      orderBy: { tanggalMulai: 'desc' },
    });
  }

  async findOne(id: string, scope?: UserScope) {
    const graduation = await this.prisma.kegiatan.findUnique({ where: { id } });
    if (!graduation) throw new NotFoundException('Pendadaran tidak ditemukan');
    this.scopeHelper.verifyKegiatanScope(scope, graduation.scopeType, graduation.scopeId);
    return { success: true, data: graduation };
  }

  async create(dto: CreateGraduationDto, scope?: UserScope) {
    if (scope?.rantingId && !dto.scopeId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (dto as any).scopeId = scope.rantingId;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (dto as any).scopeType = 'ranting';
    }
    const graduation = await this.prisma.kegiatan.create({
      data: {
        nama: dto.nama,
        lokasi: dto.lokasi,
        tanggalMulai: new Date(dto.tanggalMulai),
        tanggalSelesai: dto.tanggalSelesai ? new Date(dto.tanggalSelesai) : undefined,
        scopeType: dto.scopeType as
          | 'nasional'
          | 'distrik'
          | 'wilayah'
          | 'ranting'
          | 'unit_latihan'
          | undefined,
        scopeId: dto.scopeId,
        tipe: 'pendadaran',
        status: 'draft',
      } as never,
    });
    return { success: true, data: graduation, message: 'Pendadaran berhasil dibuat' };
  }

  async registerParticipant(graduationId: string, dto: RegisterParticipantDto) {
    const candidate = await this.prisma.calonAnggota.update({
      where: { id: dto.candidateId },
      data: { status: 'mengikuti_pendadaran' },
    });

    if (candidate.email) {
      this.sendGraduationRegisteredEmail(candidate.namaLengkap, candidate.email, graduationId);
    }

    return { success: true, data: candidate, message: 'Peserta berhasil didaftarkan' };
  }

  async unregisterParticipant(_graduationId: string, dto: RegisterParticipantDto) {
    await this.prisma.calonAnggota.update({
      where: { id: dto.candidateId },
      data: { status: 'diusulkan' },
    });
    return { success: true, message: 'Peserta berhasil dibatalkan' };
  }

  async getParticipants(_graduationId: string) {
    const participants = await this.prisma.calonAnggota.findMany({
      where: { status: 'mengikuti_pendadaran' },
      include: { ranting: true },
    });
    return { success: true, data: participants };
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
    return { success: true, data: { imported }, message: `${imported} peserta berhasil diimpor` };
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

    return { success: true, message: 'Hasil pendadaran berhasil disimpan' };
  }

  async generateDocuments(graduationId: string) {
    const graduates = await this.prisma.hasilPendadaran.findMany({
      where: { kegiatanId: graduationId, statusKelulusan: 'lulus' },
    });

    return {
      success: true,
      data: { totalGraduates: graduates.length, message: 'Dokumen dalam antrian generate' },
    };
  }

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
