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
}

/**
 * Extended request with user scope information.
 */
export interface ScopedRequest {
  user: {
    id: string;
    email: string;
    role: Role;
    rantingId?: string;
    namaLengkap?: string;
  };
  scope?: UserScope;
  method?: string;
  url?: string;
  ip?: string;
}
