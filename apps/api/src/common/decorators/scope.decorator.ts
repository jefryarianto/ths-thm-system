import { SetMetadata } from '@nestjs/common';

export const SCOPE_KEY = 'requiredScope';

/**
 * Scope levels from broadest to narrowest:
 * - 'national': superadmin only (full access)
 * - 'district': admin_distrik and above
 * - 'region': admin_wilayah and above
 * - 'branch': admin_ranting and above
 * - 'self': anggota (own data only)
 */
export type ScopeLevel = 'national' | 'district' | 'region' | 'branch' | 'self';

/**
 * Decorator to specify the minimum scope level required for an endpoint.
 * Used with ScopeGuard to enforce hierarchical data access.
 *
 * @example
 *   @RequireScope('district')  // admin_distrik and above
 *   @Get()
 *   findAll() { ... }
 */
export const RequireScope = (scope: ScopeLevel) => SetMetadata(SCOPE_KEY, scope);
