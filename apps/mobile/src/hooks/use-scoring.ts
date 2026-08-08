import apiClient, { unwrap, ApiResponse } from '../lib/api-client';
import { useApi } from './use-api';

export interface ScoringAspect {
  id: string;
  nama: string;
  deskripsi?: string;
  items: ScoringItem[];
}

export interface ScoringItem {
  id: string;
  nama: string;
  bobot: number;
  skorMaks?: number;
  tipe: string;
}

export interface ScoringParticipant {
  id: string;
  namaLengkap: string;
  status: string;
  ranting?: { id: string; nama: string };
}

export interface ScoreEntry {
  itemPenilaianId: string;
  calonAnggotaId: string;
  nilai: number;
  catatan?: string;
}

export interface ScoreResult {
  scored: number;
  errors: number;
  totalScore: number;
  maxScore: number;
}

/**
 * Fetch assessment aspects with their items.
 */
export function useAssessmentItems() {
  return useApi<ScoringAspect[]>(
    () =>
      apiClient
        .get('/assessments/aspects', { params: { limit: 100 } })
        .then((r) => {
          const aspects = (unwrap(r) ?? []) as ScoringAspect[];
          // Fetch items for each aspect
          return Promise.all(
            aspects.map(async (aspect) => {
              try {
                const { data } = await apiClient.get('/assessments/items', {
                  params: { aspekId: aspect.id },
                });
                const items = (data?.data ?? []) as ScoringItem[];
                return { ...aspect, items };
              } catch {
                return { ...aspect, items: [] };
              }
            }),
          );
        }),
    [],
  );
}

/**
 * Fetch participants for a graduation.
 */
export function useGraduationParticipants(graduationId: string) {
  return useApi<ScoringParticipant[]>(
    () =>
      apiClient
        .get(`/graduations/${graduationId}/participants`)
        .then((r) => (unwrap(r) ?? []) as ScoringParticipant[]),
    [graduationId],
  );
}

/**
 * Fetch existing evaluations for a graduation (to know which already scored).
 */
export function useGraduationEvaluations(graduationId: string) {
  return useApi<unknown[]>(
    () =>
      apiClient
        .get(`/graduations/${graduationId}/evaluations`)
        .then((r) => (unwrap(r) ?? []) as unknown[]),
    [graduationId],
  );
}

/**
 * Submit bulk scores for a participant in a graduation's practical exam.
 * POST /graduations/:kegiatanId/ujian-praktek/:id/score
 */
export async function submitScores(
  kegiatanId: string,
  ujianPraktekId: string,
  scores: ScoreEntry[],
): Promise<ScoreResult> {
  const { data } = await apiClient.post(
    `/graduations/${kegiatanId}/ujian-praktek/${ujianPraktekId}/score`,
    { scores },
  );
  return (data?.data ?? { scored: 0, errors: scores.length, totalScore: 0, maxScore: 0 }) as ScoreResult;
}

/**
 * Find the ujian-praktek ID from a graduation's practical exams list.
 * Uses GET /graduations/:kegiatanId/ujian-praktek
 */
export async function getUjianPraktekId(kegiatanId: string): Promise<string | null> {
  try {
    const { data } = await apiClient.get(`/graduations/${kegiatanId}/ujian-praktek`);
    const list = data?.data as Array<{ id: string }> | undefined;
    if (list && list.length > 0) {
      return list[0].id;
    }
    return null;
  } catch {
    return null;
  }
}
