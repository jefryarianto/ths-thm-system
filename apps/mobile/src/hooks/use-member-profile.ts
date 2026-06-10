import apiClient, { unwrap } from '../lib/api-client';
import { useApi } from './use-api';

export interface MemberProfile {
  namaLengkap: string;
  statusKeanggotaan: string;
  nomorAnggota: string;
  tingkat: string;
}

export function useMemberProfile() {
  return useApi<MemberProfile | null>(
    () =>
      apiClient
        .get('/members', { params: { limit: 1 } })
        .then((r) => (unwrap<MemberProfile[]>(r)?.[0] ?? null) as MemberProfile | null),
    [],
  );
}
