import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../mail/mail.service';
import { activityInvitationEmail } from '../../mail/email-templates';
import {
  CreateActivityDto,
  UpdateActivityDto,
  ActivityFilterDto,
  AddParticipantDto,
  RecordPresenceDto,
  UploadActivityDocumentDto,
} from './dto/activity.dto';
import { UserScope } from '../../common/interfaces/user-scope.interface';
import { ScopeHelper } from '../../common/utils/scope-helpers';
import { CacheService } from '../../common/services/cache.service';
import { MemberMailService } from '../../common/services/member-mail.service';
import { paginate } from '../../common/utils/pagination';

@Injectable()
export class ActivitiesService {
  private readonly logger = new Logger(ActivitiesService.name);
  private readonly CACHE_PREFIX = 'activities:';

  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeHelper: ScopeHelper,
    private readonly cache: CacheService,
    private readonly mailService: MailService,
    private readonly memberMailService: MemberMailService,
  ) {}

  async findAll(query: ActivityFilterDto, scope?: UserScope) {
    const cacheKey = `${this.CACHE_PREFIX}list:${scope?.rantingId || scope?.wilayahId || scope?.distrikId || 'all'}:${query.page || 1}:${query.limit || 10}:${query.tipe || ''}:${query.status || ''}:${query.scopeType || ''}`;

    return this.cache.getOrSet(
      cacheKey,
      async () => {
        const where: Record<string, unknown> = { tipe: { not: 'pendadaran' } };

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

        if (query.tipe) where.tipe = query.tipe;
        if (query.status) where.status = query.status;
        if (query.scopeType) where.scopeType = query.scopeType;

        return paginate(this.prisma.kegiatan, where, {
          page: query.page,
          limit: query.limit,
          orderBy: { tanggalMulai: 'desc' },
          include: {
            creator: { select: { id: true, namaLengkap: true } },
            peserta: true,
            presensi: true,
            dokumenKegiatan: true,
          },
        });
      },
      30,
    );
  }

  async findOne(id: string, scope?: UserScope) {
    const cacheKey = `${this.CACHE_PREFIX}detail:${id}`;

    return this.cache.getOrSet(
      cacheKey,
      async () => {
        const activity = await this.prisma.kegiatan.findUnique({
          where: { id },
          include: {
            creator: { select: { id: true, namaLengkap: true } },
            peserta: {
              include: { anggota: { select: { id: true, nomorAnggota: true, namaLengkap: true } } },
            },
            presensi: true,
            dokumenKegiatan: true,
          },
        });
        if (!activity) throw new NotFoundException('Kegiatan tidak ditemukan');
        this.scopeHelper.verifyKegiatanScope(scope, activity.scopeType, activity.scopeId);
        return { success: true, data: activity };
      },
      30,
    );
  }

  async create(dto: CreateActivityDto, scope?: UserScope, userId?: string) {
    if (scope?.rantingId && !dto.scopeId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (dto as any).scopeId = scope.rantingId;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (dto as any).scopeType = 'ranting';
    }
    const activity = await this.prisma.kegiatan.create({
      data: {
        nama: dto.nama,
        tipe: dto.tipe,
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
        status: dto.status || 'draft',
        createdBy: userId,
      } as never,
    });
    this.cache.invalidatePrefix(this.CACHE_PREFIX);
    return { success: true, data: activity, message: 'Kegiatan berhasil dibuat' };
  }

  async update(id: string, dto: UpdateActivityDto, scope?: UserScope) {
    if (scope) {
      const activity = await this.prisma.kegiatan.findUnique({
        where: { id },
        select: { scopeType: true, scopeId: true },
      });
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
      const activity = await this.prisma.kegiatan.findUnique({
        where: { id },
        select: { scopeType: true, scopeId: true },
      });
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
    this.sendActivityInvitation(
      dto.anggotaId,
      kegiatan.nama,
      kegiatan.tanggalMulai,
      kegiatan.lokasi,
    );

    this.cache.invalidatePrefix(this.CACHE_PREFIX);
    return { success: true, data: participant, message: 'Peserta berhasil ditambahkan' };
  }

  async removeParticipant(activityId: string, participantId: string) {
    await this.prisma.kegiatanPeserta.delete({ where: { id: participantId } });
    this.cache.invalidatePrefix(this.CACHE_PREFIX);
    return { success: true, message: 'Peserta berhasil dihapus' };
  }

  async importParticipants(
    activityId: string,
    data: Array<{ anggotaId?: string; memberId?: string }>,
  ) {
    const kegiatan = await this.prisma.kegiatan.findUnique({ where: { id: activityId } });
    if (!kegiatan) throw new NotFoundException('Kegiatan tidak ditemukan');

    // Collect all valid anggotaIds for batch check
    const allAnggotaIds = data
      .map((row) => row.anggotaId || row.memberId)
      .filter(Boolean) as string[];

    if (allAnggotaIds.length === 0) {
      return { success: true, data: { imported: 0 }, message: 'Tidak ada peserta untuk diimpor' };
    }

    // Batch check existing participants (single query instead of N)
    const existingRecords = await this.prisma.kegiatanPeserta.findMany({
      where: { kegiatanId: activityId, anggotaId: { in: allAnggotaIds } },
      select: { anggotaId: true },
    });
    const existingSet = new Set(existingRecords.map((r) => r.anggotaId));

    // Filter only new participants
    const newEntries = data.filter((row) => {
      const id = row.anggotaId || row.memberId;
      return id && !existingSet.has(id);
    });

    if (newEntries.length > 0) {
      // Batch insert all new participants (single query instead of N)
      await this.prisma.kegiatanPeserta.createMany({
        data: newEntries.map((row) => ({
          kegiatanId: activityId,
          anggotaId: (row.anggotaId || row.memberId)!,
        })),
      });

      // Send invitation emails in parallel (fire-and-forget, errors handled internally)
      await Promise.allSettled(
        newEntries.map((row) =>
          this.sendActivityInvitation(
            row.anggotaId || row.memberId!,
            kegiatan.nama,
            kegiatan.tanggalMulai,
            kegiatan.lokasi,
          ),
        ),
      );
    }

    this.cache.invalidatePrefix(this.CACHE_PREFIX);
    return {
      success: true,
      data: { imported: newEntries.length },
      message: `${newEntries.length} peserta berhasil diimpor`,
    };
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
      data: {
        kegiatanId: activityId,
        nama: dto.nama,
        filePath: dto.filePath,
        tipe: dto.tipe || 'dokumen',
      },
    });
    this.cache.invalidatePrefix(this.CACHE_PREFIX);
    return { success: true, data: doc, message: 'Dokumen berhasil diupload' };
  }

  private async sendActivityInvitation(
    anggotaId: string,
    activityName: string,
    tanggalMulai: Date,
    lokasi: string | null,
  ): Promise<void> {
    const tanggal = tanggalMulai.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    await this.memberMailService.sendToMemberWithArgs(
      anggotaId,
      activityInvitationEmail,
      [activityName, tanggal, lokasi || '-'],
      { template: 'activityInvitationEmail' },
      'activities',
      {
        kegiatanNama: activityName,
        tanggal,
        lokasi: lokasi || '-',
      },
    );
  }
}
