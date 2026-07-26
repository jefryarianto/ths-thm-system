'use client';

import { useMemo } from 'react';
import type { Role, User } from '@/types';

/**
 * Role hierarchy index — higher = more privilege.
 * superadmin (7) > admin_distrik (6) > admin_wilayah (5) > admin_ranting (4) >
 * admin_kegiatan (3) > penguji (2) > anggota (1)
 */
const ROLE_HIERARCHY: Record<Role, number> = {
  superadmin: 7,
  admin_distrik: 6,
  admin_wilayah: 5,
  admin_ranting: 4,
  admin_kegiatan: 3,
  penguji: 2,
  anggota: 1,
};

/**
 * Roles that are considered "admin" level.
 */
export const ADMIN_ROLES: Role[] = [
  'superadmin',
  'admin_distrik',
  'admin_wilayah',
  'admin_ranting',
];

/**
 * Roles that can manage system settings (users, queues, audit logs).
 */
export const SYSTEM_ADMIN_ROLES: Role[] = ['superadmin', 'admin_distrik'];

/**
 * Hook that returns the current user and auth state from localStorage.
 *
 * Uses useMemo so the returned object is stable across renders as long as
 * the stored user data doesn't change (caller triggers re-mount on token
 * change by wrapping this in a component key or relying on natural re-renders).
 *
 * Returns safe defaults when not mounted (SSR) or not logged in.
 */
export function useAuth() {
  const auth = useMemo<{
    user: User | null;
    role: Role | null;
    roleLevel: number;
    isAdmin: boolean;
    isSystemAdmin: boolean;
    isAuthenticated: boolean;
    hasRole: (roles: Role[]) => boolean;
    hasMinRole: (minRole: Role) => boolean;
  }>(() => {
    let user: User | null = null;
    try {
      const raw = localStorage.getItem('user');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.role) {
          user = parsed as User;
        }
      }
    } catch {
      // Silently fail — not authenticated
    }

    const role: Role | null = user?.role ?? null;
    const roleLevel = role ? ROLE_HIERARCHY[role] ?? 0 : 0;

    return {
      user,
      role,
      roleLevel,
      isAdmin: role ? ADMIN_ROLES.includes(role) : false,
      isSystemAdmin: role ? SYSTEM_ADMIN_ROLES.includes(role) : false,
      isAuthenticated: !!user,
      /**
       * Check if the current user has exactly one of the given roles.
       */
      hasRole: (roles: Role[]) => (role ? roles.includes(role) : false),
      /**
       * Check if the current user's role level is at least `minRole`.
       * e.g. hasMinRole('admin_ranting') → true for superadmin, admin_distrik, admin_wilayah, admin_ranting
       */
      hasMinRole: (minRole: Role) => {
        const minLevel = ROLE_HIERARCHY[minRole] ?? 0;
        return roleLevel >= minLevel;
      },
    };
  }, []);

  return auth;
}
