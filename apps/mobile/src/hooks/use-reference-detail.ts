import { useEffect, useState, useCallback } from 'react';
import apiClient, { unwrap } from '../lib/api-client';

/** Return type of the useReferenceDetail hook */
export interface ReferenceDetailState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Generic hook for reference detail screens (claim, letter, document).
 *
 * Handles the shared fetch + state management pattern:
 * - ID guard (missing id → error)
 * - Loading state
 * - 404 detection
 * - Error state with message
 * - Refetch capability
 *
 * @example
 * ```tsx
 * const { data, loading, error, refetch } = useReferenceDetail<ClaimDetail>(
 *   id, '/claims/', 'klaim'
 * );
 * ```
 */
export function useReferenceDetail<T>(
  id: string | undefined,
  apiPath: string,
  entityName: string,
  extraDeps?: unknown[],
): ReferenceDetailState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!id) {
      setError(`ID ${entityName} tidak tersedia`);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get(`${apiPath}${id}`);
      const unwrapped = unwrap(response) as T | null;
      if (unwrapped) {
        setData(unwrapped);
      } else {
        setError(`${entityName.charAt(0).toUpperCase() + entityName.slice(1)} tidak ditemukan`);
      }
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      const baseMsg = `${entityName.charAt(0).toUpperCase() + entityName.slice(1)} tidak ditemukan`;
      const failMsg = `Gagal memuat data ${entityName}`;
      setError(status === 404 ? baseMsg : failMsg);
    } finally {
      setLoading(false);
    }
  }, [id, apiPath, entityName]);

  useEffect(() => {
    fetchData();
  }, [fetchData, ...(extraDeps || [])]);

  return { data, loading, error, refetch: fetchData };
}
