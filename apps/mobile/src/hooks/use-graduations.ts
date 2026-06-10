import apiClient, { unwrap } from '../lib/api-client';
import { useApi } from './use-api';

export interface Graduation {
  id: string;
  nama: string;
  lokasi?: string;
  tanggalMulai: string;
  tanggalSelesai?: string;
  status: string;
}

export const STATUS_STYLES: Record<string, { label: string; icon: string; bg: string; color: string }> = {
  draft: { label: 'Draft', icon: 'create', bg: '#f3f4f6', color: '#6b7280' },
  published: { label: 'Berlangsung', icon: 'checkmark-circle', bg: '#ecfdf5', color: '#16a34a' },
  closed: { label: 'Selesai', icon: 'flag', bg: '#eff6ff', color: '#2563eb' },
  cancelled: { label: 'Dibatalkan', icon: 'close-circle', bg: '#fef2f2', color: '#dc2626' },
};

export const FILTERS = [
  { value: '', label: 'Semua' },
  { value: 'published', label: 'Berlangsung' },
  { value: 'closed', label: 'Selesai' },
  { value: 'draft', label: 'Draft' },
];

export function useGraduations(search: string, filterStatus: string) {
  return useApi<Graduation[]>(
    () =>
      apiClient
        .get('/graduations', {
          params: { limit: 50, search: search.trim() || undefined, status: filterStatus || undefined },
        })
        .then((r) => (unwrap(r) ?? []) as Graduation[]),
    [search, filterStatus],
  );
}
