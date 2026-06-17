import { useAuthStore } from '../store/auth-store';

const ADMIN_ROLES = ['superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting'];

export function useRole() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role || 'anggota';

  return {
    role,
    isAdmin: ADMIN_ROLES.includes(role),
    isPenguji: role === 'penguji',
    isAnggota: role === 'anggota',
  };
}
