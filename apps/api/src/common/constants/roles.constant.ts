import { ROLE, Role, ROLE_VALUES } from '@ths-thm/shared-types';

export { ROLE, Role, ROLE_VALUES };

/** Human-readable labels for each role (Indonesian) */
export const ROLE_LABELS: Record<Role, string> = {
  [ROLE.SUPERADMIN]: 'Super Admin',
  [ROLE.ADMIN_NASIONAL]: 'Admin Nasional',
  [ROLE.ADMIN_DISTRIK]: 'Admin Distrik',
  [ROLE.ADMIN_WILAYAH]: 'Admin Wilayah',
  [ROLE.ADMIN_RANTING]: 'Admin Ranting',
  [ROLE.ADMIN_KEGIATAN]: 'Admin Kegiatan',
  [ROLE.PENGUJI]: 'Penguji',
  [ROLE.ANGGOTA]: 'Anggota',
};

/**
 * Role hierarchy for scope-based access control.
 * Higher index = higher privilege (can access lower levels)
 * Must match ScopeLevel order: national > district > region > branch > self
 */
export const ROLE_HIERARCHY: Role[] = [
  ROLE.ANGGOTA, // self
  ROLE.PENGUJI, // branch
  ROLE.ADMIN_RANTING, // branch
  ROLE.ADMIN_KEGIATAN, // branch
  ROLE.ADMIN_WILAYAH, // region
  ROLE.ADMIN_DISTRIK, // district
  ROLE.ADMIN_NASIONAL, // national
  ROLE.SUPERADMIN, // national
];

/**
 * Mapping of role to minimum scope level.
 * Used by ScopeGuard for authorization decisions.
 * Must match the mapping in prisma/schema.prisma ScopeType enum.
 *
 * Note: penguji & anggota both map to 'self'. Although a penguji is allowed to
 * see kegiatan they examine (an exception enforced in the services), their
 * scope level is self because they hold no organizational authority.
 */
export const ROLE_SCOPE: Record<Role, 'national' | 'district' | 'region' | 'branch' | 'self'> = {
  [ROLE.SUPERADMIN]: 'national',
  [ROLE.ADMIN_NASIONAL]: 'national',
  [ROLE.ADMIN_DISTRIK]: 'district',
  [ROLE.ADMIN_WILAYAH]: 'region',
  [ROLE.ADMIN_RANTING]: 'branch',
  [ROLE.ADMIN_KEGIATAN]: 'branch',
  [ROLE.PENGUJI]: 'self',
  [ROLE.ANGGOTA]: 'self',
};

/**
 * Level organisasi minimum yang harus dipilih saat membuat/mengubah user.
 * - superadmin & admin_nasional → tanpa organisasi (scope nasional).
 * - admin_distrik → cukup distrik.
 * - admin_wilayah → distrik + wilayah.
 * - admin_ranting → distrik + wilayah + ranting.
 * - Role lain (admin_kegiatan, penguji, anggota) tetap dikenai ranting
 *   seperti perilaku sebelumnya (scope level branch/self).
 */
export type OrgLevel = 'distrik' | 'wilayah' | 'ranting';

export const ROLE_ORG_LEVEL: Record<Role, OrgLevel | null> = {
  [ROLE.SUPERADMIN]: null,
  [ROLE.ADMIN_NASIONAL]: null,
  [ROLE.ADMIN_DISTRIK]: 'distrik',
  [ROLE.ADMIN_WILAYAH]: 'wilayah',
  [ROLE.ADMIN_RANTING]: 'ranting',
  [ROLE.ADMIN_KEGIATAN]: 'ranting',
  [ROLE.PENGUJI]: 'ranting',
  [ROLE.ANGGOTA]: 'ranting',
};

/** Role yang harusnya punya scope organisasi (bukan superadmin). */
export function roleRequiresOrg(role: string): role is Role {
  return role in ROLE_ORG_LEVEL && ROLE_ORG_LEVEL[role as Role] !== null;
}

/**
 * Check if a role has at least the required scope level
 */
export function hasRequiredScope(
  userRole: Role,
  requiredScope: 'national' | 'district' | 'region' | 'branch' | 'self',
): boolean {
  const userScope = ROLE_SCOPE[userRole];
  // SECURITY: a 'self' scope (anggota/penguji) passes every scope gate — the
  // row-level restriction is enforced by the services. Without this, 'self'
  // (last in the order) can never satisfy a 'branch' requirement and those
  // endpoints reject the role entirely. Kept in sync with ScopeGuard.
  if (userScope === 'self') return true;
  const scopeOrder: ('national' | 'district' | 'region' | 'branch' | 'self')[] = [
    'national',
    'district',
    'region',
    'branch',
    'self',
  ];
  return scopeOrder.indexOf(userScope) <= scopeOrder.indexOf(requiredScope);
}

/**
 * Validate that a string is a valid role
 */
export function isValidRole(role: string): role is Role {
  return ROLE_VALUES.includes(role as Role);
}

/**
 * Get all roles that have at least the specified scope level
 */
export function getRolesWithScope(
  requiredScope: 'national' | 'district' | 'region' | 'branch' | 'self',
): Role[] {
  return ROLE_VALUES.filter((role) => hasRequiredScope(role, requiredScope));
}
