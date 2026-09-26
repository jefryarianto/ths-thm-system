'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Role, User } from '@/types';
import { sessionManager } from '@/lib/session-manager';

/**
 * Role hierarchy index - higher = more privilege.
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
 * Roles that are activity-scoped (only see kegiatan they're assigned to).
 * - admin_kegiatan: assigned via kegiatan.adminKegiatanId
 * - penguji: assigned via PenugasanPenguji
 */
export const ACTIVITY_SCOPED_ROLES: Role[] = ['admin_kegiatan', 'penguji'];

interface AuthState {
  user: User | null;
  role: Role | null;
  roleLevel: number;
  isAdmin: boolean;
  isSystemAdmin: boolean;
  isAuthenticated: boolean;
  isActivityScoped: boolean;
  isActivityAdmin: boolean;
  isActivityPenguji: boolean;
  hasRole: (roles: Role[]) => boolean;
  hasMinRole: (minRole: Role) => boolean;
}

function createAuthState(user: User | null): AuthState {
  const role: Role | null = user?.role ?? null;
  const roleLevel = role ? ROLE_HIERARCHY[role] ?? 0 : 0;

  return {
    user,
    role,
    roleLevel,
    isAdmin: role ? ADMIN_ROLES.includes(role) : false,
    isSystemAdmin: role ? SYSTEM_ADMIN_ROLES.includes(role) : false,
    isAuthenticated: !!user,
    /** Activity-scoped roles only see kegiatan they're assigned to */
    isActivityScoped: role ? ACTIVITY_SCOPED_ROLES.includes(role) : false,
    /** User is admin_kegiatan - manages specific kegiatan */
    isActivityAdmin: role === 'admin_kegiatan',
    /** User is penguji - grades participants in specific kegiatan */
    isActivityPenguji: role === 'penguji',
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
}

function readStoredUser(): User | null {
  try {
    const raw = localStorage.getItem('user');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.role) {
        return parsed as User;
      }
    }
  } catch {
    // Silently fail - not authenticated
  }
  return null;
}

/** Empty state used for SSR and the first client (hydration) render. */
const EMPTY_STATE = createAuthState(null);

/**
 * Hook that returns the current user and auth state from localStorage.
 *
 * HYDRATION SAFETY: localStorage is only available on the client, so reading
 * it during render would produce server HTML (no user) that differs from the
 * first client render (user present) — a React hydration mismatch that breaks
 * every dashboard page. The stored user is therefore loaded in an effect
 * AFTER hydration: the first render always matches the server (anonymous),
 * then this hook re-renders with the real auth state.
 *
 * Consumers that must avoid rendering "anonymous" UI (e.g. permission guards)
 * gate on their own `mounted` flag until the state settles.
 */
export function useAuth() {
  const [state, setState] = useState<AuthState>(EMPTY_STATE);

  // Load the stored user after hydration so the first client render
  // matches the server-rendered HTML (prevents hydration mismatch).
  // Also re-read whenever the sessionManager notifies (e.g. after logout or expiry)
  // so any stale client state is immediately cleared across all components.
  useEffect(() => {
    setState(createAuthState(readStoredUser()));
    const unsubscribe = sessionManager.subscribe(() => {
      setState(createAuthState(readStoredUser()));
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Memoize the public shape so consumers get a stable object per state change.
  return useMemo(() => state, [state]);
}
