import apiClient, { unwrap } from '../lib/api-client';
import { useApi } from './use-api';
import type { AssessmentsAspect, AssessmentsItem, AssessmentsScore } from '../types';

export const STATUS_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: 'Draft', color: '#6b7280', bg: '#f3f4f6' },
  published: { label: 'Aktif', color: '#16a34a', bg: '#ecfdf5' },
  archived: { label: 'Diarsipkan', color: '#d97706', bg: '#fef3c7' },
};

export const FILTER_OPTIONS = [
  { value: '', label: 'Semua' },
  { value: 'published', label: 'Aktif' },
  { value: 'draft', label: 'Draft' },
  { value: 'archived', label: 'Diarsipkan' },
];

export function useAspects(search?: string, filter?: string) {
  return useApi<AssessmentsAspect[]>(
    () =>
      apiClient
        .get('/assessments/aspects', {
          params: {
            limit: 50,
            search: search?.trim() || undefined,
            status: filter || undefined,
          },
        })
        .then((r) => (unwrap(r) ?? []) as AssessmentsAspect[]),
    [search, filter],
  );
}

export function useAspectDetail(id: string) {
  return useApi<AssessmentsAspect>(
    () => apiClient.get(`/assessments/aspects/${id}`).then((r) => unwrap(r) as AssessmentsAspect),
    [id],
  );
}

export function useItems(aspectId?: string) {
  return useApi<AssessmentsItem[]>(
    () =>
      apiClient
        .get('/assessments/items', {
          params: { aspekId: aspectId || undefined, limit: 100 },
        })
        .then((r) => (unwrap(r) ?? []) as AssessmentsItem[]),
    [aspectId],
  );
}

export function useScores(aspectId?: string) {
  return useApi<AssessmentsScore[]>(
    () =>
      apiClient
        .get('/assessments/scores', {
          params: { aspekId: aspectId || undefined, limit: 100 },
        })
        .then((r) => (unwrap(r) ?? []) as AssessmentsScore[]),
    [aspectId],
  );
}
