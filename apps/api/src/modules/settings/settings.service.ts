import { Injectable, Optional } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ScopeHelper } from '../../common/utils/scope-helpers';
import { CacheService } from '../../common/services/cache.service';
import { PersistentAuditService } from '../../common/services/persistent-audit.service';
import { BaseCrudService } from '../../common/utils/base-crud.service';
import {
  CreatePeriodDto,
  UpdatePeriodDto,
  CreateSignatureDto,
  CreateStampDto,
} from './dto/setting.dto';

@Injectable()
export class SettingsService extends BaseCrudService<CreatePeriodDto, UpdatePeriodDto> {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly scopeHelper: ScopeHelper,
    protected readonly cache: CacheService,
    @Optional() protected readonly persistentAudit?: PersistentAuditService,
  ) {
    super(prisma, scopeHelper, cache, {
      model: 'periode',
      prefix: 'settings:',
      notFound: 'Periode tidak ditemukan',
    }, persistentAudit);
  }

  // ── Key-Value Settings ──────────────────────────────

  async getSettings() {
    return this.prisma.setting.findMany();
  }    async updateSettings(dto: Record<string, unknown>) {
    for (const [key, value] of Object.entries(dto)) {
      await this.prisma.setting.upsert({
        where: { key },
        update: { value: value as never },
        create: { key, value: value as never },
      });
    }
    this.audit('SETTINGS_UPDATE', 'Setting', 'settings', undefined, { keys: Object.keys(dto) });
  }

  // ── Period CRUD (via BaseCrudService) ──────────────

  protected async beforeCreate(
    dto: CreatePeriodDto,
  ): Promise<Record<string, unknown>> {
    const data: Record<string, unknown> = { nama: dto.nama };
    if (dto.tglMulai) data.tglMulai = new Date(dto.tglMulai);
    if (dto.tglSelesai) data.tglSelesai = new Date(dto.tglSelesai);
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    return data;
  }

  protected async beforeUpdate(
    _id: string,
    dto: UpdatePeriodDto,
  ): Promise<Record<string, unknown>> {
    const data: Record<string, unknown> = {};
    if (dto.nama !== undefined) data.nama = dto.nama;
    if (dto.tglMulai !== undefined) data.tglMulai = new Date(dto.tglMulai);
    if (dto.tglSelesai !== undefined) data.tglSelesai = new Date(dto.tglSelesai);
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    return data;
  }

  async getPeriods() {
    return this.prisma.periode.findMany({ orderBy: { tglMulai: 'desc' } });
  }

  async getPeriod(id: string) {
    return this.baseFindOne(id);
  }

  async createPeriod(dto: CreatePeriodDto) {
    return this.baseCreate(dto);
  }

  async updatePeriod(id: string, dto: UpdatePeriodDto) {
    return this.baseUpdate(id, dto);
  }

  async deletePeriod(id: string) {
    await this.baseRemove(id);
  }

  // ── Roles ─────────────────────────────────────────

  async getRoles() {
    return [
      { role: 'superadmin', label: 'Super Admin', permissions: ['*'] },
      {
        role: 'admin_distrik',
        label: 'Admin Distrik',
        permissions: ['members', 'candidates', 'trainings', 'graduations', 'reports'],
      },
      {
        role: 'admin_wilayah',
        label: 'Admin Wilayah',
        permissions: ['members', 'candidates', 'trainings', 'reports'],
      },
      { role: 'admin_ranting', label: 'Admin Ranting', permissions: ['members', 'candidates'] },
      {
        role: 'admin_kegiatan',
        label: 'Admin Kegiatan',
        permissions: ['trainings', 'graduations', 'activities'],
      },
      { role: 'penguji', label: 'Penguji', permissions: ['assessments'] },
      { role: 'anggota', label: 'Anggota', permissions: ['profile', 'documents', 'dues'] },
    ];
  }

  // ── Signatures & Stamps ───────────────────────────

  async uploadSignature(dto: CreateSignatureDto) {
    // Hanya satu tanda tangan aktif PER SCOPE; nonaktifkan yang lama (atomik).
    return this.prisma.$transaction(async (tx) => {
      if (dto.isActive) {
        await tx.tandaTangan.updateMany({
          where: { isActive: true, distrikId: dto.distrikId ?? null },
          data: { isActive: false },
        });
      }
      return tx.tandaTangan.create({ data: { ...dto, distrikId: dto.distrikId ?? null } });
    });
  }

  async getSignatures() {
    return this.prisma.tandaTangan.findMany({
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
      include: {
        user: { select: { namaLengkap: true } },
        distrik: { select: { id: true, nama: true } },
      },
    });
  }

  async deleteSignature(id: string) {
    await this.prisma.tandaTangan.delete({ where: { id } });
  }

  async uploadStamp(dto: CreateStampDto) {
    // Hanya satu stempel aktif PER SCOPE — nonaktifkan yang lama saat upload baru (atomik).
    return this.prisma.$transaction(async (tx) => {
      if (dto.isActive) {
        await tx.stempel.updateMany({
          where: { isActive: true, distrikId: dto.distrikId ?? null },
          data: { isActive: false },
        });
      }
      return tx.stempel.create({ data: { ...dto, distrikId: dto.distrikId ?? null } });
    });
  }

  /** Stempel aktif: distrik dulu, fallback global. */
  async getStamp(distrikId?: string) {
    if (distrikId) {
      const scoped = await this.prisma.stempel.findFirst({
        where: { isActive: true, distrikId },
        orderBy: { updatedAt: 'desc' },
      });
      if (scoped) return scoped;
    }
    return this.prisma.stempel.findFirst({
      where: { isActive: true, distrikId: null },
      orderBy: { updatedAt: 'desc' },
    });
  }

  // ── Sejarah (public content) ──────────────────────

  async getSejarah() {
    let record = await (this.prisma as any).sejarah.findFirst();
    if (!record) {
      record = await (this.prisma as any).sejarah.create({
        data: { konten: '', isVisible: true },
      });
    }
    return record;
  }

  async updateSejarah(body: { konten: string; isVisible?: boolean }) {
    const existing = await (this.prisma as any).sejarah.findFirst();
    let result;
    if (existing) {
      result = await (this.prisma as any).sejarah.update({
        where: { id: existing.id },
        data: {
          konten: body.konten,
          ...(body.isVisible !== undefined && { isVisible: body.isVisible }),
        },
      });
    } else {
      result = await (this.prisma as any).sejarah.create({
        data: {
          konten: body.konten,
          isVisible: body.isVisible ?? true,
        },
      });
    }
    this.audit('SEJARAH_UPDATE', 'Sejarah', 'sejarah', undefined, { id: result?.id });
    return result;
  }

  // ── Organisasi (public content) ────────────────────

  async getOrganisasi() {
    let record = await (this.prisma as any).organisasi.findFirst();
    if (!record) {
      record = await (this.prisma as any).organisasi.create({
        data: { struktur: [], isVisible: true },
      });
    }
    return record;
  }

  async updateOrganisasi(body: { struktur: unknown; isVisible?: boolean }) {
    const existing = await (this.prisma as any).organisasi.findFirst();
    let result;
    if (existing) {
      result = await (this.prisma as any).organisasi.update({
        where: { id: existing.id },
        data: {
          struktur: body.struktur,
          ...(body.isVisible !== undefined && { isVisible: body.isVisible }),
        },
      });
    } else {
      result = await (this.prisma as any).organisasi.create({
        data: {
          struktur: body.struktur,
          isVisible: body.isVisible ?? true,
        },
      });
    }
    this.audit('ORGANISASI_UPDATE', 'Organisasi', 'organisasi', undefined, { id: result?.id });
    return result;
  }

  // ── Sync Kepengurusan → Organisasi ────────────────────

  /**
   * Fetch active national-level kepengurusan records and transform
   * them into the flat OrganisasiItem[] schema used by the public page.
   *
   * National-level = nasionalId is set AND distrikId/wilayahId/rantingId are all null.
   * Active = the linked Periode has isActive = true.
   */
  async getKepengurusanPreview() {
    const items = await this.prisma.kepengurusan.findMany({
      where: {
        nasionalId: { not: null },
        distrikId: null,
        wilayahId: null,
        rantingId: null,
        periode: { isActive: true },
      },
      include: {
        user: { select: { namaLengkap: true } },
        jabatan: { select: { nama: true, urutan: true } },
        periode: { select: { nama: true } },
      },
      orderBy: [{ jabatan: { urutan: 'asc' } }],
    });

    return items.map((item) => ({
      jabatan: item.jabatan?.nama || 'Pengurus',
      nama: item.user?.namaLengkap || 'Nama Pengurus',
      deskripsi: item.periode?.nama
        ? `Periode ${item.periode.nama}`
        : 'Tingkat Nasional',
    }));
  }

  /**
   * Sync kepengurusan nasional into the public Organisasi struktur.
   *
   * @param mode  'replace' – wipe existing struktur and write fresh data
   *              'append'  – merge new items after the existing ones (deduplicated by jabatan+nama)
   */
  async syncFromKepengurusan(mode: 'replace' | 'append') {
    const items = await this.getKepengurusanPreview();

    if (items.length === 0) {
      return {
        success: false,
        message: 'Tidak ada data pengurus nasional aktif yang ditemukan',
        count: 0,
      };
    }

    let newStruktur: { jabatan: string; nama: string; deskripsi: string }[];

    if (mode === 'replace') {
      newStruktur = items;
    } else {
      // Append with deduplication
      const existing = await this.getOrganisasi();
      const existingItems: { jabatan: string; nama: string; deskripsi: string }[] =
        (existing.struktur as any[]) || [];

      // Build a set of existing keys for deduplication
      const existingKeys = new Set(
        existingItems.map((e) => `${e.jabatan}|${e.nama}`),
      );

      const uniqueNew = items.filter(
        (item) => !existingKeys.has(`${item.jabatan}|${item.nama}`),
      );

      newStruktur = [...existingItems, ...uniqueNew];
    }

    const result = await this.updateOrganisasi({ struktur: newStruktur });

    this.audit('ORGANISASI_SYNC', 'Organisasi', 'organisasi', undefined, {
      mode,
      imported: items.length,
    });

    return {
      success: true,
      message: `${items.length} pengurus berhasil disinkronkan (${mode === 'replace' ? 'ditimpa' : 'ditambahkan'})`,
      count: items.length,
      struktur: newStruktur,
      organisasi: result,
    };
  }
}
