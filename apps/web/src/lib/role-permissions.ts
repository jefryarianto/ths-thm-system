import type { Role } from '@/types';

export const ROLE_HIERARCHY: Record<Role, number> = {
  superadmin: 8,
  admin_nasional: 7,
  admin_distrik: 6,
  admin_wilayah: 5,
  admin_ranting: 4,
  admin_kegiatan: 3,
  admin_berita: 0,
  penguji: 2,
  anggota: 1,
};

export const DASHBOARD_ROLES: Role[] = [
  'superadmin',
  'admin_distrik',
  'admin_wilayah',
  'admin_ranting',
  'admin_kegiatan',
  'penguji',
];

export function hasRoleForRole(
  role: Role | string | null | undefined,
  roles: Role[],
): boolean {
  return role ? roles.includes(role as Role) : false;
}

export function hasMinRoleForRole(
  role: Role | string | null | undefined,
  minRole: Role,
): boolean {
  const roleLevel = role ? (ROLE_HIERARCHY[role as Role] ?? 0) : 0;
  const minLevel = ROLE_HIERARCHY[minRole] ?? 0;
  return roleLevel >= minLevel;
}
