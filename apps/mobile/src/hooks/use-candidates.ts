import apiClient, { unwrap } from '../lib/api-client';
import { useApi } from './use-api';

export interface Candidate {
  id: string;
  namaLengkap: string;
  jenisKelamin: string;
  status: string;
  createdAt: string;
  ranting?: { nama: string };
}

export const STATUS_STYLES: Record<string, { label: string; bg: string; color: string }> = {
  diusulkan: { label: 'Diusulkan', bg: '#eff6ff', color: '#2563eb' },
  mengikuti_pendadaran: { label: 'Pendadaran', bg: '#fef3c7', color: '#d97706' },
  lulus: { label: 'Lulus', bg: '#ecfdf5', color: '#16a34a' },
  gagal: { label: 'Gagal', bg: '#fef2f2', color: '#dc2626' },
  dibatalkan: { label: 'Dibatalkan', bg: '#f3f4f6', color: '#6b7280' },
};

export const STATUS_FILTERS = [
  { value: '', label: 'Semua' },
  { value: 'diusulkan', label: 'Diusulkan' },
  { value: 'mengikuti_pendadaran', label: 'Pendadaran' },
  { value: 'lulus', label: 'Lulus' },
  { value: 'gagal', label: 'Gagal' },
];

export function useCandidates(search: string, filterStatus: string) {
  return useApi<Candidate[]>(
    () =>
      apiClient
        .get('/candidates', {
          params: { limit: 50, search: search.trim() || undefined, status: filterStatus || undefined },
        })
        .then((r) => (unwrap(r) ?? []) as Candidate[]),
    [search, filterStatus],
  );
}
