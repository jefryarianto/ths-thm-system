import { ROLE, Role, ROLE_VALUES } from '@ths-thm/shared-types';

export { ROLE, Role, ROLE_VALUES };

/** Human-readable labels for each role (Indonesian) */
export const ROLE_LABELS: Record<Role, string> = {
  [ROLE.SUPERADMIN]: 'Super Admin',
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
  ROLE.ANGGOTA,           // self
  ROLE.PENGUJI,           // branch
  ROLE.ADMIN_RANTING,     // branch
  ROLE.ADMIN_KEGIATAN,    // branch
  ROLE.ADMIN_WILAYAH,     // region
  ROLE.ADMIN_DISTRIK,     // district
  ROLE.SUPERADMIN,        // national
];

/**
 * Mapping of role to minimum scope level.
 * Used by ScopeGuard for authorization decisions.
 * Must match the mapping in prisma/schema.prisma ScopeType enum.
 */
export const ROLE_SCOPE: Record<Role, 'national' | 'district' | 'region' | 'branch' | 'self'> = {
  [ROLE.SUPERADMIN]: 'national',
  [ROLE.ADMIN_DISTRIK]: 'district',
  [ROLE.ADMIN_WILAYAH]: 'region',
  [ROLE.ADMIN_RANTING]: 'branch',
  [ROLE.ADMIN_KEGIATAN]: 'branch',
  [ROLE.PENGUJI]: 'branch',
  [ROLE.ANGGOTA]: 'self',
};

/**
 * Check if a role has at least the required scope level
 */
export function hasRequiredScope(
  userRole: Role,
  requiredScope: 'national' | 'district' | 'region' | 'branch' | 'self'
): boolean {
  const scopeOrder: ('national' | 'district' | 'region' | 'branch' | 'self')[] = [
    'national',
    'district',
    'region',
    'branch',
    'self',
  ];
  const userScope = ROLE_SCOPE[userRole];
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
  requiredScope: 'national' | 'district' | 'region' | 'branch' | 'self'
): Role[] {
  return ROLE_VALUES.filter((role) => hasRequiredScope(role, requiredScope));
}