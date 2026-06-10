import apiClient, { unwrap } from '../lib/api-client';
import { useApi } from './use-api';

export interface Activity {
  id: string;
  nama: string;
  tipe: string;
  lokasi?: string;
  tanggalMulai: string;
  status: string;
  scopeType?: string;
}

export const STATUS_STYLES: Record<string, { label: string; bg: string; color: string }> = {
  draft: { label: 'Draft', bg: '#f3f4f6', color: '#6b7280' },
  published: { label: 'Berlangsung', bg: '#ecfdf5', color: '#16a34a' },
  closed: { label: 'Selesai', bg: '#eff6ff', color: '#2563eb' },
  cancelled: { label: 'Dibatalkan', bg: '#fef2f2', color: '#dc2626' },
};

export const TIPE_ICONS: Record<string, string> = {
  latihan: 'fitness',
  pendadaran: 'school',
  ujian_tingkat: 'trending-up',
  rapat: 'people',
  retret: 'sunny',
  pelantikan: 'ribbon',
  lainnya: 'ellipsis-horizontal',
};

export const FILTER_OPTIONS = [
  { value: '', label: 'Semua' },
  { value: 'published', label: 'Berlangsung' },
  { value: 'closed', label: 'Selesai' },
  { value: 'draft', label: 'Draft' },
];

export function useActivities(filter: string) {
  return useApi<Activity[]>(
    () =>
      apiClient
        .get('/activities', { params: { limit: 50, status: filter || undefined } })
        .then((r) => (unwrap(r) ?? []) as Activity[]),
    [filter],
  );
}
