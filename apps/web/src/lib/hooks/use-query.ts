'use client';

import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryOptions,
  UseMutationOptions,
} from '@tanstack/react-query';
import apiClient, { unwrap, normalizeAxiosError } from '@/lib/api-client';

/**
 * TanStack Query-based replacements for useApi/usePaginatedList.
 *
 * Benefits over hand-rolled hooks:
 * - Automatic caching & deduplication
 * - Background refetching (stale-while-revalidate built-in)
 * - Devtools integration
 * - Pagination helpers (useInfiniteQuery)
 * - Mutation state management
 * - Retry with exponential backoff (configurable)
 */

// Type helpers
export type QueryKey = readonly unknown[];
export type QueryFn<T> = () => Promise<T>;

// Error handling
function isTransientError(err: unknown): boolean {
  if (err instanceof Error) {
    if (err.message === 'SESSION_EXPIRED') return false;
    const n = err as { status?: number; message?: string };
    if (n.status) {
      if (n.status >= 400 && n.status < 500 && n.status !== 408) return false;
      return true;
    }
    if (
      err.message.includes('Network') ||
      err.message.includes('timeout') ||
      err.message.includes('ECONNABORTED')
    )
      return true;
  }
  return false;
}

/**
 * Generic query hook for single data fetch.
 * Replaces useApi.
 */
export function useQueryData<T>(
  key: QueryKey,
  queryFn: QueryFn<T>,
  options?: Omit<
    UseQueryOptions<T, Error, T, QueryKey>,
    'queryKey' | 'queryFn'
  >,
) {
  return useQuery<T, Error, T, QueryKey>({
    queryKey: key,
    queryFn,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: (failureCount, error) => {
      // Don't retry SESSION_EXPIRED
      if (error instanceof Error && error.message === 'SESSION_EXPIRED') {
        return false;
      }
      // Retry transient errors up to 2 times
      if (isTransientError(error) && failureCount < 3) {
        return true;
      }
      return false;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchOnMount: true,
    ...options,
  });
}

/**
 * Query hook for paginated list data.
 * Replaces usePaginatedList.
 */
export function usePaginatedQuery<T>(
  key: QueryKey,
  queryFn: QueryFn<{
    data: T[];
    meta: { total: number; totalPages: number };
  }>,
  options?: Omit<
    UseQueryOptions<
      { data: T[]; meta: { total: number; totalPages: number } },
      Error,
      { data: T[]; meta: { total: number; totalPages: number } },
      QueryKey
    >,
    'queryKey' | 'queryFn'
  >,
) {
  return useQuery({
    queryKey: key,
    queryFn,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message === 'SESSION_EXPIRED') {
        return false;
      }
      if (isTransientError(error) && failureCount < 3) {
        return true;
      }
      return false;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchOnMount: true,
    ...options,
  });
}

/**
 * Infinite query hook for cursor/offset-based pagination.
 */
export function useInfinitePaginatedQuery<T>(
  key: QueryKey,
  queryFn: (pageParam: number) => Promise<{
    data: T[];
    meta: { total: number; totalPages: number; currentPage: number };
  }>,
  options?: Omit<
    UseQueryOptions<
      { data: T[]; meta: { total: number; totalPages: number; currentPage: number } },
      Error,
      { data: T[]; meta: { total: number; totalPages: number; currentPage: number } },
      QueryKey
    >,
    'queryKey' | 'queryFn'
  >,
) {
  // Note: TanStack Query v5 uses useInfiniteQuery for this pattern
  // This is a placeholder for when we migrate to useInfiniteQuery
  return usePaginatedQuery(key, queryFn, options);
}

/**
 * Mutation hook for create/update/delete operations.
 */
export function useApiMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: Omit<
    UseMutationOptions<TData, Error, TVariables, unknown>,
    'mutationFn'
  >,
) {
  const queryClient = useQueryClient();

  return useMutation<TData, Error, TVariables, unknown>({
    mutationFn,
    onError: (error) => {
      // Normalize error for consistent handling
      const normalized = normalizeAxiosError(error);
      console.error('[Mutation Error]', normalized);
    },
    onSettled: (data, error, variables, context) => {
      // Optionally invalidate related queries
      options?.onSettled?.(data, error, variables, context);
    },
    ...options,
  });
}

/**
 * Convenience mutation for POST (create) with auto-invalidation.
 */
export function useCreateMutation<TData, TVariables>(
  endpoint: string,
  invalidateKeys: QueryKey[],
) {
  const queryClient = useQueryClient();
  return useApiMutation<TData, TVariables>(
    (variables) => apiClient.post(endpoint, variables).then(unwrap),
    {
      onSuccess: () => {
        invalidateKeys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
      },
    },
  );
}

/**
 * Convenience mutation for PATCH/PUT (update) with auto-invalidation.
 */
export function useUpdateMutation<TData, TVariables>(
  endpoint: string,
  invalidateKeys: QueryKey[],
) {
  const queryClient = useQueryClient();
  return useApiMutation<TData, TVariables>(
    (variables) => apiClient.patch(endpoint, variables).then(unwrap),
    {
      onSuccess: () => {
        invalidateKeys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
      },
    },
  );
}

/**
 * Convenience mutation for DELETE with auto-invalidation.
 */
export function useDeleteMutation<TData, TVariables>(
  endpoint: string,
  invalidateKeys: QueryKey[],
) {
  const queryClient = useQueryClient();
  return useApiMutation<TData, TVariables>(
    (variables) => apiClient.delete(endpoint).then(unwrap),
    {
      onSuccess: () => {
        invalidateKeys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
      },
    },
  );
}

/**
 * Hook to manually invalidate queries.
 */
export function useInvalidateQueries() {
  const queryClient = useQueryClient();
  return (keys: QueryKey[]) => {
    keys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
  };
}

/**
 * Build empty state message for tables.
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

// Export types for consumers
export type { UseQueryOptions, UseMutationOptions };