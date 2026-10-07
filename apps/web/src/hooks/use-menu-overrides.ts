'use client';

import { useEffect, useState } from 'react';
import apiClient, { unwrap } from '@/lib/api-client';
import type { Role } from '@/types';

/**
 * Izin menu role sendiri dari tabel RoleMenuPermission — bahan keempat untuk
 * `filterVisibleGroups` (gerbang DB, hanya bisa membatasi).
 *
 * - `enabled` false (belum mount / belum login) atau role `superadmin` →
 *   `null`: sidebar mengikuti gerbang kode saja (superadmin memang selalu
 *   melihat seluruh menu, diatur via kode, bukan tabel).
 * - Gagal memuat → `null` (fail-open): sidebar tetap tampil dengan gerbang
 *   kode; data tetap dilindungi cek server, ini hanya UX visibilitas menu.
 * - Selain itu → record `menuKey → isEnabled` untuk role tersebut.
 */
export function useMenuOverrides(
  role: Role | null | undefined,
  enabled: boolean,
): Record<string, boolean> | null {
  const [overrides, setOverrides] = useState<Record<string, boolean> | null>(null);

  useEffect(() => {
    if (!enabled || !role || role === 'superadmin') {
      setOverrides(null);
      return;
    }

    let cancelled = false;
    apiClient
      .get('/role-menu-permissions/my-menus')
      .then((res) => {
        // Respons dibungkus TransformInterceptor → { success, data };
        // unwrap() adalah aksesor resmi (lihat api-client.ts).
        const body = unwrap<Partial<{ permissions: Record<string, boolean> }>>(res) ?? {};
        if (!cancelled) setOverrides(body.permissions ?? {});
      })
      .catch(() => {
        if (!cancelled) setOverrides(null);
      });

    return () => {
      cancelled = true;
    };
  }, [role, enabled]);

  return overrides;
}
