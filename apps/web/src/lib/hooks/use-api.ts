'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Generic hook for a single API fetch.
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
    } catch (err) {
      if (mountedRef.current) {
        setData(null);
        setLoading(false);
        setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
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
 * Hook for a paginated list page.
 * Manages data, meta, loading, and error state automatically.
 *
 * @example
 * ```tsx
 * const { data, meta, loading, refetch } = usePaginatedList<Examiner>(
 *   () => apiClient.get('/examiners', { params: { page, limit: 10 } }).then(r => r.data),
 *   [page, search]
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

/**
 * Build the empty state config for a DataTable.
 * Standardizes the "Tidak ada X yang cocok dengan filter" / "Belum ada X" pattern.
 *
 * @example
 * ```tsx
 * <DataTable
 *   empty={{
 *     icon: Users,
 *     ...buildEmptyMessage('user', !!(search || filterRole || filterActive), () => { setSearch(''); setFilterRole(''); setFilterActive(''); setPage(1); }),
 *   }}
 *   ...
 * />
 * ```
 */
export function buildEmptyMessage(
  itemName: string,
  hasActiveFilters: boolean,
  onReset: () => void,
): { message: string; action?: { label: string; onClick: () => void } } {
  if (hasActiveFilters) {
    return {
      message: `Tidak ada ${itemName} yang cocok dengan filter`,
      action: { label: 'Reset filter', onClick: onReset },
    };
  }
  return { message: `Belum ada ${itemName}` };
}
