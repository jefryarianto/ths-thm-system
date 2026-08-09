import { useAuthStore } from '../store/auth-store';

const ADMIN_ROLES = ['superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting'];

/**
 * Same role hierarchy as the web app (apps/web/src/hooks/use-auth.ts):
 * superadmin (7) > admin_distrik (6) > admin_wilayah (5) > admin_ranting (4) >
 * admin_kegiatan (3) > penguji (2) > anggota (1)
 */
const ROLE_LEVEL: Record<string, number> = {
  superadmin: 7,
  admin_distrik: 6,
  admin_wilayah: 5,
  admin_ranting: 4,
  admin_kegiatan: 3,
  penguji: 2,
  anggota: 1,
};

export function useRole() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role || 'anggota';
  const roleLevel = ROLE_LEVEL[role] ?? 0;

  return {
    role,
    isAdmin: ADMIN_ROLES.includes(role),
    isPenguji: role === 'penguji',
    isAnggota: role === 'anggota',
    /**
     * True if the current user's role level is at least `minRole` —
     * e.g. hasMinRole('admin_kegiatan') → true for admin_kegiatan & above.
     */
    hasMinRole: (minRole: string) => roleLevel >= (ROLE_LEVEL[minRole] ?? 0),
  };
}
