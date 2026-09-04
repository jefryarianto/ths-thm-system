import { Injectable, Optional } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ScopeHelper } from '../../common/utils/scope-helpers';
import { CacheService } from '../../common/services/cache.service';
import { PersistentAuditService } from '../../common/services/persistent-audit.service';
import { BaseCrudService } from '../../common/utils/base-crud.service';
import {
  CreateAspectDto,
  UpdateAspectDto,
  AssessmentFilterDto,
} from './dto/assessment.dto';

@Injectable()
export class AspectService extends BaseCrudService<CreateAspectDto, UpdateAspectDto> {
  constructor(
    prisma: PrismaService,
    scopeHelper: ScopeHelper,
    cache: CacheService,
    @Optional() protected readonly persistentAudit?: PersistentAuditService,
  ) {
    super(prisma, scopeHelper, cache, {
      model: 'aspekPenilaian',
      prefix: 'aspects:',
      notFound: 'Aspek tidak ditemukan',
      // NOTE: original deleteAspect set isActive:false instead of hard-delete
      // softDelete: true would set deletedAt which doesn't exist on this model
      scopeStrategy: 'ranting',
    }, persistentAudit);
  }

  /** Include item child relations by default (hanya item aktif). */
  protected readonly DEFAULT_INCLUDE = { itemPenilaian: { where: { isActive: true } } };

  /**
   * List aspek penilaian.
   * - Tanpa `kegiatanId` → template global (kegiatanId null).
   * - Dengan `kegiatanId` → set milik pendadaran tsb; bila pendadaran belum
   *   punya aspek sendiri (legacy), otomatis fallback ke template.
   * - `includeInactive=true` (admin web) → sertakan yang disembunyikan.
   * Alur scoring tidak mengirim includeInactive → hanya melihat aspek aktif.
   */
  async findAll(query?: AssessmentFilterDto) {
    const limit = query?.limit || 10;
    const page = query?.page || 1;
    const includeInactive = query?.includeInactive === true;
    const kegiatanId = query?.kegiatanId || null;

    const buildWhere = (scopeKegiatanId: string | null): Record<string, unknown> => {
      const where: Record<string, unknown> = { kegiatanId: scopeKegiatanId };
      if (!includeInactive) where.isActive = true;
      if (query?.search) {
        where.namaAspek = { contains: query.search, mode: 'insensitive' as const };
      }
      return where;
    };

    let effectiveKegiatanId: string | null = kegiatanId;
    if (kegiatanId) {
      // Fallback: pendadaran tanpa set sendiri (belum clone / legacy) → template
      const owned = await this.prisma.aspekPenilaian.count({ where: { kegiatanId } });
      if (owned === 0) effectiveKegiatanId = null;
    }

    // Cache key menyertakan scope & includeInactive agar tidak saling menimpa
    return this.baseFindAll(
      `aspects:all:${limit}:${page}:${effectiveKegiatanId ?? 'template'}:${includeInactive ? 'all' : 'active'}`,
      () => buildWhere(effectiveKegiatanId),
      {
        page,
        limit,
        include: includeInactive
          ? { itemPenilaian: { orderBy: { urutan: 'asc' as const } } }
          : this.DEFAULT_INCLUDE,
      },
    );
  }

  async findOne(id: string) {
    return this.baseFindOne<any>(id, undefined, this.DEFAULT_INCLUDE);
  }

  async create(dto: CreateAspectDto) {
    return this.baseCreate(dto);
  }

  async update(id: string, dto: UpdateAspectDto) {
    return this.baseUpdate(id, dto);
  }

  /**
   * Override baseRemove: original behavior set isActive:false (soft-disable),
   * not a hard delete or soft delete via deletedAt.
   */
  async remove(id: string) {
    await this.verifyScope(id, undefined);
    await this.prismaDelegate.update({
      where: { id },
      data: { isActive: false },
    });
    this.invalidateCache();
    return { message: 'Aspek penilaian dinonaktifkan' };
  }

  /** Aktifkan kembali aspek yang disembunyikan (soft-disable). */
  async restore(id: string) {
    await this.verifyScope(id, undefined);
    const data = await this.prismaDelegate.update({
      where: { id },
      data: { isActive: true },
    });
    this.invalidateCache();
    return data;
  }
}
