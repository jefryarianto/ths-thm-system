'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/** Check if error is transient (network/5xx) vs permanent (4xx). */
function isTransientError(err: unknown): boolean {
  if (err instanceof Error) {
    if (err.message === 'SESSION_EXPIRED') return false;
    const n = err as { status?: number; message?: string };
    if (n.status) {
      if (n.status >= 400 && n.status < 500 && n.status !== 408) return false;
      return true;
    }
    if (err.message.includes('Network') || err.message.includes('timeout') || err.message.includes('ECONNABORTED')) return true;
  }
  return false;
}

const RETRY_BASE_DELAY = 2000;
const MAX_AUTO_RETRIES = 3;

/**
 * Generic hook for a single API fetch with stale-while-revalidate behavior.
 *
 * On transient errors (network/5xx):
 * - Keeps stale data visible (no flash of error state)
 * - Silently retries up to 3 times with exponential backoff
 * - Only shows error after all retries exhausted
 *
 * On permanent errors (4xx auth):
 * - Clears data and shows error immediately
 */
export function useApi<T>(fetcher: () => Promise<T>, deps: React.DependencyList, enabled = true) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const cleanup = useCallback(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  const execute = useCallback(async (isRetry = false) => {
    if (!isRetry) {
      retryCountRef.current = 0;
      setLoading(true);
      setError(null);
    }
    try {
      const result = await fetcherRef.current();
      if (mountedRef.current) {
        setData(result);
        setLoading(false);
        setError(null);
        retryCountRef.current = 0;
      }
    } catch (err) {
      // Suppress SESSION_EXPIRED — SessionProvider handles redirect
      if (err instanceof Error && err.message === 'SESSION_EXPIRED') {
        if (mountedRef.current) setLoading(false);
        return;
      }

      if (!mountedRef.current) return;

      if (isTransientError(err) && retryCountRef.current < MAX_AUTO_RETRIES) {
        // Transient error + retries remaining -> silent background retry
        retryCountRef.current += 1;
        const delay = RETRY_BASE_DELAY * Math.pow(2, retryCountRef.current - 1);
        if (!isRetry) {
          // First transient error: don't clear data or show error
          setLoading(false);
        }
        cleanup();
        retryTimerRef.current = setTimeout(() => {
          if (mountedRef.current) {
            execute(true);
          }
        }, delay);
        return;
      }

      // Permanent error OR all retries exhausted
      if (mountedRef.current) {
        setLoading(false);
        if (!data) {
          // No stale data -> show error
          setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
        }
        // If we have stale data, keep it visible (don't overwrite with error)
        retryCountRef.current = 0;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    mountedRef.current = true;
    if (enabled) {
      execute();
    } else {
      setLoading(false);
    }
    return () => {
      mountedRef.current = false;
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [execute, enabled]);

  const refetch = useCallback(() => execute(false), [execute]);
  return { data, loading, error, refetch };
}

/**
 * Hook for a paginated list page with stale-while-revalidate behavior.
 * Manages data, meta, loading, and error state automatically.
 */
export function usePaginatedList<T>(
  fetcher: () => Promise<{ data: T[]; meta: { total: number; totalPages: number } }>,
  deps: React.DependencyList,
  enabled = true,
) {
  const [data, setData] = useState<T[]>([]);
  const [meta, setMeta] = useState({ total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const cleanup = useCallback(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  const execute = useCallback(async (isRetry = false) => {
    if (!isRetry) {
      retryCountRef.current = 0;
      setLoading(true);
      setError(null);
    }
    try {
      const result = await fetcherRef.current();
      if (mountedRef.current) {
        setData(result.data || []);
        setMeta(result.meta || { total: 0, totalPages: 0 });
        setLoading(false);
        setError(null);
        retryCountRef.current = 0;
      }
    } catch (err) {
      // Suppress SESSION_EXPIRED — SessionProvider handles redirect
      if (err instanceof Error && err.message === 'SESSION_EXPIRED') {
        if (mountedRef.current) setLoading(false);
        return;
      }

      if (!mountedRef.current) return;

      if (isTransientError(err) && retryCountRef.current < MAX_AUTO_RETRIES) {
        retryCountRef.current += 1;
        const delay = RETRY_BASE_DELAY * Math.pow(2, retryCountRef.current - 1);
        if (!isRetry) setLoading(false);
        cleanup();
        retryTimerRef.current = setTimeout(() => {
          if (mountedRef.current) execute(true);
        }, delay);
        return;
      }

      if (mountedRef.current) {
        setLoading(false);
        if (data.length === 0) {
          setData([]);
          setMeta({ total: 0, totalPages: 0 });
          setError('Gagal memuat data');
        }
        retryCountRef.current = 0;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    mountedRef.current = true;
    if (enabled) {
      execute();
    } else {
      setLoading(false);
    }
    return () => {
      mountedRef.current = false;
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [execute, enabled]);

  const refetch = useCallback(() => execute(false), [execute]);
  return { data, meta, loading, error, refetch };
}

/**
 * Build the empty state config for a DataTable.
 * Standardizes the "Tidak ada X yang cocok dengan filter" / "Belum ada X" pattern.
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
