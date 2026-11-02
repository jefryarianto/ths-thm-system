import type { Role, User } from '@/types';

/**
 * Badge scope di layout dashboard (`app/(dashboard)/layout.tsx`).
 *
 * Sumber datanya adalah endpoint **daftar** organisasi, bukan endpoint detail.
 * Endpoint detail (`GET /org-structure/distrik|wilayah|ranting/:id`) hanya
 * terbuka untuk `superadmin` & `admin_nasional`, jadi memakainya membuat badge
 * 403 untuk admin daerah. Endpoint daftar terbuka sampai `penguji`, sehingga
 * nama unit bisa dicocokkan dari id milik user tanpa melonggarkan izin API.
 */
type ScopeIdField = 'distrikId' | 'wilayahId' | 'rantingId';

export type ScopeBadgeLevel = 'Distrik' | 'Wilayah' | 'Ranting';

export interface ScopeBadgeSource {
  /** Endpoint daftar unit — TIDAK boleh berupa `/:id`. */
  endpoint: string;
  /** Field user yang menyimpan id unit yang menjadi scope-nya. */
  idField: ScopeIdField;
  /** Label tingkat yang tampil di badge. */
  level: ScopeBadgeLevel;
}

/**
 * Role yang punya badge scope. `superadmin`/`admin_nasional` tidak terikat satu
 * unit, sedangkan `admin_kegiatan`/`penguji`/`anggota` memakai badge kegiatan.
 */
export const SCOPE_BADGE_SOURCES: Partial<Record<Role, ScopeBadgeSource>> = {
  admin_distrik: { endpoint: '/org-structure/distrik', idField: 'distrikId', level: 'Distrik' },
  admin_wilayah: { endpoint: '/org-structure/wilayah', idField: 'wilayahId', level: 'Wilayah' },
  admin_ranting: { endpoint: '/org-structure/ranting', idField: 'rantingId', level: 'Ranting' },
};

export type ScopeBadgeUser = Pick<User, 'role' | ScopeIdField>;

export interface ScopeBadgeTarget extends ScopeBadgeSource {
  orgId: string;
}

/**
 * Tentukan endpoint + id unit yang harus dicari untuk badge.
 *
 * PENTING: jangan menambahkan syarat `user.rantingId` di sini. Admin distrik &
 * wilayah tidak punya `rantingId`, sehingga syarat seperti itu membuat badge
 * mereka kosong meski API-nya boleh diakses.
 */
export function resolveScopeBadgeTarget(
  user: ScopeBadgeUser | null | undefined,
): ScopeBadgeTarget | null {
  if (!user) return null;

  const source = SCOPE_BADGE_SOURCES[user.role];
  if (!source) return null;

  const orgId = user[source.idField];
  if (!orgId) return null;

  return { ...source, orgId };
}

/** Cari nama unit pada respons daftar berdasarkan id scope user. */
export function findScopeUnitName(
  units: ReadonlyArray<{ id: string; nama?: string | null }> | null | undefined,
  orgId: string,
): string | null {
  const unit = units?.find((item) => item.id === orgId);
  const nama = unit?.nama?.trim();
  return nama ? nama : null;
}

/**
 * Ambil array unit dari respons `apiClient.get()`.
 *
 * `TransformInterceptor` membungkus payload dengan `{ success, data }`, jadi
 * daftar unit ada di `data.data`. Bentuk array mentah tetap diterima agar
 * helper ini tidak rapuh bila amplop berubah.
 */
export function extractScopeUnits(payload: unknown): Array<{ id: string; nama?: string | null }> {
  const body = payload as { data?: unknown } | null | undefined;
  if (Array.isArray(body)) return body as Array<{ id: string; nama?: string | null }>;
  const inner = body?.data;
  return Array.isArray(inner) ? (inner as Array<{ id: string; nama?: string | null }>) : [];
}
