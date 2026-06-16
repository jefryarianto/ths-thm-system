import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useGamificationData } from '../use-gamification-data';

// Mock localStorage on window for jsdom environment
beforeAll(() => {
  if (typeof window !== 'undefined' && !window.localStorage) {
    Object.defineProperty(window, 'localStorage', {
      value: (() => {
        let store: Record<string, string> = {};
        return {
          getItem: (key: string) => store[key] ?? null,
          setItem: (key: string, value: string) => {
            store[key] = value;
          },
          removeItem: (key: string) => {
            delete store[key];
          },
          clear: () => {
            store = {};
          },
          get length() {
            return Object.keys(store).length;
          },
          key: (i: number) => Object.keys(store)[i] ?? null,
        };
      })(),
      writable: true,
    });
  }
});

// Use vi.hoisted so mockGet is available before vi.mock is hoisted
const mockGet = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/lib/api-client', () => {
  const unwrap = <T>(r: { data: { data: T } }): T => r.data.data;
  return {
    default: { get: mockGet },
    unwrap,
  };
});

const MOCK_LEADERBOARD = Array.from({ length: 10 }, (_, i) => ({
  rank: i + 1,
  anggotaId: `ang-${i + 1}`,
  namaLengkap: `Anggota ${i + 1}`,
  points: 1000 - i * 50,
  badges: 10 - i,
  streaks: { latihan: 20 - i, iuran: 15 - i },
}));

const MOCK_STATS = {
  totalMembers: 150,
  totalEvents: 45,
  totalPointsAwarded: 50000,
  badgesAwarded: 85,
};

const MOCK_EVENTS = Array.from({ length: 5 }, (_, i) => ({
  id: `evt-${i + 1}`,
  anggotaId: `ang-${i + 1}`,
  namaLengkap: `Anggota ${i + 1}`,
  type: ['training', 'dues', 'badge', 'achievement'][i % 4],
  points: 25 + i * 25,
  description: `Event ${i + 1}`,
  timestamp: new Date(2025, 0, 15 - i).toISOString(),
}));

function setupMocks() {
  mockGet.mockReset();
  mockGet.mockImplementation((url: string) => {
    if (url.startsWith('/gamification/leaderboard')) {
      return Promise.resolve({ data: { data: MOCK_LEADERBOARD } });
    }
    if (url === '/gamification/stats') {
      return Promise.resolve({ data: { data: MOCK_STATS } });
    }
    if (url === '/gamification/events?limit=10') {
      return Promise.resolve({ data: { data: MOCK_EVENTS } });
    }
    if (url === '/gamification/badges') {
      return Promise.resolve({ data: { data: [] } });
    }
    return Promise.reject(new Error(`Unknown URL: ${url}`));
  });
}

describe('useGamificationData', () => {
  beforeEach(() => {
    setupMocks();
    // Set a token in localStorage so the auth check passes
    window.localStorage.setItem('accessToken', 'fake-token');
  });

  it('starts in loading state', () => {
    mockGet.mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() =>
      useGamificationData({
        selectedDistrik: '',
        selectedWilayah: '',
        selectedRanting: '',
      }),
    );
    expect(result.current.loading).toBe(true);
  });

  it('fetches data and returns results', async () => {
    const { result } = renderHook(() =>
      useGamificationData({
        selectedDistrik: '',
        selectedWilayah: '',
        selectedRanting: '',
      }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.leaderboard).toEqual(MOCK_LEADERBOARD);
    expect(result.current.stats).toEqual(MOCK_STATS);
    expect(result.current.events).toEqual(MOCK_EVENTS);
    expect(result.current.error).toBeNull();
  });

  it('filters are passed to API calls', async () => {
    const { result } = renderHook(() =>
      useGamificationData({
        selectedDistrik: 'distrik-1',
        selectedWilayah: '',
        selectedRanting: '',
      }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    const leaderboardCalls: string[] = mockGet.mock.calls
      .filter(
        (call: unknown[]) =>
          typeof call[0] === 'string' &&
          (call[0] as string).startsWith('/gamification/leaderboard'),
      )
      .map((call: unknown[]) => call[0] as string);

    expect(leaderboardCalls.length).toBeGreaterThan(0);
    expect(leaderboardCalls[0]).toContain('distrikId=distrik-1');
  });

  it('narrower filter overrides broader', async () => {
    const { result } = renderHook(() =>
      useGamificationData({
        selectedDistrik: 'distrik-1',
        selectedWilayah: 'wilayah-1',
        selectedRanting: 'ranting-1',
      }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    const leaderboardCalls: string[] = mockGet.mock.calls
      .filter(
        (call: unknown[]) =>
          typeof call[0] === 'string' &&
          (call[0] as string).startsWith('/gamification/leaderboard'),
      )
      .map((call: unknown[]) => call[0] as string);

    const url = leaderboardCalls[0];
    expect(url).toContain('rantingId=ranting-1');
    expect(url).not.toContain('wilayahId=');
    expect(url).not.toContain('distrikId=');
  });

  it('handles API errors gracefully', async () => {
    mockGet.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() =>
      useGamificationData({
        selectedDistrik: '',
        selectedWilayah: '',
        selectedRanting: '',
      }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Gagal memuat data gamifikasi');
    expect(result.current.leaderboard).toEqual([]);
    expect(result.current.stats).toBeNull();
  });

  it('search query updates and triggers re-fetch', async () => {
    const { result } = renderHook(() =>
      useGamificationData({
        selectedDistrik: '',
        selectedWilayah: '',
        selectedRanting: '',
      }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.setSearchQuery('test');
    });
    expect(result.current.searchQuery).toBe('test');

    // Wait for debounce and re-fetch
    await waitFor(() => {
      const calls: string[] = mockGet.mock.calls
        .filter(
          (call: unknown[]) =>
            typeof call[0] === 'string' &&
            (call[0] as string).startsWith('/gamification/leaderboard'),
        )
        .map((call: unknown[]) => call[0] as string);
      return calls.some((url: string) => url.includes('search=test'));
    });
  });
});
