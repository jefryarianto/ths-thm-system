import type { Role } from '@/types';

/** Roles that land on the admin dashboard after login. */
export const DASHBOARD_ROLES: Role[] = [
  'superadmin',
  'admin_distrik',
  'admin_wilayah',
  'admin_ranting',
  'admin_kegiatan',
  'penguji',
];

/**
 * Resolve the correct landing page after login based on the user's role.
 *
 * - Admin-level roles → admin dashboard (`/members`)
 * - Regular members (`anggota`) → community forum (`/forum`)
 */
export function getHomePathForRole(role: Role | string | null | undefined): string {
  if (role && DASHBOARD_ROLES.includes(role as Role)) {
    return '/members';
  }
  return '/forum';
}
