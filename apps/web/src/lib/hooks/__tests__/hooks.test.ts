import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from '../use-debounce';
import { buildEmptyMessage } from '../use-api';

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
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'hello' } }
    );
    rerender({ value: 'world' });
    // Should still be 'hello' before timer fires
    expect(result.current).toBe('hello');
  });

  it('updates after delay', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'hello' } }
    );
    rerender({ value: 'world' });
    act(() => { vi.advanceTimersByTime(300); });
    expect(result.current).toBe('world');
  });

  it('cancels previous timeout on rapid changes', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'a' } }
    );
    rerender({ value: 'b' });
    act(() => { vi.advanceTimersByTime(100); });
    rerender({ value: 'c' });
    act(() => { vi.advanceTimersByTime(100); });
    // Should still be 'a' (original) since timer was cancelled twice
    expect(result.current).toBe('a');
    act(() => { vi.advanceTimersByTime(200); });
    // Now the latest timer (for 'c') should fire
    expect(result.current).toBe('c');
  });

  it('uses default delay of 300ms', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value),
      { initialProps: { value: 'a' } }
    );
    rerender({ value: 'b' });
    act(() => { vi.advanceTimersByTime(299); });
    expect(result.current).toBe('a');
    act(() => { vi.advanceTimersByTime(1); });
    expect(result.current).toBe('b');
  });

  it('handles number values', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 100),
      { initialProps: { value: 0 } }
    );
    rerender({ value: 42 });
    act(() => { vi.advanceTimersByTime(100); });
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
    const myReset = () => { /* custom reset */ };
    const result = buildEmptyMessage('test', true, myReset);
    expect(result.action?.onClick).toBe(myReset);
  });
});
