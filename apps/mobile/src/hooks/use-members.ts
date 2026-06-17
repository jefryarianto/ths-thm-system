import apiClient, { unwrap } from '../lib/api-client';
import { useApi } from './use-api';

export interface Member {
  id: string;
  namaLengkap: string;
  noAnggota: string;
  tingkat: string;
  statusKeanggotaan: string;
  ranting?: { nama: string };
}

export const STATUS_OPTIONS = [
  { value: '', label: 'Semua' },
  { value: 'aktif', label: 'Aktif' },
  { value: 'nonaktif', label: 'Nonaktif' },
  { value: 'alumni', label: 'Alumni' },
];

export const TINGKAT_OPTIONS = [
  { value: '', label: 'Semua' },
  { value: 'dasar', label: 'Dasar' },
  { value: 'menengah', label: 'Menengah' },
  { value: 'lanjut', label: 'Lanjut' },
  { value: 'instruktur', label: 'Instruktur' },
];

export function useMembers(search: string, filterStatus: string, filterTingkat: string) {
  return useApi<Member[]>(
    () =>
      apiClient
        .get('/members', {
          params: {
            limit: 50,
            search: search.trim() || undefined,
            status: filterStatus || undefined,
            tingkat: filterTingkat || undefined,
          },
        })
        .then((r) => (unwrap(r) ?? []) as Member[]),
    [search, filterStatus, filterTingkat],
  );
}
