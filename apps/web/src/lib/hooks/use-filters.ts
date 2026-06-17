'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

/**
 * Configuration for a single filter field.
 */
export interface FilterConfig {
  key: string;
  defaultValue: string;
}

interface UseFiltersOptions {
  /** Initial search value (default '') */
  initialSearch?: string;
  /** Filter configurations */
  filters?: FilterConfig[];
  /** Debounced search value — the hook will call setPage(1) when this changes */
  debouncedSearch?: string;
}

interface UseFiltersReturn {
  // State
  page: number;
  search: string;
  filters: Record<string, string>;
  // Actions
  setPage: (page: number) => void;
  setSearch: (search: string) => void;
  setFilter: (key: string, value: string) => void;
  resetFilters: () => void;
  // Derived
  hasActiveFilters: boolean;
  /** Builds a params object for API calls: { page, limit, search, ...filters } */
  getApiParams: (extra?: Record<string, unknown>) => Record<string, unknown>;
}

/**
 * Standardized hook for managing search, filter, and pagination state across dashboard pages.
 *
 * Automatically resets page to 1 when search or any filter changes.
 *
 * @example
 * ```tsx
 * const { page, setPage, search, setSearch, filters, setFilter, resetFilters, hasActiveFilters, getApiParams } = useFilters({
 *   debouncedSearch, // from useDebounce(search, 300)
 *   filters: [
 *     { key: 'status', defaultValue: '' },
 *     { key: 'tipe', defaultValue: '' },
 *   ],
 * });
 *
 * // API call
 * const params = getApiParams({ limit: 10 });
 * apiClient.get('/items', { params });
 *
 * // Reset
 * <SearchBar search={search} onSearchChange={setSearch} onReset={resetFilters}>
 *   <FilterSelect value={filters.status} onChange={v => setFilter('status', v)} ... />
 * </SearchBar>
 * ```
 */
export function useFilters(options: UseFiltersOptions = {}): UseFiltersReturn {
  const { initialSearch = '', filters: filterConfigs = [], debouncedSearch } = options;

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState(initialSearch);

  // Build initial filter state from config (stable reference)
  const [initialFilters] = useState(() =>
    Object.fromEntries(filterConfigs.map((f) => [f.key, f.defaultValue])),
  );
  const [filters, setFilters] = useState<Record<string, string>>(initialFilters);

  // Reset page when search changes (only if not using debouncedSearch)
  useEffect(() => {
    if (debouncedSearch === undefined) {
      setPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Reset page when debouncedSearch changes (if provided)
  useEffect(() => {
    if (debouncedSearch !== undefined) {
      setPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  // Reset page when any filter changes
  useEffect(() => {
    setPage(1);
  }, [filters]);

  const setFilter = useCallback((key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setSearch(initialSearch);
    setFilters(initialFilters);
    setPage(1);
  }, [initialSearch, initialFilters]);

  const hasActiveFilters = useMemo(
    () => search !== initialSearch || filterConfigs.some((f) => filters[f.key] !== f.defaultValue),
    [search, initialSearch, filters, filterConfigs],
  );

  const getApiParams = useCallback(
    (extra?: Record<string, unknown>): Record<string, unknown> => {
      const params: Record<string, unknown> = { page, ...extra };
      if (search) params.search = search;
      for (const [key, value] of Object.entries(filters)) {
        if (value) params[key] = value;
      }
      return params;
    },
    [page, search, filters],
  );

  return {
    page,
    search,
    filters,
    setPage,
    setSearch,
    setFilter,
    resetFilters,
    hasActiveFilters,
    getApiParams,
  } as const;
}
