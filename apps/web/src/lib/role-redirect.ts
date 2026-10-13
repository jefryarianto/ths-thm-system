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

/**
 * Tentukan apakah pengguna non-admin harus dialihkan keluar dari halaman admin
 * dashboard, dan ke mana.
 *
 * Mengembalikan path tujuan jika redirect diperlukan, atau `null` jika pengguna
 * boleh tetap di halaman saat ini.
 *
 * PENTING: ini hanya men-gate **route `/dashboard`** (admin landing), BUKAN
 * seluruh route group `(dashboard)`. Route group hanyalah pengelompokan folder;
 * banyak halaman di dalamnya (forum, galeri, chat, kalender, dll) sah untuk
 * `anggota`. Versi lama redirect ini memakai hasMinRole('penguji') secara
 * global sehingga `/forum` — landing utama anggota — terusir dan mengalami
 * infinite refresh loop (window.location.replace('/forum') setiap render).
 */
export function getAdminDashboardRedirect(
  pathname: string | null | undefined,
  role: Role | string | null | undefined,
): string | null {
  // Role belum diketahui = auth belum siap → tahan redirect. Kalau tidak,
  // guest/sesi-kosong yang mendarat di /dashboard bisa terus-terusan di-redirect
  // sebelum hydrasi selesai.
  if (!role) return null;
  // Admin-level roles (DASHBOARD_ROLES) boleh mengakses dashboard.
  if (DASHBOARD_ROLES.includes(role as Role)) return null;
  // Hanya halaman admin landing yang di-gate, bukan route group.
  if (!pathname || pathname !== '/dashboard') return null;
  const homePath = getHomePathForRole(role);
  // Sudah di home path → jangan redirect, agar tidak terjadi loop.
  if (!homePath || pathname === homePath) return null;
  return homePath;
}
