import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ScopeHelper } from '../../common/utils/scope-helpers';
import { CacheService } from '../../common/services/cache.service';
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
  ) {
    super(prisma, scopeHelper, cache, {
      model: 'periode',
      prefix: 'settings:',
      notFound: 'Periode tidak ditemukan',
    });
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
  }

  // ── Period CRUD (via BaseCrudService) ──────────────

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
    const data: Record<string, unknown> = {};
    if (dto.nama) data.nama = dto.nama;
    if (dto.tglMulai) data.tglMulai = new Date(dto.tglMulai);
    if (dto.tglSelesai) data.tglSelesai = new Date(dto.tglSelesai);
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    return this.baseUpdate(id, { ...dto, ...data } as UpdatePeriodDto);
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
    return this.prisma.tandaTangan.create({ data: dto });
  }

  async getSignatures() {
    return this.prisma.tandaTangan.findMany({
      include: { user: { select: { namaLengkap: true } } },
    });
  }

  async deleteSignature(id: string) {
    await this.prisma.tandaTangan.delete({ where: { id } });
  }

  async uploadStamp(dto: CreateStampDto) {
    return this.prisma.stempel.create({ data: dto });
  }

  async getStamp() {
    return this.prisma.stempel.findFirst({ where: { isActive: true } });
  }
}
