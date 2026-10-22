import { Role } from '@ths-thm/shared-types';

/**
 * Scope context attached to request by ScopeGuard.
 * Services can access this to filter data by scope level.
 */
export interface UserScope {
  /** The resolved ranting ID (branch level) */
  rantingId?: string;
  /** The resolved wilayah ID (region level) */
  wilayahId?: string;
  /** The resolved distrik ID (district level) */
  distrikId?: string;
  /**
   * Role pengguna — digunakan untuk membezakan superadmin, admin_nasional,
   *   dan role org-hierarchy lainnya.
   *   - 'superadmin': scope kosong, akses penuh national
   *   - 'admin_nasional': scope kosong tapi role terbatas (bukan superadmin)
   *   - 'admin_distrik'/`admin_wilayah`/'admin_ranting'/'admin_kegiatan': punya hierarki
   *   - 'anggota'/'penguji': self scope dengan selfMemberId
   */
  role?:
    | 'superadmin'
    | 'admin_nasional'
    | 'admin_distrik'
    | 'admin_wilayah'
    | 'admin_ranting'
    | 'admin_kegiatan'
    | 'anggota'
    | 'penguji';
  /**
   * The member ID of the authenticated user, set only when their scope is 'self'
   * (role `anggota` or `penguji`).
   *
   * Services MUST treat this as a row-level restriction: when present, the user
   * may only access rows that belong to this member (plus the examiner exemption
   * for kegiatan-related modules — see buildSelfScopeFilter).
   *
   * SECURITY: `selfMemberId` is *not* the same as an empty scope. A national
   * admin has no scope fields at all (unrestricted), whereas a `self` user has
   * `selfMemberId` set but no org hierarchy — so any access check that only
   * looks at rantingId/wilayahId/distrikId would wrongly grant them everything.
   * Use `isSelfScope(scope)` or `buildSelfScopeFilter()` instead of raw checks.
   */
  selfMemberId?: string;
}

/**
 * True when the scope belongs to an `anggota`/`penguji` who must be restricted
 * to their own rows. Note this is deliberately NOT `!scope.rantingId && ...`,
 * because superadmin also has an empty scope.
 */
export function isSelfScope(
  scope?: UserScope | null,
): scope is UserScope & { selfMemberId: string } {
  return !!scope?.selfMemberId;
}

/**
 * Extended request with user scope information.
 */
export interface ScopedRequest {
  user: {
    id: string;
    email: string;
    role: Role;
    distrikId?: string;
    wilayahId?: string;
    rantingId?: string;
    namaLengkap?: string;
  };
  scope?: UserScope;
  method?: string;
  url?: string;
  ip?: string;
}
