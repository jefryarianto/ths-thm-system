import { useCallback, useState } from 'react';
import apiClient from '../lib/api-client';
import { useApi } from './use-api';

// ─── Types ───

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  threshold: number;
  category: string;
}

export interface GamificationProfile {
  anggotaId: string;
  namaLengkap?: string;
  points: number;
  level?: { name: string; icon: string; color: string };
  badges: Badge[];
  streaks: { latihan: number; iuran: number };
  lastActivity: string;
}

export interface LeaderboardEntry {
  rank: number;
  anggotaId: string;
  namaLengkap?: string;
  points: number;
  badges: number;
  streaks: { latihan: number; iuran: number };
}

export interface Reward {
  id: string;
  name: string;
  description?: string;
  icon: string;
  pointCost: number;
  stock: number;
  isActive: boolean;
}

export interface OrgNode {
  id: string;
  nama: string;
  wilayahs?: OrgNode[];
  rantings?: { id: string; nama: string }[];
}

export interface PointEvent {
  id: string;
  anggotaId: string;
  namaLengkap?: string;
  type: string;
  points: number;
  description: string;
  timestamp: string;
}

export interface PointHistory {
  month: string;
  cumulative: number;
}

export interface LeaderboardFilters {
  limit?: number;
  skip?: number;
  search?: string;
  rantingId?: string;
  wilayahId?: string;
  distrikId?: string;
}

export interface GamificationData {
  profile: GamificationProfile | null;
  leaderboard: LeaderboardEntry[];
  allBadges: Badge[];
  pointsHistory: PointHistory[];
  recentEvents: PointEvent[];
  rewards: Reward[];
  orgTree: OrgNode[];
}

// ─── Hooks ───

/**
 * Fetch gamification profile for a member.
 */
export function useGamificationProfile(anggotaId: string | null) {
  return useApi<GamificationProfile>(
    () => apiClient.get(`/gamification/profile/${anggotaId}`).then(r => r.data.data),
    [anggotaId],
  );
}

/**
 * Fetch points history for a member.
 */
export function usePointsHistory(anggotaId: string | null) {
  return useApi<PointHistory[]>(
    () => apiClient.get(`/gamification/profile/${anggotaId}/points-history`).then(r => r.data.data || []),
    [anggotaId],
  );
}

/**
 * Fetch all available badges.
 */
export function useBadges() {
  return useApi<Badge[]>(
    () => apiClient.get('/gamification/badges').then(r => r.data.data),
    [],
  );
}

/**
 * Fetch leaderboard with filters, search, and pagination.
 */
export function useLeaderboard(filters: LeaderboardFilters) {
  const queryKey = JSON.stringify(filters);
  return useApi<LeaderboardEntry[]>(
    () => {
      const params = new URLSearchParams();
      if (filters.limit) params.set('limit', String(filters.limit));
      if (filters.skip) params.set('skip', String(filters.skip));
      if (filters.search) params.set('search', filters.search);
      if (filters.rantingId) params.set('rantingId', filters.rantingId);
      if (filters.wilayahId) params.set('wilayahId', filters.wilayahId);
      if (filters.distrikId) params.set('distrikId', filters.distrikId);
      return apiClient.get(`/gamification/leaderboard?${params.toString()}`).then(r => r.data.data);
    },
    [queryKey],
  );
}

/**
 * Fetch recent point events.
 */
export function useRecentEvents(limit = 10) {
  return useApi<PointEvent[]>(
    () => apiClient.get(`/gamification/events?limit=${limit}`).then(r => r.data.data),
    [],
  );
}

/**
 * Fetch available rewards.
 */
export function useRewards() {
  return useApi<Reward[]>(
    () => apiClient.get('/gamification/rewards').then(r => r.data.data),
    [],
  );
}

/**
 * Fetch organizational structure for filter dropdowns.
 */
export function useOrgStructure() {
  return useApi<OrgNode[]>(
    () => apiClient.get('/gamification/org-structure').then(r => r.data.data),
    [],
  );
}

/**
 * Combined hook to fetch all gamification data in parallel.
 * Returns individual refetch functions for each data source.
 */
export function useGamificationData(anggotaId: string | null) {
  const profile = useGamificationProfile(anggotaId);
  const pointsHistory = usePointsHistory(anggotaId);
  const badges = useBadges();
  const events = useRecentEvents(10);
  const rewards = useRewards();
  const orgStructure = useOrgStructure();

  const refetchAll = useCallback(() => {
    profile.refetch();
    pointsHistory.refetch();
    badges.refetch();
    events.refetch();
    rewards.refetch();
    orgStructure.refetch();
  }, []);

  const loading = profile.loading || badges.loading || events.loading;
  const error = profile.error || badges.error || events.error;

  return {
    profile: profile.data,
    leaderboard: [] as LeaderboardEntry[], // Use separate hook for leaderboard
    allBadges: badges.data || [],
    pointsHistory: pointsHistory.data || [],
    recentEvents: events.data || [],
    rewards: rewards.data || [],
    orgTree: orgStructure.data || [],
    loading,
    error,
    refetchAll,
    refetchProfile: profile.refetch,
    refetchPointsHistory: pointsHistory.refetch,
    refetchBadges: badges.refetch,
    refetchEvents: events.refetch,
    refetchRewards: rewards.refetch,
    refetchOrgTree: orgStructure.refetch,
  };
}
