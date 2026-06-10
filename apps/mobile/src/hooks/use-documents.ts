import apiClient, { unwrap } from '../lib/api-client';
import { useApi } from './use-api';

export interface DocumentItem {
  id: string;
  nomorDokumen: string;
  tipe: string;
  anggota?: { namaLengkap: string };
  status: string;
  filePath?: string;
  createdAt: string;
}

export const TIPE_LABELS: Record<string, string> = {
  kartu_anggota: 'Kartu Anggota',
  sertifikat_pendadaran: 'Sertifikat Pendadaran',
  sertifikat_pelatihan: 'Sertifikat Pelatihan',
  piagam_prestasi: 'Piagam Prestasi',
  surat_keterangan: 'Surat Keterangan',
};

export const TIPE_ICONS: Record<string, string> = {
  kartu_anggota: 'card',
  sertifikat_pendadaran: 'school',
  sertifikat_pelatihan: 'ribbon',
  piagam_prestasi: 'trophy',
  surat_keterangan: 'document-text',
};

export const STATUS_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: 'Draft', color: '#6b7280', bg: '#f3f4f6' },
  published: { label: 'Published', color: '#16a34a', bg: '#ecfdf5' },
  archived: { label: 'Diarsipkan', color: '#d97706', bg: '#fef3c7' },
};

export const TIPE_FILTERS = [
  { value: '', label: 'Semua' },
  { value: 'kartu_anggota', label: 'Kartu Anggota' },
  { value: 'sertifikat_pendadaran', label: 'Sertifikat' },
  { value: 'piagam_prestasi', label: 'Piagam' },
  { value: 'surat_keterangan', label: 'Surat Ket.' },
];

export function useDocuments(search: string, filterTipe: string) {
  return useApi<DocumentItem[]>(
    () =>
      apiClient
        .get('/documents', {
          params: { limit: 50, search: search.trim() || undefined, tipe: filterTipe || undefined },
        })
        .then((r) => (unwrap(r) ?? []) as DocumentItem[]),
    [search, filterTipe],
  );
}
