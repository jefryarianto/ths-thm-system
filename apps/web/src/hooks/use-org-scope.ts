'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';

export interface OrgScopeLocks {
  /** Role aktor (dari /auth/scope) — null selama belum termuat. */
  role: string | null;
  /** Kunci pilihan distrik ke distrik aktor (admin_distrik & admin_wilayah). */
  lockDistrikId?: string;
  /** Kunci pilihan wilayah ke wilayah aktor (admin_wilayah & admin_ranting). */
  lockWilayahId?: string;
  /** True setelah pemuatan selesai (sukses maupun gagal). */
  ready: boolean;
}

interface WilayahRow {
  id: string;
  distrikId?: string;
  distrik?: { id: string } | null;
}

interface RantingRow {
  id: string;
  wilayahId?: string;
  wilayah?: { id: string; distrikId?: string; distrik?: { id: string } | null } | null;
}

/**
 * Menentukan batas cascade organisasi berdasarkan scope aktor.
 *
 * - superadmin → tanpa kunci (bebas memilih distrik/wilayah/ranting).
 * - admin_distrik → `/auth/scope` memberi `distrikId` → kunci distrik.
 * - admin_wilayah → `/auth/scope` hanya memberi `wilayahId` → distrik di-derive
 *   dari daftar wilayah (`/org-structure/wilayah`, memuat relasi distrik).
 * - admin_ranting → `/auth/scope` hanya memberi `rantingId` → wilayah & distrik
 *   di-derive dari daftar ranting (`/org-structure/ranting`, memuat ranting →
 *   wilayah → distrik).
 *
 * Sinkron dengan validasi server-side: request di luar cakupan tetap ditolak
 * API (403), hook ini hanya menyelaraskan pilihan di UI.
 */
export function useOrgScopeLocks(enabled: boolean): OrgScopeLocks {
  const [locks, setLocks] = useState<OrgScopeLocks>({ role: null, ready: false });

  useEffect(() => {
    if (!enabled) {
      setLocks({ role: null, ready: false });
      return;
    }
    let active = true;

    (async () => {
      try {
        const { data: res } = await apiClient.get('/auth/scope');
        const role: string | null = res?.data?.role ?? null;
        let distrikId: string = res?.data?.distrikId ?? '';
        let wilayahId: string = res?.data?.wilayahId ?? '';
        const rantingId: string = res?.data?.rantingId ?? '';

        if (role && role !== 'superadmin') {
          // admin_wilayah: /auth/scope tidak mengirim distrikId → derive.
          if (!distrikId && wilayahId) {
            const { data: w } = await apiClient.get('/org-structure/wilayah');
            const found = ((w?.data ?? []) as WilayahRow[]).find((x) => x.id === wilayahId);
            distrikId = found?.distrikId ?? found?.distrik?.id ?? '';
          }
          // admin_ranting: hanya rantingId → derive wilayah + distrik.
          if (!wilayahId && rantingId) {
            const { data: r } = await apiClient.get('/org-structure/ranting');
            const found = ((r?.data ?? []) as RantingRow[]).find((x) => x.id === rantingId);
            wilayahId = found?.wilayahId ?? found?.wilayah?.id ?? '';
            distrikId = distrikId || found?.wilayah?.distrikId || found?.wilayah?.distrik?.id || '';
          }
        }

        if (active) {
          setLocks({
            role,
            lockDistrikId: distrikId || undefined,
            lockWilayahId: wilayahId || undefined,
            ready: true,
          });
        }
      } catch {
        // Non-kritis: tanpa kunci, API tetap menolak penempatan di luar cakupan.
        if (active) setLocks({ role: null, ready: true });
      }
    })();

    return () => {
      active = false;
    };
  }, [enabled]);

  return locks;
}
