import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { UserScope, isSelfScope } from '../interfaces/user-scope.interface';

/**
 * Helper to extract scope from request and build Prisma where clauses.
 * Services can inject this to filter data by organizational hierarchy.
 */
@Injectable()
export class ScopeHelper {
  /**
   * Build a Prisma where clause that filters data by scope.
   * - If scope has rantingId, filter to that ranting (branch level)
   * - If scope has wilayahId, filter to that wilayah (region level)
   * - If scope has distrikId, filter to that distrik (district level)
   * - If scope is empty, no filter (national level)
   *
   * @param scope The user's scope from request
   * @param basePath The base path for the relation (e.g., 'ranting' for anggota.ranting)
   */
  buildScopeFilter(scope: UserScope, basePath: string = 'ranting'): Record<string, unknown> {
    if (!scope) return {};

    if (scope.rantingId) {
      return { [basePath]: { id: scope.rantingId } };
    }

    if (scope.wilayahId) {
      return { [basePath]: { wilayahId: scope.wilayahId } };
    }

    if (scope.distrikId) {
      return { [basePath]: { wilayah: { distrikId: scope.distrikId } } };
    }

    return {};
  }

  /**
   * Build a scope filter for models where the relation path is indirect
   * (e.g., iuran → anggota → ranting for dues filtering).
   *
   * @param scope The user's scope
   * @param relationPath The nested relation path (e.g., 'anggota' for iuran.anggota)
   */
  buildIndirectScopeFilter(scope: UserScope, relationPath: string): Record<string, unknown> {
    if (!scope) return {};

    if (scope.rantingId) {
      return { [relationPath]: { rantingId: scope.rantingId } };
    }

    if (scope.wilayahId) {
      return { [relationPath]: { ranting: { wilayahId: scope.wilayahId } } };
    }

    if (scope.distrikId) {
      return { [relationPath]: { ranting: { wilayah: { distrikId: scope.distrikId } } } };
    }

    return {};
  }

  /**
   * Verify scope access for kegiatan-based resources by scopeType/scopeId fields.
   * Checks ranting, wilayah, and distrik level.
   * Throws ForbiddenException if access is denied.
   */
  async verifyKegiatanScope(
    prisma: {
      wilayah: {
        findUnique: (args: {
          where: { id: string };
          select?: { distrikId?: boolean };
        }) => Promise<{ distrikId: string | null } | null>;
      };
      ranting: {
        findUnique: (args: {
          where: { id: string };
          include?: { wilayah?: boolean };
        }) => Promise<{ wilayahId: string; wilayah?: { distrikId: string | null } | null } | null>;
      };
    },
    scope: UserScope | undefined,
    scopeType?: string,
    scopeId?: string,
  ): Promise<void> {
    if (!scope || !scopeType || !scopeId) return;

    if (scope.rantingId && scopeType === 'ranting' && scopeId !== scope.rantingId) {
      throw new ForbiddenException('Akses ditolak: diluar cakupan wilayah Anda');
    }
    if (scope.wilayahId && scopeType === 'wilayah' && scopeId !== scope.wilayahId) {
      throw new ForbiddenException('Akses ditolak: diluar cakupan wilayah Anda');
    }
    if (scope.distrikId && scopeType === 'distrik' && scopeId !== scope.distrikId) {
      throw new ForbiddenException('Akses ditolak: diluar cakupan wilayah Anda');
    }
    // Tenant safety: level wilayah/ranting harus benar-benar berada dalam
    // cakupan (hierarkis) — sebelumnya hanya exact-match, sehingga admin
    // ter-scope penuh (mis. admin_distrik tanpa rantingId) dapat melihat atau
    // memodifikasi kegiatan milik distrik/wilayah/ranting lain.
    if (scope.distrikId && (scopeType === 'wilayah' || scopeType === 'ranting')) {
      const ok =
        scopeType === 'wilayah'
          ? (
              await prisma.wilayah.findUnique({
                where: { id: scopeId },
                select: { distrikId: true },
              })
            )?.distrikId === scope.distrikId
          : await this.hasAccessToResourceAsync(prisma, scope, scopeId);
      if (!ok) {
        throw new ForbiddenException('Akses ditolak: diluar cakupan wilayah Anda');
      }
    }
    if (scope.wilayahId && scopeType === 'ranting') {
      const ok = await this.hasAccessToResourceAsync(prisma, scope, scopeId);
      if (!ok) {
        throw new ForbiddenException('Akses ditolak: diluar cakupan wilayah Anda');
      }
    }
  }

  /**
   * Check if user has access to a specific resource based on scope.
   * Uses PrismaService for region/district level verification.
   * Call without prisma for simple branch-level checks.
   */
  hasAccessToResource(scope: UserScope, resourceRantingId?: string): boolean {
    // SECURITY: a 'self' scope user (anggota/penguji) has no org hierarchy, but
    // is NOT a national admin. Row-level checks must be done by the caller via
    // resolveOwnMemberId/assertSelfMember; this method only answers the
    // hierarchy question, so we deny rather than default-allow.
    if (isSelfScope(scope)) {
      return !!scope.rantingId && scope.rantingId === resourceRantingId;
    }
    if (!scope || (!scope.rantingId && !scope.wilayahId && !scope.distrikId)) {
      return true; // National level — full access
    }

    if (!resourceRantingId) return true;

    // Branch level — must own the ranting
    if (scope.rantingId) {
      return scope.rantingId === resourceRantingId;
    }

    // Region/district level — we can't do async DB lookup here.
    // The findAll query-level filter handles this correctly.
    // For findOne, services should verify via query or use hasAccessToResourceAsync.
    return true;
  }

  /**
   * Async version that verifies region/district access by looking up the ranting.
   * Use this in findOne-style service methods for accurate scope checks.
   */
  async hasAccessToResourceAsync(
    prisma: {
      ranting: {
        findUnique: (args: {
          where: { id: string };
          include?: { wilayah?: boolean };
        }) => Promise<{ wilayahId: string; wilayah?: { distrikId: string | null } | null } | null>;
      };
    },
    scope: UserScope,
    resourceRantingId?: string,
  ): Promise<boolean> {
    // SECURITY: same reasoning as hasAccessToResource — a 'self' scope user is
    // not a national admin even though they carry no org hierarchy. Callers
    // must additionally enforce row-level ownership (assertSelfMember).
    if (isSelfScope(scope)) {
      return !!scope.rantingId && scope.rantingId === resourceRantingId;
    }
    if (!scope || (!scope.rantingId && !scope.wilayahId && !scope.distrikId)) {
      return true;
    }

    if (!resourceRantingId) return true;

    // Branch level
    if (scope.rantingId) {
      return scope.rantingId === resourceRantingId;
    }

    // Region/district level — look up ranting's parent hierarchy
    const ranting = await prisma.ranting.findUnique({
      where: { id: resourceRantingId },
      include: { wilayah: true },
    });

    if (!ranting) return false;

    // Tenant safety: ranting-less (national-level) resources are NOT
    // accessible to scoped admins — otherwise a district/region admin
    // could read or modify national accounts (e.g. superadmin without ranting).
    if (!ranting.wilayahId) return false;

    if (scope.wilayahId) {
      return ranting.wilayahId === scope.wilayahId;
    }

    if (scope.distrikId) {
      return ranting.wilayah?.distrikId === scope.distrikId;
    }

    return false;
  }

  /**
   * Convenience method for the common mutation-guard pattern:
   * 1. Find the resource and verify it exists (throws NotFoundException if not)
   * 2. Verify the user's scope has access to the resource's ranting
   *
   * @example
   *   await this.scopeHelper.verifyResourceAccess(
   *     this.prisma, scope, id,
   *     (prisma, id) => prisma.anggota.findUnique({ where: { id }, select: { rantingId: true } }),
   *     'Anggota tidak ditemukan',
   *   );
   */
  async verifyResourceAccess<T extends { rantingId?: string | null }>(
    prisma: {
      ranting: {
        findUnique: (args: {
          where: { id: string };
          include?: { wilayah?: boolean };
        }) => Promise<{ wilayahId: string; wilayah?: { distrikId: string | null } | null } | null>;
      };
    },
    scope: UserScope | undefined,
    resourceId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    findUnique: (prisma: any, id: string) => Promise<T | null>,
    notFoundMessage: string = 'Sumber daya tidak ditemukan',
  ): Promise<T> {
    if (!scope) {
      // No scope check needed, but still verify existence
      const resource = await findUnique(prisma, resourceId);
      if (!resource) {
        throw new NotFoundException(notFoundMessage);
      }
      return resource;
    }

    const resource = await findUnique(prisma, resourceId);
    if (!resource) {
      throw new NotFoundException(notFoundMessage);
    }

    const hasAccess = await this.hasAccessToResourceAsync(
      prisma,
      scope,
      resource.rantingId ?? undefined,
    );

    if (!hasAccess) {
      throw new ForbiddenException('Akses ditolak: diluar cakupan wilayah Anda');
    }

    return resource;
  }

  // ── Self-scope (anggota / penguji) row-level filtering ────────────────────

  /**
   * Build a Prisma `where` fragment that restricts rows to the authenticated
   * member, for endpoints reached by an `anggota`/`penguji` (scope 'self').
   *
   * Returns `{}` for non-self scopes — callers must AND it with their existing
   * org scope filter, e.g.:
   *
   * ```ts
   * where: { ...this.scopeHelper.buildIndirectScopeFilter(scope, 'anggota'),
   *          ...this.scopeHelper.buildSelfScopeFilter(scope, 'anggota') }
   * ```
   *
   * @param scope      The request scope (may be undefined → no restriction)
   * @param column     Column holding the member id. Use `'anggotaId'` for tables
   *                   that store it directly, or `'anggota'`-style relation paths
   *                   via `relationPath`.
   * @param relationPath Optional nested path, e.g. `'anggota'` → `{ anggota: { id } }`
   *                     for iuran/dokumen.
   */
  buildSelfScopeFilter(
    scope: UserScope | undefined,
    column: string = 'anggotaId',
    relationPath?: string,
  ): Record<string, unknown> {
    if (!isSelfScope(scope)) return {};
    const id = scope.selfMemberId as string;
    if (relationPath) return { [relationPath]: { id } };
    return { [column]: id };
  }

  /**
   * True when a given member id is within a self-scoped user's own rows.
   * Convenience for single-resource services (e.g. `findOne`).
   */
  isOwnMemberRow(scope: UserScope | undefined, anggotaId?: string | null): boolean {
    if (!isSelfScope(scope)) return true; // admins: filtered elsewhere by hierarchy
    return !!anggotaId && anggotaId === scope.selfMemberId;
  }

  /**
   * Cache bucket segment unique to the requesting member, so that self-scoped
   * users never share a cache entry with another member or with an admin.
   */
  selfCacheSegment(scope: UserScope | undefined): string {
    return isSelfScope(scope) ? (scope.selfMemberId as string) : '';
  }

  // ── Kegiatan (scopeType / scopeId) filtering ──────────────────────────────

  /**
   * Build a Prisma `where` fragment for models that store their organizational
   * placement in `scopeType`/`scopeId` columns (Kegiatan, Pendadaran) rather
   * than a direct `rantingId` FK.
   *
   * IMPORTANT: do NOT use `buildScopeFilter` for those models — `{ ranting: ... }`
   * is not a valid relation on `kegiatan` and Prisma throws at runtime.
   */
  async buildKegiatanScopeFilter(
    scope: UserScope | undefined,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prisma?: any,
  ): Promise<Record<string, unknown>> {
    if (!scope) return {};

    if (scope.rantingId) {
      return {
        OR: [
          { scopeType: 'ranting', scopeId: scope.rantingId },
          { scopeType: 'unit_latihan', scopeId: scope.rantingId },
        ],
      };
    }
    if (scope.wilayahId && prisma) {
      // Tenant safety: arm ranting dibatasi ke ranting dalam wilayah ini —
      // bukan seluruh ranting se-nasional.
      const rantings = await prisma.ranting.findMany({
        where: { wilayahId: scope.wilayahId },
        select: { id: true },
      });
      return {
        OR: [
          { scopeType: 'wilayah', scopeId: scope.wilayahId },
          { scopeType: 'ranting', scopeId: { in: rantings.map((r: { id: string }) => r.id) } },
        ],
      };
    }
    if (scope.distrikId && prisma) {
      // Tenant safety: arm wilayah/ranting dibatasi ke entitas dalam distrik ini —
      // bukan seluruh wilayah/ranting se-nasional.
      const wilayahs = await prisma.wilayah.findMany({
        where: { distrikId: scope.distrikId },
        select: { id: true },
      });
      const wilayahIds = wilayahs.map((w: { id: string }) => w.id);
      const rantings = await prisma.ranting.findMany({
        where: { wilayahId: { in: wilayahIds } },
        select: { id: true },
      });
      return {
        OR: [
          { scopeType: 'distrik', scopeId: scope.distrikId },
          { scopeType: 'wilayah', scopeId: { in: wilayahIds } },
          { scopeType: 'ranting', scopeId: { in: rantings.map((r: { id: string }) => r.id) } },
        ],
      };
    }
    return {};
  }
}

