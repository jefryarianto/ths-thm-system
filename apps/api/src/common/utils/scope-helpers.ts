import { Injectable } from '@nestjs/common';
import { ScopedRequest, UserScope } from '../interfaces/user-scope.interface';

/**
 * Helper to extract scope from request and build Prisma where clauses.
 * Services can inject this to filter data by organizational hierarchy.
 */
@Injectable()
export class ScopeHelper {
  /**
   * Extract scope from request object.
   */
  extractScope(request: ScopedRequest): UserScope {
    return request.scope || {};
  }

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
   * Build a simple where clause for models that have rantingId directly.
   */
  buildDirectRantingFilter(scope: UserScope): Record<string, unknown> {
    if (!scope) return {};

    if (scope.rantingId) {
      return { rantingId: scope.rantingId };
    }

    // For region/district level, we need a nested filter through ranting relation
    // This is handled by buildScopeFilter
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
   * Check if user has access to a specific resource based on scope.
   * Uses PrismaService for region/district level verification.
   * Call without prisma for simple branch-level checks.
   */
  hasAccessToResource(scope: UserScope, resourceRantingId?: string): boolean {
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
    prisma: { ranting: { findUnique: (args: any) => Promise<any> } },
    scope: UserScope,
    resourceRantingId?: string,
  ): Promise<boolean> {
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

    if (scope.wilayahId) {
      return ranting.wilayahId === scope.wilayahId;
    }

    if (scope.distrikId) {
      return ranting.wilayah?.distrikId === scope.distrikId;
    }

    return false;
  }
}
