import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../mail/mail.service';
import { activityInvitationEmail } from '../../mail/email-templates';
import { CreateActivityDto, UpdateActivityDto, ActivityFilterDto, AddParticipantDto, RecordPresenceDto, UploadActivityDocumentDto } from './dto/activity.dto';
import { UserScope } from '../../common/interfaces/user-scope.interface';
import { ScopeHelper } from '../../common/utils/scope-helpers';
import { CacheService } from '../../common/services/cache.service';

@Injectable()
export class ActivitiesService {
  private readonly logger = new Logger(ActivitiesService.name);
  private readonly CACHE_PREFIX = 'activities:';

  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeHelper: ScopeHelper,
    private readonly cache: CacheService,
    private readonly mailService: MailService,
  ) {}

  async findAll(query: ActivityFilterDto, scope?: UserScope) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const cacheKey = `${this.CACHE_PREFIX}list:${scope?.rantingId || scope?.wilayahId || scope?.distrikId || 'all'}:${page}:${limit}:${query.tipe || ''}:${query.status || ''}:${query.scopeType || ''}`;

    return this.cache.getOrSet(cacheKey, async () => {
      const where: Record<string, unknown> = { tipe: { not: 'pendadaran' } };

      if (scope?.rantingId) {
        where.OR = [
          { scopeType: 'ranting', scopeId: scope.rantingId },
          { scopeType: 'unit_latihan', scopeId: scope.rantingId },
        ];
      } else if (scope?.wilayahId) {
        where.OR = [
          { scopeType: 'wilayah', scopeId: scope.wilayahId },
          { scopeType: 'ranting' },
        ];
      } else if (scope?.distrikId) {
        where.OR = [
          { scopeType: 'distrik', scopeId: scope.distrikId },
          { scopeType: 'wilayah' },
          { scopeType: 'ranting' },
        ];
      }

      if (query.tipe) where.tipe = query.tipe;
      if (query.status) where.status = query.status;
      if (query.scopeType) where.scopeType = query.scopeType;

      const [data, total] = await Promise.all([
        this.prisma.kegiatan.findMany({
          where, skip: (page - 1) * limit, take: limit,
          include: { creator: { select: { id: true, namaLengkap: true } }, peserta: true, presensi: true, dokumenKegiatan: true },
          orderBy: { tanggalMulai: 'desc' },
        }),
        this.prisma.kegiatan.count({ where }),
      ]);
      return { success: true, data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    }, 30);
  }

  async findOne(id: string, scope?: UserScope) {
    const cacheKey = `${this.CACHE_PREFIX}detail:${id}`;

    return this.cache.getOrSet(cacheKey, async () => {
      const activity = await this.prisma.kegiatan.findUnique({
        where: { id },
        include: { creator: { select: { id: true, namaLengkap: true } }, peserta: { include: { anggota: { select: { id: true, nomorAnggota: true, namaLengkap: true } } } }, presensi: true, dokumenKegiatan: true },
      });
      if (!activity) throw new NotFoundException('Kegiatan tidak ditemukan');
      this.scopeHelper.verifyKegiatanScope(scope, activity.scopeType, activity.scopeId);
      return { success: true, data: activity };
    }, 30);
  }

  async create(dto: CreateActivityDto, scope?: UserScope) {
    if (scope?.rantingId && !dto.scopeId) {
      (dto as any).scopeId = scope.rantingId;
      (dto as any).scopeType = 'ranting';
    }
    const activity = await this.prisma.kegiatan.create({
      data: {
        nama: dto.nama,
        tipe: dto.tipe,
        lokasi: dto.lokasi,
        tanggalMulai: new Date(dto.tanggalMulai),
        tanggalSelesai: dto.tanggalSelesai ? new Date(dto.tanggalSelesai) : undefined,
        scopeType: dto.scopeType as 'nasional' | 'distrik' | 'wilayah' | 'ranting' | 'unit_latihan' | undefined,
        scopeId: dto.scopeId,
        status: dto.status || 'draft',
        createdById: dto.createdById,
      } as never,
    });
    this.cache.invalidatePrefix(this.CACHE_PREFIX);
    return { success: true, data: activity, message: 'Kegiatan berhasil dibuat' };
  }

  async update(id: string, dto: UpdateActivityDto, scope?: UserScope) {
    if (scope) {
      const activity = await this.prisma.kegiatan.findUnique({ where: { id }, select: { scopeType: true, scopeId: true } });
      if (!activity) throw new NotFoundException('Kegiatan tidak ditemukan');
      this.scopeHelper.verifyKegiatanScope(scope, activity.scopeType, activity.scopeId);
    }

    const data: Record<string, unknown> = {};
    if (dto.nama) data.nama = dto.nama;
    if (dto.lokasi) data.lokasi = dto.lokasi;
    if (dto.tanggalMulai) data.tanggalMulai = new Date(dto.tanggalMulai);
    if (dto.tanggalSelesai) data.tanggalSelesai = new Date(dto.tanggalSelesai);
    if (dto.status) data.status = dto.status;

    const activity = await this.prisma.kegiatan.update({ where: { id }, data });
    this.cache.invalidatePrefix(this.CACHE_PREFIX);
    return { success: true, data: activity, message: 'Kegiatan berhasil diperbarui' };
  }

  async remove(id: string, scope?: UserScope) {
    if (scope) {
      const activity = await this.prisma.kegiatan.findUnique({ where: { id }, select: { scopeType: true, scopeId: true } });
      if (!activity) throw new NotFoundException('Kegiatan tidak ditemukan');
      this.scopeHelper.verifyKegiatanScope(scope, activity.scopeType, activity.scopeId);
    }

    await this.prisma.kegiatan.update({ where: { id }, data: { status: 'cancelled' } });
    this.cache.invalidatePrefix(this.CACHE_PREFIX);
    return { success: true, message: 'Kegiatan dibatalkan' };
  }

  async addParticipant(activityId: string, dto: AddParticipantDto) {
    const kegiatan = await this.prisma.kegiatan.findUnique({ where: { id: activityId } });
    if (!kegiatan) throw new NotFoundException('Kegiatan tidak ditemukan');

    const participant = await this.prisma.kegiatanPeserta.create({
      data: { kegiatanId: activityId, anggotaId: dto.anggotaId },
    });

    // Send invitation email to participant (method handles errors internally)
    this.sendActivityInvitation(dto.anggotaId, kegiatan.nama, kegiatan.tanggalMulai, kegiatan.lokasi);

    this.cache.invalidatePrefix(this.CACHE_PREFIX);
    return { success: true, data: participant, message: 'Peserta berhasil ditambahkan' };
  }

  async removeParticipant(activityId: string, participantId: string) {
    await this.prisma.kegiatanPeserta.delete({ where: { id: participantId } });
    this.cache.invalidatePrefix(this.CACHE_PREFIX);
    return { success: true, message: 'Peserta berhasil dihapus' };
  }

  async importParticipants(activityId: string, data: Array<{ anggotaId?: string; memberId?: string }>) {
    const kegiatan = await this.prisma.kegiatan.findUnique({ where: { id: activityId } });
    if (!kegiatan) throw new NotFoundException('Kegiatan tidak ditemukan');

    let imported = 0;
    for (const row of data) {
      const anggotaId = row.anggotaId || row.memberId;
      if (!anggotaId) continue;
      const existing = await this.prisma.kegiatanPeserta.findFirst({
        where: { kegiatanId: activityId, anggotaId },
      });
      if (!existing) {
        await this.prisma.kegiatanPeserta.create({
          data: { kegiatanId: activityId, anggotaId },
        });
        imported++;

        // Send invitation email to each new participant (method handles errors internally)
        this.sendActivityInvitation(anggotaId, kegiatan.nama, kegiatan.tanggalMulai, kegiatan.lokasi);
      }
    }
    this.cache.invalidatePrefix(this.CACHE_PREFIX);
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

  async recordPresence(activityId: string, dto: RecordPresenceDto) {
    const kegiatan = await this.prisma.kegiatan.findUnique({ where: { id: activityId } });
    if (!kegiatan) throw new NotFoundException('Kegiatan tidak ditemukan');

    const presence = await this.prisma.presensiKegiatan.create({
      data: { kegiatanId: activityId, anggotaId: dto.anggotaId, hadir: dto.hadir !== false },
    });
    this.cache.invalidatePrefix(this.CACHE_PREFIX);
    return { success: true, data: presence, message: 'Kehadiran tercatat' };
  }

  async getDocuments(activityId: string) {
    const docs = await this.prisma.dokumenKegiatan.findMany({
      where: { kegiatanId: activityId },
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, data: docs };
  }

  async uploadDocument(activityId: string, dto: UploadActivityDocumentDto) {
    const doc = await this.prisma.dokumenKegiatan.create({
      data: { kegiatanId: activityId, nama: dto.nama, filePath: dto.filePath, tipe: dto.tipe || 'dokumen' },
    });
    this.cache.invalidatePrefix(this.CACHE_PREFIX);
    return { success: true, data: doc, message: 'Dokumen berhasil diupload' };
  }

  private async sendActivityInvitation(anggotaId: string, activityName: string, tanggalMulai: Date, lokasi: string | null): Promise<void> {
    try {
      const member = await this.prisma.anggota.findUnique({
        where: { id: anggotaId },
        select: { email: true, namaLengkap: true },
      });
      if (!member?.email) return;

      const tanggal = tanggalMulai.toLocaleDateString('id-ID', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      });

      const tpl = activityInvitationEmail(member.namaLengkap, activityName, tanggal, lokasi || '-');
      await this.mailService.sendMail({ to: member.email, ...tpl });
    } catch (error) {
      this.logger.error(`sendActivityInvitation failed for member ${anggotaId}: ${(error as Error).message}`);
    }
  }
}
