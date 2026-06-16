import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// Mock apiClient before importing the hook
vi.mock('@/lib/api-client', () => {
  const mockGet = vi.fn();
  return {
    default: { get: mockGet },
    unwrap: <T>(r: { data: { data: T } }): T => r.data.data,
  };
});

import { useOrgFilter } from '../use-org-filter';
import apiClient from '@/lib/api-client';

const mockApi = vi.mocked(apiClient.get);

const MOCK_ORG_TREE = [
  {
    id: 'distrik-1',
    nama: 'Distrik Jakarta',
    wilayahs: [
      {
        id: 'wilayah-1',
        nama: 'Wilayah Jakarta Pusat',
        rantings: [
          { id: 'ranting-1', nama: 'Ranting Menteng' },
          { id: 'ranting-2', nama: 'Ranting Tanah Abang' },
        ],
      },
      {
        id: 'wilayah-2',
        nama: 'Wilayah Jakarta Selatan',
        rantings: [{ id: 'ranting-3', nama: 'Ranting Kebayoran' }],
      },
    ],
  },
  {
    id: 'distrik-2',
    nama: 'Distrik Bandung',
    wilayahs: [],
  },
];

describe('useOrgFilter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.mockResolvedValue({
      data: { data: MOCK_ORG_TREE },
    });
  });

  // ─── Initial State ───

  it('starts with no filters active and empty tree while loading', () => {
    // Don't resolve the API call for this test
    mockApi.mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useOrgFilter());

    expect(result.current.distrikId).toBe('');
    expect(result.current.wilayahId).toBe('');
    expect(result.current.rantingId).toBe('');
    expect(result.current.isActive).toBe(false);
    expect(result.current.orgTree).toEqual([]);
    expect(result.current.loading).toBe(true);
    expect(result.current.availableWilayahs).toEqual([]);
    expect(result.current.availableRantings).toEqual([]);
  });

  it('loads org tree on mount', async () => {
    const { result } = renderHook(() => useOrgFilter());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockApi).toHaveBeenCalledWith('/gamification/org-structure');
    expect(result.current.orgTree).toHaveLength(2);
    expect(result.current.orgTree[0].nama).toBe('Distrik Jakarta');
  });

  it('handles API failure gracefully', async () => {
    mockApi.mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useOrgFilter());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.orgTree).toEqual([]);
    expect(result.current.isActive).toBe(false);
  });

  // ─── Distrik Selection ───

  it('selecting a distrik sets distrikId and clears lower filters', async () => {
    const { result } = renderHook(() => useOrgFilter());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setWilayah('some-wilayah'));
    act(() => result.current.setRanting('some-ranting'));

    act(() => result.current.setDistrik('distrik-1'));

    expect(result.current.distrikId).toBe('distrik-1');
    expect(result.current.wilayahId).toBe(''); // cleared
    expect(result.current.rantingId).toBe(''); // cleared
    expect(result.current.isActive).toBe(true);
  });

  it('provides correct available wilayahs after selecting distrik', async () => {
    const { result } = renderHook(() => useOrgFilter());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setDistrik('distrik-1'));

    expect(result.current.availableWilayahs).toHaveLength(2);
    expect(result.current.availableWilayahs[0].nama).toBe('Wilayah Jakarta Pusat');
    expect(result.current.availableWilayahs[1].nama).toBe('Wilayah Jakarta Selatan');
  });

  it('returns empty available wilayahs for distrik with no wilayahs', async () => {
    const { result } = renderHook(() => useOrgFilter());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setDistrik('distrik-2'));

    expect(result.current.availableWilayahs).toEqual([]);
  });

  it('returns empty available wilayahs when no distrik selected', async () => {
    const { result } = renderHook(() => useOrgFilter());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.availableWilayahs).toEqual([]);
  });

  // ─── Wilayah Selection ───

  it('selecting a wilayah sets wilayahId and clears ranting', async () => {
    const { result } = renderHook(() => useOrgFilter());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setDistrik('distrik-1'));
    act(() => result.current.setRanting('some-ranting'));

    act(() => result.current.setWilayah('wilayah-1'));

    expect(result.current.wilayahId).toBe('wilayah-1');
    expect(result.current.rantingId).toBe(''); // cleared
    expect(result.current.isActive).toBe(true);
  });

  it('provides correct available rantings after selecting wilayah', async () => {
    const { result } = renderHook(() => useOrgFilter());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setDistrik('distrik-1'));
    act(() => result.current.setWilayah('wilayah-1'));

    expect(result.current.availableRantings).toHaveLength(2);
    expect(result.current.availableRantings[0].nama).toBe('Ranting Menteng');
    expect(result.current.availableRantings[1].nama).toBe('Ranting Tanah Abang');
  });

  it('returns empty available rantings when no wilayah selected', async () => {
    const { result } = renderHook(() => useOrgFilter());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.availableRantings).toEqual([]);
  });

  it('updates available rantings when wilayah changes', async () => {
    const { result } = renderHook(() => useOrgFilter());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setDistrik('distrik-1'));
    act(() => result.current.setWilayah('wilayah-1'));
    expect(result.current.availableRantings).toHaveLength(2);

    act(() => result.current.setWilayah('wilayah-2'));
    expect(result.current.availableRantings).toHaveLength(1);
    expect(result.current.availableRantings[0].nama).toBe('Ranting Kebayoran');
  });

  // ─── Ranting Selection ───

  it('selecting a ranting sets rantingId', async () => {
    const { result } = renderHook(() => useOrgFilter());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setDistrik('distrik-1'));
    act(() => result.current.setWilayah('wilayah-1'));
    act(() => result.current.setRanting('ranting-1'));

    expect(result.current.rantingId).toBe('ranting-1');
    expect(result.current.isActive).toBe(true);
  });

  // ─── Clear Filters ───

  it('clearFilters resets all filter state', async () => {
    const { result } = renderHook(() => useOrgFilter());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setDistrik('distrik-1'));
    act(() => result.current.setWilayah('wilayah-1'));
    act(() => result.current.setRanting('ranting-1'));

    expect(result.current.isActive).toBe(true);

    act(() => result.current.clearFilters());

    expect(result.current.distrikId).toBe('');
    expect(result.current.wilayahId).toBe('');
    expect(result.current.rantingId).toBe('');
    expect(result.current.isActive).toBe(false);
  });

  // ─── Edge Cases ───

  it('isActive is false when no filters are set', async () => {
    const { result } = renderHook(() => useOrgFilter());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.isActive).toBe(false);
  });

  it('isActive is true when any single filter is set', async () => {
    const { result } = renderHook(() => useOrgFilter());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setDistrik('distrik-1'));
    expect(result.current.isActive).toBe(true);
  });
});
