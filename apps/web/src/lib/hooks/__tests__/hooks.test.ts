import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useDebounce } from '../use-debounce';
import { useApi, usePaginatedList, buildEmptyMessage } from '../use-api';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('hello', 300));
    expect(result.current).toBe('hello');
  });

  it('does not update before delay', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: 'hello' },
    });
    rerender({ value: 'world' });
    // Should still be 'hello' before timer fires
    expect(result.current).toBe('hello');
  });

  it('updates after delay', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: 'hello' },
    });
    rerender({ value: 'world' });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe('world');
  });

  it('cancels previous timeout on rapid changes', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: 'a' },
    });
    rerender({ value: 'b' });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    rerender({ value: 'c' });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    // Should still be 'a' (original) since timer was cancelled twice
    expect(result.current).toBe('a');
    act(() => {
      vi.advanceTimersByTime(200);
    });
    // Now the latest timer (for 'c') should fire
    expect(result.current).toBe('c');
  });

  it('uses default delay of 300ms', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value), {
      initialProps: { value: 'a' },
    });
    rerender({ value: 'b' });
    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(result.current).toBe('a');
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe('b');
  });

  it('handles number values', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 100), {
      initialProps: { value: 0 },
    });
    rerender({ value: 42 });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe(42);
  });
});

describe('buildEmptyMessage', () => {
  const onReset = () => {};

  it('returns filter message with action when hasActiveFilters is true', () => {
    const result = buildEmptyMessage('user', true, onReset);
    expect(result).toEqual({
      message: 'Tidak ada user yang cocok dengan filter',
      action: { label: 'Reset filter', onClick: onReset },
    });
  });

  it('returns empty message without action when hasActiveFilters is false', () => {
    const result = buildEmptyMessage('user', false, onReset);
    expect(result).toEqual({
      message: 'Belum ada user',
    });
    expect(result.action).toBeUndefined();
  });

  it('interpolates item name correctly', () => {
    const result = buildEmptyMessage('data pembayaran', true, onReset);
    expect(result.message).toBe('Tidak ada data pembayaran yang cocok dengan filter');
  });

  it('interpolates item name for empty state', () => {
    const result = buildEmptyMessage('aspek penilaian', false, onReset);
    expect(result.message).toBe('Belum ada aspek penilaian');
  });

  it('passes the onReset callback in the action', () => {
    const myReset = () => {
      /* custom reset */
    };
    const result = buildEmptyMessage('test', true, myReset);
    expect(result.action?.onClick).toBe(myReset);
  });
});

describe('useApi', () => {
  it('fetches on mount when enabled is true (default)', async () => {
    const fetcher = vi.fn().mockResolvedValue('data');
    const { result } = renderHook(() => useApi(fetcher, []));
    expect(result.current.loading).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBe('data');
  });

  it('does NOT fetch on mount when enabled is false', () => {
    const fetcher = vi.fn().mockResolvedValue('data');
    const { result } = renderHook(() => useApi(fetcher, [], false));
    expect(fetcher).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();
  });

  it('fetches when enabled changes from false to true', async () => {
    const fetcher = vi.fn().mockResolvedValue('data');
    const { result, rerender } = renderHook(({ enabled }) => useApi(fetcher, [], enabled), {
      initialProps: { enabled: false },
    });
    expect(fetcher).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);

    rerender({ enabled: true });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBe('data');
  });

  it('stops loading when enabled changes from true to false', () => {
    const fetcher = vi.fn().mockResolvedValue('data');
    const { result, rerender } = renderHook(({ enabled }) => useApi(fetcher, [], enabled), {
      initialProps: { enabled: true },
    });
    // Should have started fetching
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result.current.loading).toBe(true);

    // Disable - should set loading to false
    rerender({ enabled: false });
    expect(result.current.loading).toBe(false);
    // Fetcher shouldn't be called again
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('refetch works regardless of enabled state', async () => {
    const fetcher = vi.fn().mockResolvedValue('data');
    const { result } = renderHook(() => useApi(fetcher, [], false));
    expect(fetcher).not.toHaveBeenCalled();

    await act(async () => {
      result.current.refetch();
    });
    expect(fetcher).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.data).toBe('data');
    });
  });

  it('handles permanent (4xx) errors immediately', async () => {
    const err = new Error('Network error') as Error & { status?: number };
    err.status = 400; // 4xx bukan transient -> tidak retry, error tampil langsung
    const fetcher = vi.fn().mockRejectedValue(err);
    const { result } = renderHook(() => useApi(fetcher, []));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Network error');
    expect(result.current.data).toBeNull();
  });

  it('retries transient (network) errors silently then surfaces error after retries exhausted', async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn().mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useApi(fetcher, []));
    // Transient -> retry senyap dulu, error belum tampil agar data lama tetap terlihat
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBeNull();

    // Auto-retry bertahap (2000, 4000, 8000ms) lalu error muncul setelah upaya habis
    await act(async () => {
      await Promise.resolve(); // flush rejection -> jadwalkan retry pertama
      vi.advanceTimersByTime(2000);
      await Promise.resolve(); // retry1 -> jadwalkan retry berikutnya
      vi.advanceTimersByTime(4000);
      await Promise.resolve(); // retry2 -> jadwalkan retry berikutnya
      vi.advanceTimersByTime(8000);
      await Promise.resolve(); // retry3 -> error permanen
    });
    expect(fetcher).toHaveBeenCalledTimes(4); // 1 initial + 3 retry
    expect(result.current.error).toBe('Network error');
    expect(result.current.data).toBeNull();
    vi.useRealTimers();
  });
});

describe('usePaginatedList', () => {
  it('fetches on mount when enabled is true (default)', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      data: [{ id: '1', name: 'Item 1' }],
      meta: { total: 1, totalPages: 1 },
    });
    const { result } = renderHook(() => usePaginatedList(fetcher, []));
    expect(result.current.loading).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual([{ id: '1', name: 'Item 1' }]);
    expect(result.current.meta.total).toBe(1);
    expect(result.current.meta.totalPages).toBe(1);
  });

  it('does NOT fetch on mount when enabled is false', () => {
    const fetcher = vi.fn().mockResolvedValue({
      data: [{ id: '1' }],
      meta: { total: 1, totalPages: 1 },
    });
    const { result } = renderHook(() => usePaginatedList(fetcher, [], false));
    expect(fetcher).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toEqual([]);
  });

  it('fetches when enabled changes from false to true', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      data: [{ id: '1' }],
      meta: { total: 1, totalPages: 1 },
    });
    const { result, rerender } = renderHook(
      ({ enabled }) => usePaginatedList(fetcher, [], enabled),
      { initialProps: { enabled: false } },
    );
    expect(fetcher).not.toHaveBeenCalled();

    rerender({ enabled: true });
    expect(fetcher).toHaveBeenCalledTimes(1);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual([{ id: '1' }]);
  });

  it('stops loading when enabled changes from true to false', () => {
    const fetcher = vi.fn().mockResolvedValue({
      data: [{ id: '1' }],
      meta: { total: 1, totalPages: 1 },
    });
    const { result, rerender } = renderHook(
      ({ enabled }) => usePaginatedList(fetcher, [], enabled),
      { initialProps: { enabled: true } },
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result.current.loading).toBe(true);

    rerender({ enabled: false });
    expect(result.current.loading).toBe(false);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('refetch works regardless of enabled state', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      data: [{ id: '1' }],
      meta: { total: 1, totalPages: 1 },
    });
    const { result } = renderHook(() => usePaginatedList(fetcher, [], false));
    expect(fetcher).not.toHaveBeenCalled();

    await act(async () => {
      result.current.refetch();
    });
    expect(fetcher).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.data).toEqual([{ id: '1' }]);
    });
  });

  it('handles permanent (4xx) errors by setting empty data', async () => {
    const err = new Error('Network error') as Error & { status?: number };
    err.status = 400; // 4xx bukan transient -> tidak retry, error tampil langsung
    const fetcher = vi.fn().mockRejectedValue(err);
    const { result } = renderHook(() => usePaginatedList(fetcher, []));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Gagal memuat data');
    expect(result.current.data).toEqual([]);
    expect(result.current.meta.total).toBe(0);
  });

  it('retries transient (network) errors silently then surfaces error after retries exhausted', async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn().mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => usePaginatedList(fetcher, []));
    // Transient -> retry senyap dulu, error belum tampil agar data lama tetap terlihat
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBeNull();

    await act(async () => {
      await Promise.resolve(); // flush rejection -> jadwalkan retry pertama
      vi.advanceTimersByTime(2000);
      await Promise.resolve(); // retry1 -> jadwalkan retry berikutnya
      vi.advanceTimersByTime(4000);
      await Promise.resolve(); // retry2 -> jadwalkan retry berikutnya
      vi.advanceTimersByTime(8000);
      await Promise.resolve(); // retry3 -> error permanen
    });
    expect(fetcher).toHaveBeenCalledTimes(4); // 1 initial + 3 retry
    expect(result.current.error).toBe('Gagal memuat data');
    expect(result.current.data).toEqual([]);
    expect(result.current.meta.total).toBe(0);
    vi.useRealTimers();
  });
});
