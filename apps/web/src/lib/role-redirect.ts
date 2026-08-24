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
 * Roles that are activity-scoped (only see kegiatan they're assigned to).
 */
export const ACTIVITY_SCOPED_ROLES: Role[] = ['admin_kegiatan', 'penguji'];

/**
 * Resolve the correct landing page after login based on the user's role.
 *
 * - Admin-level roles (admin_ranting+) → admin dashboard (`/dashboard`)
 * - Activity-scoped roles → their activity list
 *   - admin_kegiatan → `/my-activities` (daftar kegiatan yang ditugaskan)
 *   - penguji → `/my-assessments` (daftar penilaian yang ditugaskan)
 * - Regular members (`anggota`) → community forum (`/forum`)
 */
export function getHomePathForRole(role: Role | string | null | undefined): string {
  if (!role) return '/forum';

  // Activity-scoped roles go to dashboard (which shows their assigned kegiatan)
  if (DASHBOARD_ROLES.includes(role as Role)) {
    return '/dashboard';
  }

  return '/forum';
}
