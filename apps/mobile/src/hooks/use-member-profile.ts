import apiClient, { unwrap } from '../lib/api-client';
import { useApi } from './use-api';

export interface MemberProfile {
  id: string;
  namaLengkap: string;
  statusKeanggotaan: string;
  nomorAnggota: string;
  tingkat: string;
  statusData?: 'complete' | 'incomplete';
  statusValidasi?: 'pending' | 'approved' | 'rejected';
  missingFields?: string[];
  email?: string;
  noHp?: string;
  tempatLahir?: string;
  tanggalLahir?: string;
  alamat?: string;
  fotoPath?: string | null;
  jenisKelamin?: string | null;
  tempatDadar?: string | null;
  tahunDadar?: string | null;
  ranting?: {
    nama?: string;
    wilayah?: { nama?: string; distrik?: { nama?: string; alamat?: string | null } };
  } | null;
}

export function useMemberProfile() {
  return useApi<MemberProfile | null>(
    () =>
      apiClient
        .get('/members/me')
        .then((r) => (unwrap<MemberProfile | null>(r) ?? null) as MemberProfile | null)
        .catch(() => null),
    [],
  );
}
