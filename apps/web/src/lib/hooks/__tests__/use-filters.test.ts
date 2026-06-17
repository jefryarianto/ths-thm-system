import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFilters } from '../use-filters';

describe('useFilters', () => {
  // ─── Basic State ───

  it('returns default initial state with no config', () => {
    const { result } = renderHook(() => useFilters());
    expect(result.current.page).toBe(1);
    expect(result.current.search).toBe('');
    expect(result.current.filters).toEqual({});
    expect(result.current.hasActiveFilters).toBe(false);
  });

  it('accepts initial search value', () => {
    const { result } = renderHook(() => useFilters({ initialSearch: 'hello' }));
    expect(result.current.search).toBe('hello');
    // hasActiveFilters is false because search matches initialSearch
    expect(result.current.hasActiveFilters).toBe(false);
  });

  it('accepts filter configurations', () => {
    const { result } = renderHook(() =>
      useFilters({
        filters: [
          { key: 'status', defaultValue: '' },
          { key: 'tipe', defaultValue: 'all' },
        ],
      }),
    );
    expect(result.current.filters).toEqual({ status: '', tipe: 'all' });
    // status has default '' (same as initial), tipe has default 'all' (non-empty)
    expect(result.current.hasActiveFilters).toBe(false);
  });

  // ─── Page Management ───

  it('resets page to 1 when search changes', () => {
    const { result } = renderHook(() => useFilters());
    act(() => result.current.setPage(5));
    expect(result.current.page).toBe(5);

    act(() => result.current.setSearch('new search'));
    // Page should reset to 1 when search changes (via useEffect)
    expect(result.current.page).toBe(1);
  });

  it('resets page to 1 when a filter changes', () => {
    const { result } = renderHook(() =>
      useFilters({
        filters: [{ key: 'status', defaultValue: '' }],
      }),
    );

    act(() => result.current.setPage(5));
    act(() => result.current.setFilter('status', 'active'));
    expect(result.current.page).toBe(1);
  });

  it('setPage sets the page directly', () => {
    const { result } = renderHook(() => useFilters());
    act(() => result.current.setPage(3));
    expect(result.current.page).toBe(3);
  });

  // ─── Search ───

  it('setSearch updates search value', () => {
    const { result } = renderHook(() => useFilters());
    act(() => result.current.setSearch('test query'));
    expect(result.current.search).toBe('test query');
  });

  // ─── Filters ───

  it('setFilter updates individual filter value', () => {
    const { result } = renderHook(() =>
      useFilters({
        filters: [
          { key: 'status', defaultValue: '' },
          { key: 'tipe', defaultValue: '' },
        ],
      }),
    );

    act(() => result.current.setFilter('status', 'active'));
    expect(result.current.filters.status).toBe('active');
    expect(result.current.filters.tipe).toBe(''); // unchanged
  });

  it('setFilter preserves other filter values', () => {
    const { result } = renderHook(() =>
      useFilters({
        filters: [
          { key: 'a', defaultValue: '' },
          { key: 'b', defaultValue: '' },
        ],
      }),
    );

    act(() => result.current.setFilter('a', 'val-a'));
    act(() => result.current.setFilter('b', 'val-b'));
    expect(result.current.filters).toEqual({ a: 'val-a', b: 'val-b' });
  });

  it('setFilter works with any string key', () => {
    const { result } = renderHook(() => useFilters());
    act(() => result.current.setFilter('customKey', 'customValue'));
    expect(result.current.filters.customKey).toBe('customValue');
  });

  // ─── Reset ───

  it('resetFilters clears all state', () => {
    const { result } = renderHook(() =>
      useFilters({
        initialSearch: 'initial',
        filters: [{ key: 'status', defaultValue: '' }],
      }),
    );

    act(() => result.current.setSearch('modified'));
    act(() => result.current.setFilter('status', 'active'));
    act(() => result.current.setPage(5));
    expect(result.current.hasActiveFilters).toBe(true);

    act(() => result.current.resetFilters());
    expect(result.current.page).toBe(1);
    expect(result.current.search).toBe('initial');
    expect(result.current.filters).toEqual({ status: '' });
    expect(result.current.hasActiveFilters).toBe(false);
  });

  it('resetFilters works with default empty initial state', () => {
    const { result } = renderHook(() => useFilters());
    act(() => result.current.setSearch('test'));
    act(() => result.current.setFilter('x', 'y'));
    act(() => result.current.resetFilters());
    expect(result.current.search).toBe('');
    expect(result.current.filters).toEqual({});
    expect(result.current.page).toBe(1);
  });

  // ─── hasActiveFilters ───

  it('hasActiveFilters is false when nothing is active', () => {
    const { result } = renderHook(() =>
      useFilters({
        filters: [{ key: 'status', defaultValue: '' }],
      }),
    );
    expect(result.current.hasActiveFilters).toBe(false);
  });

  it('hasActiveFilters is true when search is active', () => {
    const { result } = renderHook(() => useFilters());
    act(() => result.current.setSearch('something'));
    expect(result.current.hasActiveFilters).toBe(true);
  });

  it('hasActiveFilters is true when filter value differs from default', () => {
    const { result } = renderHook(() =>
      useFilters({
        filters: [{ key: 'status', defaultValue: '' }],
      }),
    );
    act(() => result.current.setFilter('status', 'active'));
    expect(result.current.hasActiveFilters).toBe(true);
  });

  it('hasActiveFilters is false when filter value matches default', () => {
    const { result } = renderHook(() =>
      useFilters({
        filters: [{ key: 'status', defaultValue: 'all' }],
      }),
    );
    // Default value is 'all', so setting it to 'all' is not active
    act(() => result.current.setFilter('status', ''));
    expect(result.current.hasActiveFilters).toBe(true);
  });

  // ─── getApiParams ───

  it('getApiParams returns page and no filters when empty', () => {
    const { result } = renderHook(() => useFilters());
    expect(result.current.getApiParams()).toEqual({ page: 1 });
  });

  it('getApiParams includes search when set', () => {
    const { result } = renderHook(() => useFilters());
    act(() => result.current.setSearch('query'));
    expect(result.current.getApiParams()).toEqual({ page: 1, search: 'query' });
  });

  it('getApiParams includes non-empty filter values', () => {
    const { result } = renderHook(() =>
      useFilters({
        filters: [
          { key: 'status', defaultValue: '' },
          { key: 'tipe', defaultValue: '' },
        ],
      }),
    );

    act(() => result.current.setFilter('status', 'active'));
    const params = result.current.getApiParams();
    expect(params.page).toBe(1);
    expect(params.status).toBe('active');
    expect(params.tipe).toBeUndefined(); // empty, so not included
  });

  it('getApiParams includes extra params', () => {
    const { result } = renderHook(() => useFilters());
    const params = result.current.getApiParams({ limit: 10 });
    expect(params.page).toBe(1);
    expect(params.limit).toBe(10);
  });

  it('getApiParams extra overrides page if provided', () => {
    const { result } = renderHook(() => useFilters());
    const params = result.current.getApiParams({ page: 5 });
    expect(params.page).toBe(5);
  });

  it('getApiParams reflects current page state', () => {
    const { result } = renderHook(() => useFilters());
    act(() => result.current.setPage(3));
    expect(result.current.getApiParams().page).toBe(3);
  });

  // ─── Edge Cases ───

  it('handles no options argument', () => {
    const { result } = renderHook(() => useFilters());
    expect(result.current.page).toBe(1);
    expect(result.current.search).toBe('');
    expect(result.current.filters).toEqual({});
  });

  it('handles empty filters array', () => {
    const { result } = renderHook(() => useFilters({ filters: [] }));
    expect(result.current.filters).toEqual({});
  });

  it('returns stable function references', () => {
    const { result, rerender: _rerender } = renderHook(() => useFilters());
    const firstSetPage = result.current.setPage;
    const firstReset = result.current.resetFilters;
    const firstGetParams = result.current.getApiParams;

    _rerender();

    expect(result.current.setPage).toBe(firstSetPage);
    expect(result.current.resetFilters).toBe(firstReset);
    expect(result.current.getApiParams).toBe(firstGetParams);
  });

  // ─── DebouncedSearch ───

  it('does NOT reset page on search change when debouncedSearch is provided', () => {
    const debouncedSearch = '';
    const { result } = renderHook(() => useFilters({ debouncedSearch }));

    act(() => result.current.setPage(5));
    act(() => result.current.setSearch('new value'));

    // Page should NOT reset because debouncedSearch is provided and hasn't changed
    expect(result.current.page).toBe(5);
  });

  it('resets page when debouncedSearch changes and is provided', () => {
    let debouncedSearch = '';
    const { result, rerender } = renderHook(
      ({ ds }: { ds: string }) => useFilters({ debouncedSearch: ds }),
      { initialProps: { ds: debouncedSearch } },
    );

    act(() => result.current.setPage(5));
    expect(result.current.page).toBe(5);

    // Simulate debouncedSearch changing (e.g., after debounce timeout)
    debouncedSearch = 'new value';
    rerender({ ds: debouncedSearch });

    expect(result.current.page).toBe(1);
  });

  it('resets page on search change when debouncedSearch is not provided', () => {
    const { result } = renderHook(() => useFilters());

    act(() => result.current.setPage(5));
    act(() => result.current.setSearch('new value'));

    expect(result.current.page).toBe(1);
  });

  it('resets page on debouncedSearch change even when search is unchanged', () => {
    const debouncedSearch = '';
    const { result, rerender } = renderHook(
      ({ ds }: { ds: string }) =>
        useFilters({
          initialSearch: 'initial',
          debouncedSearch: ds,
        }),
      { initialProps: { ds: debouncedSearch } },
    );

    expect(result.current.page).toBe(1);
    act(() => result.current.setPage(5));

    // debouncedSearch stays empty — page should stay 5
    rerender({ ds: '' });
    expect(result.current.page).toBe(5);

    // debouncedSearch changes — page resets to 1
    rerender({ ds: 'updated' });
    expect(result.current.page).toBe(1);
  });

  it('works with both debouncedSearch and filters simultaneously', () => {
    const debouncedSearch = '';
    const { result, rerender } = renderHook(
      ({ ds }: { ds: string }) =>
        useFilters({
          debouncedSearch: ds,
          filters: [{ key: 'status', defaultValue: '' }],
        }),
      { initialProps: { ds: debouncedSearch } },
    );

    act(() => result.current.setPage(10));
    act(() => result.current.setSearch('query'));
    // Page should NOT reset because debouncedSearch is provided
    expect(result.current.page).toBe(10);

    // Filter change should still reset page
    act(() => result.current.setFilter('status', 'active'));
    expect(result.current.page).toBe(1);
  });
});
