import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Generic hook for a single API fetch (React Native).
 *
 * @example
 * ```tsx
 * const { data, loading, error, refetch } = useApi<DashboardData>(
 *   () => apiClient.get('/reports/dashboard').then(r => r.data.data),
 *   []
 * );
 * ```
 */
export function useApi<T>(fetcher: () => Promise<T>, deps: React.DependencyList) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      if (mountedRef.current) {
        setData(result);
        setLoading(false);
      }
    } catch {
      if (mountedRef.current) {
        setData(null);
        setLoading(false);
        setError('Terjadi kesalahan');
      }
    }
  }, deps);

  useEffect(() => {
    mountedRef.current = true;
    execute();
    return () => { mountedRef.current = false; };
  }, [execute]);

  return { data, loading, error, refetch: execute };
}

/**
 * Hook for a paginated list (React Native).
 *
 * @example
 * ```tsx
 * const { data, loading, refetch } = usePaginatedList<DuesItem>(
 *   () => apiClient.get('/dues', { params }).then(r => r.data),
 *   [filterStatus]
 * );
 * ```
 */
export function usePaginatedList<T>(
  fetcher: () => Promise<{ data: T[]; meta: { total: number; totalPages: number } }>,
  deps: React.DependencyList,
) {
  const [data, setData] = useState<T[]>([]);
  const [meta, setMeta] = useState({ total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      if (mountedRef.current) {
        setData(result.data || []);
        setMeta(result.meta || { total: 0, totalPages: 0 });
        setLoading(false);
      }
    } catch {
      if (mountedRef.current) {
        setData([]);
        setMeta({ total: 0, totalPages: 0 });
        setLoading(false);
        setError('Gagal memuat data');
      }
    }
  }, deps);

  useEffect(() => {
    mountedRef.current = true;
    execute();
    return () => { mountedRef.current = false; };
  }, [execute]);

  return { data, meta, loading, error, refetch: execute };
}
