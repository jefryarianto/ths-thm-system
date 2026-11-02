import { UserScope } from '../interfaces/user-scope.interface';

export type ScopeStrategy = 'ranting' | 'anggota_indirect' | 'kegiatan';

export interface ScopeResource {
  rantingId?: string | null;
  anggotaId?: string | null;
  anggota?: { rantingId?: string | null } | null;
  scopeType?: string | null;
  scopeId?: string | null;
}

export type BuildFilterOptions = {
  basePath?: string;
  relationPath?: string;
};

export { UserScope };
