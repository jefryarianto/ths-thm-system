import { Injectable, NotFoundException, ForbiddenException, ConflictException, Logger, Optional } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from '../../prisma/prisma.service';
import { ScopeHelper } from './scope-helpers';
import { CacheService } from '../services/cache.service';
import { PersistentAuditService } from '../services/persistent-audit.service';
import { RevisionService } from '../services/revision.service';
import { UserScope } from '../interfaces/user-scope.interface';
import { paginate } from './pagination';

/**
 * Model Prisma yang memakai optimistic locking (kolom `version`).
 * Bila client mengirim `version` pada update DTO, baseUpdate memverifikasi
 * versi saat ini — mismatch menghasilkan ConflictException (409).
 */
export const OPTIMISTIC_VERSIONED_MODELS = new Set(['anggota', 'klaim']);

/**
 * Model yang dicatat riwayat revisinya (diff audit) otomatis pada setiap
 * baseUpdate. Data kritikal yang keliru diedit bisa dipulihkan lewat
 * endpoint admin/revisions.
 */
export const REVISION_TRACKED_MODELS = new Set(['anggota', 'klaim', 'iuran', 'calonAnggota', 'latihan']);

/**
 * Scope strategy determines how the base class verifies data access.
 *
 * - `ranting` — the entity has a direct `rantingId` field (e.g. Anggota, Latihan, CalonAnggota).
 *    Uses `scopeHelper.verifyResourceAccess()`.
 *
 * - `kegiatan` — the entity uses `scopeType` / `scopeId` fields (e.g. Kegiatan).
 *    Uses `scopeHelper.verifyKegiatanScope()`.
 *
 * - `anggota_indirect` — the entity relates to Ranting through Anggota (e.g. Iuran, Dokumen, Klaim).
 *    Uses a nested query through `entity.anggota.rantingId`.
 */
export type CrudScopeStrategy = 'ranting' | 'kegiatan' | 'anggota_indirect';

/**
 * Configuration for a CRUD service instance.
 *
 * @property model         - Prisma model name (lowercase, e.g. 'anggota', 'latihan', 'kegiatan')
 * @property prefix        - Cache key prefix (e.g. 'trainings:')
 * @property notFound      - Default "not found" error message
 * @property softDelete    - If true, `remove()` sets `deletedAt` instead of hard-deleting
 * @property scopeStrategy - How scope verification is performed (default: 'ranting')
 */
export interface CrudConfig {
  model: string;
  prefix: string;
  notFound?: string;
  softDelete?: boolean;
  scopeStrategy?: CrudScopeStrategy;
}

/**
 * Generic base CRUD service that eliminates ~70 % of the boilerplate
 * found in every NestJS + Prisma service module.
 *
 * Supports three scope strategies — ranting (direct), kegiatan (scopeType/scopeId),
 * and anggota_indirect (through anggota.rantingId) — configured via CrudConfig.
 *
 * Subclasses override hooks (`beforeCreate`, `afterCreate`, etc.) for
 * domain-specific logic such as sending emails, awarding points, or
 * generating NRA numbers.
 *
 * @example
 * ```ts
 * // Ranting-based (members, candidates, trainings):
 * class TrainingsService extends BaseCrudService<CreateTrainingDto, UpdateTrainingDto> {
 *   constructor(...) {
 *     super(prisma, scopeHelper, cache, { model: 'latihan', prefix: 'trainings:', scopeStrategy: 'ranting' });
 *   }
 * }
 *
 * // Kegiatan-based (activities, graduations):
 * class ActivitiesService extends BaseCrudService<CreateActivityDto, UpdateActivityDto> {
 *   constructor(...) {
 *     super(prisma, scopeHelper, cache, { model: 'kegiatan', prefix: 'activities:', scopeStrategy: 'kegiatan' });
 *   }
 * }
 * ```
 */
@Injectable()
export abstract class BaseCrudService<TCreateDto, TUpdateDto> {
  protected readonly logger: Logger;
  protected readonly CACHE_PREFIX: string;

  constructor(
    protected readonly prisma: PrismaService,
    protected readonly scopeHelper: ScopeHelper,
    protected readonly cache: CacheService,
    private readonly config: CrudConfig,
    @Optional() protected readonly persistentAudit?: PersistentAuditService,
    @Optional() protected readonly revisions?: RevisionService,
  ) {
    this.logger = new Logger(this.constructor.name);
    this.CACHE_PREFIX = config.prefix;
  }

  /**
   * Best-effort audit trail (best effort — gagal menulis tidak memblokir request).
   * Dipanggil otomatis dari baseCreate/baseUpdate/baseRemove; subclass dapat
   * memanggil langsung untuk operasi domain (approve/reject/import).
   */
  protected audit(
    action: string,
    entity: string,
    entityId: string | null,
    userId?: string | null,
    details?: Record<string, unknown> | null,
    rantingId?: string | null,
  ): void {
    void this.persistentAudit?.log({
      action,
      entity,
      entityId,
      userId: userId ?? null,
      rantingId: rantingId ?? null,
      ipAddress: null,
      userAgent: null,
      details: details ?? null,
    });
  }

  // ── Prisma delegate accessor ────────────────────────────

  /**
   * Access the Prisma delegate by model name.
   * Returns `this.prisma.latihan` for config `{ model: 'latihan' }`.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected get prismaDelegate(): any {
    return (this.prisma as unknown as Record<string, string>)[this.config.model];
  }

  /** The active scope strategy from config (defaults to 'ranting'). */
  protected get scopeStrategy(): CrudScopeStrategy {
    return this.config.scopeStrategy ?? 'ranting';
  }

  // ── Scope helpers ───────────────────────────────────────

  /**
   * Verifies the user has access to a resource.
   *
   * - `ranting` strategy: uses `verifyResourceAccess` — throws
   *   `NotFoundException` for both "not found" and "out of scope".
   *
   * - `kegiatan` strategy: fetches `scopeType`/`scopeId` and calls
   *   `verifyKegiatanScope` — throws `ForbiddenException` on scope mismatch.
   *
   * - `anggota_indirect` strategy: fetches the entity with nested
   *   `anggota.rantingId` and calls `verifyResourceAccess`.
   */
  protected async verifyScope(
    id: string,
    scope?: UserScope,
  ): Promise<void> {
    if (!scope) return;

    const strategy = this.scopeStrategy;

    if (strategy === 'kegiatan') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const entity = await this.prismaDelegate.findUnique({
        where: { id },
        select: { scopeType: true, scopeId: true },
      });
      if (!entity) {
        throw new NotFoundException(this.config.notFound || 'Data tidak ditemukan');
      }
      this.scopeHelper.verifyKegiatanScope(scope, entity.scopeType, entity.scopeId);
      return;
    }

    if (strategy === 'anggota_indirect') {
      // Fetch indirect scope through anggota.rantingId
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const entity = await this.prismaDelegate.findUnique({
        where: { id },
        select: { anggotaId: true },
        include: { anggota: { select: { rantingId: true } } },
      });
      if (!entity) {
        throw new NotFoundException(this.config.notFound || 'Data tidak ditemukan');
      }
      const hasAccess = await this.scopeHelper.hasAccessToResourceAsync(
        this.prisma,
        scope,
        entity.anggota?.rantingId,
      );
      if (!hasAccess) {
        throw new ForbiddenException('Akses ditolak: diluar cakupan wilayah Anda');
      }
      return;
    }

    // Default: 'ranting' strategy
    await this.scopeHelper.verifyResourceAccess(
      this.prisma,
      scope,
      id,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (p: any, rid: string) =>
        p[this.config.model].findUnique({
          where: { id: rid },
          select: { rantingId: true },
        }),
      this.config.notFound || 'Data tidak ditemukan',
    );
  }

  /**
   * Builds a ranting-based scope filter for `findAll` queries.
   * Delegates to `scopeHelper.buildScopeFilter`.
   */
  protected buildScopeFilter(
    scope?: UserScope,
    basePath: string = 'ranting',
  ): Record<string, unknown> {
    return this.scopeHelper.buildScopeFilter(scope || {}, basePath);
  }

  /**
   * Builds an indirect scope filter for models related through Anggota.
   * Delegates to `scopeHelper.buildIndirectScopeFilter`.
   */
  protected buildIndirectScopeFilter(
    scope?: UserScope,
    relationPath: string = 'anggota',
  ): Record<string, unknown> {
    return this.scopeHelper.buildIndirectScopeFilter(scope || {}, relationPath);
  }

  /**
   * Builds a kegiatan-based scope filter using `scopeType`/`scopeId` fields.
   *
   * Scope inheritance:
   * - User at ranting level sees: their ranting + unit_latihan in their ranting
   * - User at wilayah level sees: their wilayah + all ranting in their wilayah
   * - User at distrik level sees: their distrik + all wilayah + all ranting
   * - National level: no filter
   */
  protected buildKegiatanScopeFilter(scope?: UserScope): Record<string, unknown> {
    if (!scope) return {};

    if (scope.rantingId) {
      return {
        OR: [
          { scopeType: 'ranting', scopeId: scope.rantingId },
          { scopeType: 'unit_latihan', scopeId: scope.rantingId },
        ],
      };
    }
    if (scope.wilayahId) {
      return {
        OR: [
          { scopeType: 'wilayah', scopeId: scope.wilayahId },
          { scopeType: 'ranting' },
        ],
      };
    }
    if (scope.distrikId) {
      return {
        OR: [
          { scopeType: 'distrik', scopeId: scope.distrikId },
          { scopeType: 'wilayah' },
          { scopeType: 'ranting' },
        ],
      };
    }
    return {};
  }

  // ── Cache helpers ───────────────────────────────────────

  protected invalidateCache(): void {
    this.cache.invalidatePrefix(this.CACHE_PREFIX);
  }

  // ── Template CRUD methods ───────────────────────────────

  /**
   * Fetch a single entity by ID with optional includes.
   * Handles scope verification + NotFoundException.
   *
   * Scope strategy is determined by `config.scopeStrategy`:
   * - `ranting` → checks `entity.rantingId`
   * - `kegiatan` → checks `entity.scopeType`/`entity.scopeId`
   * - `anggota_indirect` → checks `entity.anggota.rantingId`
   */
  /**
   * Fetch a single entity by ID with optional includes.
   * Returns the bare entity — the global TransformInterceptor wraps it as
   * `{ success: true, data: entity }`.
   *
   * Scope strategy is determined by `config.scopeStrategy`.
   */
  protected async baseFindOne<T>(
    id: string,
    scope?: UserScope,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    include?: Record<string, any>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    select?: Record<string, any>,
  ): Promise<T> {
    const entity = await this.prismaDelegate.findUnique({
      where: { id },
      ...(include ? { include } : {}),
      ...(select ? { select } : {}),
    });
    if (!entity) {
      throw new NotFoundException(this.config.notFound || 'Data tidak ditemukan');
    }

    // Scope verification — delegates to verifyScope
    if (scope) {
      await this.verifyScope(id, scope);
    }

    return entity;
  }

  /**
   * Paginated list with caching.
   *
   * @param cacheKey   - Unique cache key for this query
   * @param buildWhere - Async function that builds the Prisma `where` clause
   * @param pagination - Options: page, limit, orderBy, include, select
   * @param ttl        - Cache TTL in seconds (default 30)
   */
  /**
   * Paginated list with caching.
   * Returns `{ data: T[], meta }` — the interceptor transforms it to
   * `{ success: true, data: T[], meta }`.
   *
   * @param cacheKey   - Unique cache key for this query
   * @param buildWhere - Async function that builds the Prisma `where` clause
   * @param pagination - Options: page, limit, orderBy, include, select
   * @param ttl        - Cache TTL in seconds (default 30)
   */
  protected async baseFindAll<T>(
    cacheKey: string,
    buildWhere: () => Promise<Record<string, unknown>> | Record<string, unknown>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pagination: {
      page?: number;
      limit?: number;
      orderBy?: Record<string, 'asc' | 'desc'>;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      include?: any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      select?: any;
    } = {},
    ttl: number = 30,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<{ data: T[]; meta: any }> {
    return this.cache.getOrSet(
      cacheKey,
      async () => {
        const where = await buildWhere();
        return paginate(this.prismaDelegate, where, pagination);
      },
      ttl,
    );
  }

  /**
   * Create a new entity.
   * Calls `beforeCreate` / `afterCreate` hooks automatically.
   * Note: does NOT verify scope — creation is typically allowed
   * for any authenticated user within their assigned scope.
   */
  /**
   * Create a new entity.
   * Returns `{ data, message }` — the interceptor adds `success: true`.
   */
  protected async baseCreate<T>(
    dto: TCreateDto,
    scope?: UserScope,
    userId?: string,
    message?: string,
  ): Promise<{ data: T; message: string }> {
    const data = await this.beforeCreate(dto, scope, userId);
    const entity = await this.prismaDelegate.create({ data });
    await this.afterCreate(entity, dto);
    this.invalidateCache();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rid = (entity as any)?.rantingId;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.audit('CREATE', this.config.model, (entity as any)?.id ?? null, userId, null, rid);
    return {
      data: entity,
      message: message || 'Data berhasil ditambahkan',
    };
  }

  /**
   * Update an existing entity.
   * Automatically verifies scope + calls `beforeUpdate` / `afterUpdate` hooks.
   */
  /**
   * Update an existing entity.
   * Returns `{ data, message }` — the interceptor adds `success: true`.
   */
  protected async baseUpdate<T>(
    id: string,
    dto: TUpdateDto,
    scope?: UserScope,
    message?: string,
    userId?: string,
  ): Promise<{ data: T; message: string }> {
    await this.verifyScope(id, scope);
    const data = await this.beforeUpdate(id, dto);
    // Field `version` adalah kontrol konkurensi — jangan tulis nilai client mentah.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (data as any).version;

    // Snapshot sebelum-perubahan untuk riwayat revisi (diff audit).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let beforeRow: Record<string, unknown> | null = null;
    if (REVISION_TRACKED_MODELS.has(this.config.model) && this.revisions) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      beforeRow = (await this.prismaDelegate.findUnique({ where: { id } })) as Record<string, unknown> | null;
    }

    // ── Optimistic locking ─────────────────────────────────
    // Model berkolom `version`: bila client mengirim `version`, kita cek versi
    // terkini. Tidak cocok → 409 Conflict (data diubah pihak lain).
    let where: { id: string; version?: number } = { id };
    const requestedVersion = (dto as unknown as { version?: number | string })?.version;
    if (
      OPTIMISTIC_VERSIONED_MODELS.has(this.config.model) &&
      requestedVersion !== undefined &&
      requestedVersion !== null
    ) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const current = await (this.prismaDelegate as any).findUnique({
        where: { id },
        select: { version: true },
      });
      if (!current) {
        throw new NotFoundException(this.config.notFound || 'Data tidak ditemukan');
      }
      if (Number(current.version) !== Number(requestedVersion)) {
        throw new ConflictException(
          'Data telah diubah oleh pengguna lain. Muat ulang data lalu coba lagi.',
        );
      }
      // Naikkan versi secara atomik bersamaan dengan update.
      data.version = Number(current.version) + 1;
      where = { id, version: Number(current.version) };
    }

    let updated: T;
    try {
      updated = await this.prismaDelegate.update({ where, data });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new ConflictException(
          'Data telah diubah oleh pengguna lain. Muat ulang data lalu coba lagi.',
        );
      }
      throw error;
    }
    await this.afterUpdate(updated, dto);
    this.invalidateCache();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rid = (updated as any)?.rantingId;
    this.audit('UPDATE', this.config.model, id, userId, null, rid);
    if (REVISION_TRACKED_MODELS.has(this.config.model) && this.revisions && beforeRow) {
      await this.revisions.recordUpdate(
        this.config.model,
        id,
        beforeRow,
        updated as Record<string, unknown>,
        userId ?? null,
      );
    }
    return {
      data: updated,
      message: message || 'Data berhasil diperbarui',
    };
  }

  /**
   * Remove an entity (soft or hard delete based on config).
   * Automatically verifies scope + calls `beforeRemove` / `afterRemove` hooks.
   */
  /**
   * Remove an entity (soft or hard delete based on config).
   * Returns `{ message }` — the interceptor adds `success: true`.
   */
  protected async baseRemove(
    id: string,
    scope?: UserScope,
    message?: string,
  ): Promise<{ message: string }> {
    await this.verifyScope(id, scope);
    await this.beforeRemove(id);

    try {
      if (this.config.softDelete) {
        await this.prismaDelegate.update({
          where: { id },
          data: { deletedAt: new Date() },
        });
      } else {
        await this.prismaDelegate.delete({ where: { id } });
      }
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(this.config.notFound || 'Data tidak ditemukan');
      }
      throw error;
    }

    await this.afterRemove(id);
    this.invalidateCache();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const entity = await this.prismaDelegate.findUnique({ where: { id }, select: { rantingId: true } });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rid = (entity as any)?.rantingId;
    this.audit(this.config.softDelete ? 'SOFT_DELETE' : 'DELETE', this.config.model, id, undefined, undefined, rid);
    return { message: message || 'Data berhasil dihapus' };
  }

  // ── Hooks for subclasses ────────────────────────────────

  /**
   * Transform / enrich the DTO before creating.
   * Called with the original DTO — return the data object to pass to Prisma.
   */
  /* eslint-disable @typescript-eslint/no-unused-vars */
  protected async beforeCreate(
    dto: TCreateDto,
    scope?: UserScope,
    userId?: string,
  ): Promise<Record<string, unknown>> {
    return { ...dto } as Record<string, unknown>;
  }

  /** Side-effect hook after successful creation. */
  protected async afterCreate(
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    result: any,
    dto: TCreateDto,
  ): Promise<void> {
    // override in subclass
  }

  /** Transform DTO before updating. */
  protected async beforeUpdate(
    id: string,
    dto: TUpdateDto,
  ): Promise<Record<string, unknown>> {
    return { ...dto } as Record<string, unknown>;
  }

  /** Side-effect hook after successful update. */
  protected async afterUpdate(
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    result: any,
    dto: TUpdateDto,
  ): Promise<void> {
    // override in subclass
  }

  /** Side-effect hook before removal. */
  protected async beforeRemove(id: string): Promise<void> {
    // override in subclass
  }

  /** Side-effect hook after successful removal. */
  protected async afterRemove(id: string): Promise<void> {
    // override in subclass
  }
  /* eslint-enable @typescript-eslint/no-unused-vars */
}
