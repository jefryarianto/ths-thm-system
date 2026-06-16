import apiClient, { unwrap } from '../lib/api-client';
import { useApi } from './use-api';

export interface OrgDocument {
  id: string;
  nama: string;
  tipe: string;
  createdAt: string;
  fileUrl?: string;
}

export const TIPE_OPTIONS = [
  { value: '', label: 'Semua' },
  { value: 'sk', label: 'SK' },
  { value: 'piagam', label: 'Piagam' },
  { value: 'sertifikat', label: 'Sertifikat' },
  { value: 'lainnya', label: 'Lainnya' },
];

export function useOrgDocuments(filter: string) {
  return useApi<OrgDocument[]>(
    () =>
      apiClient
        .get('/org-documents', {
          params: { limit: 50, tipe: filter || undefined },
        })
        .then((r) => (unwrap(r) ?? []) as OrgDocument[]),
    [filter],
  );
}