import { Injectable, NotFoundException } from '@nestjs/common';
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
import { BaseCrudService } from '../../common/utils/base-crud.service';
import { MemberMailService } from '../../common/services/member-mail.service';

@Injectable()
export class ActivitiesService extends BaseCrudService<CreateActivityDto, UpdateActivityDto> {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly scopeHelper: ScopeHelper,
    protected readonly cache: CacheService,
    private readonly mailService: MailService,
    private readonly memberMailService: MemberMailService,
  ) {
    super(prisma, scopeHelper, cache, {
      model: 'kegiatan',
      prefix: 'activities:',
      scopeStrategy: 'kegiatan',
    });
  }

  // ── Hooks ───────────────────────────────────────────────

  protected async beforeCreate(
    dto: CreateActivityDto,
    scope?: UserScope,
    userId?: string,
  ): Promise<Record<string, unknown>> {
    const data: Record<string, unknown> = {
      nama: dto.nama,
      tipe: dto.tipe,
      lokasi: dto.lokasi,
      tanggalMulai: new Date(dto.tanggalMulai),
      scopeType: dto.scopeType || (scope?.rantingId ? 'ranting' : undefined),
      scopeId: dto.scopeId || scope?.rantingId,
      status: dto.status || 'draft',
      createdBy: userId,
    };
    if (dto.tanggalSelesai) {
      data.tanggalSelesai = new Date(dto.tanggalSelesai);
    }
    return data;
  }

  protected async beforeUpdate(
    _id: string,
    dto: UpdateActivityDto,
  ): Promise<Record<string, unknown>> {
    const data: Record<string, unknown> = {};
    if (dto.nama !== undefined) data.nama = dto.nama;
    if (dto.lokasi !== undefined) data.lokasi = dto.lokasi;
    if (dto.tanggalMulai !== undefined) data.tanggalMulai = new Date(dto.tanggalMulai);
    if (dto.tanggalSelesai !== undefined) data.tanggalSelesai = new Date(dto.tanggalSelesai);
    if (dto.status !== undefined) data.status = dto.status;
    return data;
  }

  // ── CRUD Overrides ──────────────────────────────────────

  async findAll(query: ActivityFilterDto, scope?: UserScope) {
    const cacheKey = `${this.CACHE_PREFIX}list:${scope?.rantingId || scope?.wilayahId || scope?.distrikId || 'all'}:${query.page || 1}:${query.limit || 10}:${query.tipe || ''}:${query.status || ''}:${query.scopeType || ''}`;

    return this.baseFindAll(
      cacheKey,
      async () => {
        const where: Record<string, unknown> = { tipe: { not: 'pendadaran' } };

        // Use base class's buildKegiatanScopeFilter — identical to original OR logic
        if (scope) {
          const scopeFilter = this.buildKegiatanScopeFilter(scope);
          if (Object.keys(scopeFilter).length > 0) {
            Object.assign(where, scopeFilter);
          }
        }

        if (query.tipe) where.tipe = query.tipe;
        if (query.status) where.status = query.status;
        if (query.scopeType) where.scopeType = query.scopeType;

        return where;
      },
      {
        page: query.page,
        limit: query.limit,
        orderBy: { tanggalMulai: 'desc' },
        include: {
          creator: { select: { id: true, namaLengkap: true } },
          peserta: true,
          presensi: true,
          dokumenKegiatan: true,
        },
      },
      30,
    );
  }

  async findOne(id: string, scope?: UserScope) {
    const cacheKey = `${this.CACHE_PREFIX}detail:${id}`;
    return this.cache.getOrSet(
      cacheKey,
      async () => {
        return this.baseFindOne(id, scope, {
          creator: { select: { id: true, namaLengkap: true } },
          peserta: {
            include: {
              anggota: { select: { id: true, nomorAnggota: true, namaLengkap: true } },
            },
          },
          presensi: true,
          dokumenKegiatan: true,
        });
      },
      30,
    );
  }

  async create(dto: CreateActivityDto, scope?: UserScope, userId?: string) {
    return this.baseCreate(dto, scope, userId, 'Kegiatan berhasil dibuat');
  }

  async update(id: string, dto: UpdateActivityDto, scope?: UserScope) {
    return this.baseUpdate(id, dto, scope, 'Kegiatan berhasil diperbarui');
  }

  /**
   * Custom soft-cancel: sets status → 'cancelled' instead of hard-deleting.
   * Base class's baseRemove only supports hard-delete or deletedAt soft-delete,
   * so we handle this directly while reusing verifyScope from the base class.
   */
  async remove(id: string, scope?: UserScope) {
    await this.verifyScope(id, scope);
    await this.prismaDelegate.update({ where: { id }, data: { status: 'cancelled' } });
    this.invalidateCache();
    return { message: 'Kegiatan dibatalkan' };
  }

  // ── Domain Methods ──────────────────────────────────────

  async addParticipant(activityId: string, dto: AddParticipantDto) {
    const kegiatan = await this.prismaDelegate.findUnique({
      where: { id: activityId },
    });
    if (!kegiatan) throw new NotFoundException('Kegiatan tidak ditemukan');

    const participant = await (this.prisma as any).kegiatanPeserta.create({
      data: { kegiatanId: activityId, anggotaId: dto.anggotaId },
    });

    // Send invitation email (fire-and-forget, errors handled internally)
    this.sendActivityInvitation(
      dto.anggotaId,
      kegiatan.nama,
      kegiatan.tanggalMulai,
      kegiatan.lokasi,
    );

    this.invalidateCache();
    return { data: participant, message: 'Peserta berhasil ditambahkan' };
  }

  async removeParticipant(activityId: string, participantId: string) {
    await (this.prisma as any).kegiatanPeserta.delete({
      where: { id: participantId },
    });
    this.invalidateCache();
    return { message: 'Peserta berhasil dihapus' };
  }

  async importParticipants(
    activityId: string,
    data: Array<{ anggotaId?: string; memberId?: string }>,
  ) {
    const kegiatan = await this.prismaDelegate.findUnique({
      where: { id: activityId },
    });
    if (!kegiatan) throw new NotFoundException('Kegiatan tidak ditemukan');

    const allAnggotaIds = data
      .map((row) => row.anggotaId || row.memberId)
      .filter(Boolean) as string[];

    if (allAnggotaIds.length === 0) {
      return { data: { imported: 0 }, message: 'Tidak ada peserta untuk diimpor' };
    }

    // Batch check existing participants
    const existingRecords = await (this.prisma as any).kegiatanPeserta.findMany({
      where: { kegiatanId: activityId, anggotaId: { in: allAnggotaIds } },
      select: { anggotaId: true },
    });
    const existingSet = new Set(existingRecords.map((r: any) => r.anggotaId));

    const newEntries = data.filter((row) => {
      const id = row.anggotaId || row.memberId;
      return id && !existingSet.has(id);
    });

    if (newEntries.length > 0) {
      // Batch insert
      await (this.prisma as any).kegiatanPeserta.createMany({
        data: newEntries.map((row) => ({
          kegiatanId: activityId,
          anggotaId: (row.anggotaId || row.memberId)!,
        })),
      });

      // Send invitation emails in parallel
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

    this.invalidateCache();
    return {
      data: { imported: newEntries.length },
      message: `${newEntries.length} peserta berhasil diimpor`,
    };
  }

  async getPresence(activityId: string) {
    const presence = await (this.prisma as any).presensiKegiatan.findMany({
      where: { kegiatanId: activityId },
      include: {
        anggota: { select: { id: true, nomorAnggota: true, namaLengkap: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return { data: presence };
  }

  async recordPresence(activityId: string, dto: RecordPresenceDto) {
    const kegiatan = await this.prismaDelegate.findUnique({
      where: { id: activityId },
    });
    if (!kegiatan) throw new NotFoundException('Kegiatan tidak ditemukan');

    const presence = await (this.prisma as any).presensiKegiatan.create({
      data: { kegiatanId: activityId, anggotaId: dto.anggotaId, hadir: dto.hadir !== false },
    });
    this.invalidateCache();
    return { data: presence, message: 'Kehadiran tercatat' };
  }

  async getDocuments(activityId: string) {
    const docs = await (this.prisma as any).dokumenKegiatan.findMany({
      where: { kegiatanId: activityId },
      orderBy: { createdAt: 'desc' },
    });
    return { data: docs };
  }

  async uploadDocument(activityId: string, dto: UploadActivityDocumentDto) {
    const doc = await (this.prisma as any).dokumenKegiatan.create({
      data: {
        kegiatanId: activityId,
        nama: dto.nama,
        filePath: dto.filePath,
        tipe: dto.tipe || 'dokumen',
      },
    });
    this.invalidateCache();
    return { data: doc, message: 'Dokumen berhasil diupload' };
  }

  // ── Private Helpers ─────────────────────────────────────

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
