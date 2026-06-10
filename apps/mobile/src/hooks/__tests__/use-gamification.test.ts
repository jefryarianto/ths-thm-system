import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock apiClient
jest.mock('../../lib/api-client', () => ({
  default: {
    get: jest.fn(),
  },
  unwrap: jest.fn((r: any) => r.data),
}));

import apiClient from '../../lib/api-client';
import { renderHook, waitFor } from '@testing-library/react-native';
import {
  useGamificationProfile,
  usePointsHistory,
  useBadges,
  useRecentEvents,
  useRewards,
  useOrgStructure,
  useLeaderboard,
} from '../use-gamification';

const mockApi = apiClient as jest.Mocked<typeof apiClient>;

const mockProfileResponse = {
  data: {
    data: {
      anggotaId: '1',
      namaLengkap: 'Test User',
      points: 500,
      level: { name: 'Gold', icon: '🥇', color: '#ffd700' },
      badges: [{ id: 'b1', name: 'Rajin', description: 'Rajin latihan', icon: '🏅', threshold: 10, category: 'latihan' }],
      streaks: { latihan: 3, iuran: 5 },
      lastActivity: '2026-05-01T00:00:00.000Z',
    },
  },
};

const mockPointsHistoryResponse = {
  data: {
    data: [
      { month: '2026-01', cumulative: 100 },
      { month: '2026-02', cumulative: 250 },
    ],
  },
};

const mockBadgesResponse = {
  data: {
    data: [
      { id: 'b1', name: 'Rajin', description: 'Rajin latihan', icon: '🏅', threshold: 10, category: 'latihan' },
      { id: 'b2', name: 'Teladan', description: 'Teladan iuran', icon: '⭐', threshold: 5, category: 'iuran' },
    ],
  },
};

const mockEventsResponse = {
  data: {
    data: [
      { id: 'e1', anggotaId: '1', type: 'training', points: 10, description: 'Hadir latihan', timestamp: '2026-05-01T10:00:00.000Z' },
    ],
  },
};

const mockRewardsResponse = {
  data: {
    data: [
      { id: 'r1', name: 'Pulsa 10K', description: 'Pulsa 10.000', icon: '📱', pointCost: 200, stock: 5, isActive: true },
    ],
  },
};

const mockOrgResponse = {
  data: {
    data: [
      { id: 'd1', nama: 'Distrik A', wilayahs: [{ id: 'w1', nama: 'Wilayah A', rantings: [{ id: 'ra1', nama: 'Ranting A' }] }] },
    ],
  },
};

const mockLeaderboardResponse = {
  data: {
    data: [
      { rank: 1, anggotaId: '1', namaLengkap: 'User 1', points: 500, badges: 3, streaks: { latihan: 10, iuran: 5 } },
      { rank: 2, anggotaId: '2', namaLengkap: 'User 2', points: 300, badges: 1, streaks: { latihan: 5, iuran: 3 } },
    ],
  },
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useGamificationProfile', () => {
  it('fetches profile when anggotaId is provided', async () => {
    mockApi.get.mockResolvedValueOnce(mockProfileResponse);

    const { result } = await renderHook(() => useGamificationProfile('1'));

    expect(mockApi.get).toHaveBeenCalledWith('/gamification/profile/1');

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data?.points).toBe(500);
    expect(result.current.data?.namaLengkap).toBe('Test User');
  });

  it('does not fetch when anggotaId is null', async () => {
    const { result } = await renderHook(() => useGamificationProfile(null));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockApi.get).toHaveBeenCalled();
  });
});

describe('usePointsHistory', () => {
  it('fetches points history', async () => {
    mockApi.get.mockResolvedValueOnce(mockPointsHistoryResponse);

    const { result } = await renderHook(() => usePointsHistory('1'));

    expect(mockApi.get).toHaveBeenCalledWith('/gamification/profile/1/points-history');

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toHaveLength(2);
    expect(result.current.data![0].month).toBe('2026-01');
  });
});

describe('useBadges', () => {
  it('fetches all badges', async () => {
    mockApi.get.mockResolvedValueOnce(mockBadgesResponse);

    const { result } = await renderHook(() => useBadges());

    expect(mockApi.get).toHaveBeenCalledWith('/gamification/badges');

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toHaveLength(2);
  });
});

describe('useRecentEvents', () => {
  it('fetches events with limit', async () => {
    mockApi.get.mockResolvedValueOnce(mockEventsResponse);

    const { result } = await renderHook(() => useRecentEvents(5));

    expect(mockApi.get).toHaveBeenCalledWith('/gamification/events?limit=5');

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toHaveLength(1);
  });
});

describe('useRewards', () => {
  it('fetches rewards', async () => {
    mockApi.get.mockResolvedValueOnce(mockRewardsResponse);

    const { result } = await renderHook(() => useRewards());

    expect(mockApi.get).toHaveBeenCalledWith('/gamification/rewards');

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0].name).toBe('Pulsa 10K');
  });
});

describe('useOrgStructure', () => {
  it('fetches org structure', async () => {
    mockApi.get.mockResolvedValueOnce(mockOrgResponse);

    const { result } = await renderHook(() => useOrgStructure());

    expect(mockApi.get).toHaveBeenCalledWith('/gamification/org-structure');

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0].nama).toBe('Distrik A');
  });
});

describe('useLeaderboard', () => {
  it('fetches leaderboard with filters', async () => {
    mockApi.get.mockResolvedValueOnce(mockLeaderboardResponse);

    const { result } = await renderHook(() => useLeaderboard({ limit: 10, search: 'test' }));

    expect(mockApi.get).toHaveBeenCalledWith(
      expect.stringContaining('/gamification/leaderboard?'),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toHaveLength(2);
    expect(result.current.data![0].rank).toBe(1);
  });

  it('passes filter params correctly', async () => {
    mockApi.get.mockResolvedValueOnce(mockLeaderboardResponse);

    await renderHook(() => useLeaderboard({
      limit: 10,
      rantingId: 'ra1',
      search: 'test',
    }));

    const callUrl = mockApi.get.mock.calls[0][0] as string;
    expect(callUrl).toContain('limit=10');
    expect(callUrl).toContain('rantingId=ra1');
    expect(callUrl).toContain('search=test');
  });
});
