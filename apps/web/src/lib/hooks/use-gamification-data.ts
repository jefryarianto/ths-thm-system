'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import apiClient, { unwrap } from '@/lib/api-client';
import { useDebounce } from '@/lib/use-debounce';
import type {
  Badge,
  LeaderboardEntry,
  GamificationStats,
  PointEvent,
} from '@/app/(dashboard)/gamification/types';

interface UseGamificationDataOptions {
  selectedDistrik: string;
  selectedWilayah: string;
  selectedRanting: string;
}

interface UseGamificationDataReturn {
  badges: Badge[];
  leaderboard: LeaderboardEntry[];
  stats: GamificationStats | null;
  events: PointEvent[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  page: number;
  setPage: (value: number | ((prev: number) => number)) => void;
  hasMore: boolean;
  fetchData: (loadMore?: boolean) => Promise<void>;
}

export function useGamificationData({
  selectedDistrik,
  selectedWilayah,
  selectedRanting,
}: UseGamificationDataOptions): UseGamificationDataReturn {
  const router = useRouter();
  const [badges] = useState<Badge[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [stats, setStats] = useState<GamificationStats | null>(null);
  const [events, setEvents] = useState<PointEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [page, setPage] = useState(0);
  const pageSize = 10;
  const [hasMore, setHasMore] = useState(true);

  // Auth check on mount
  useEffect(() => {
    const token = typeof window !== 'undefined' ? window.localStorage.getItem('accessToken') : null;
    if (!token) {
      router.push('/login');
      return;
    }
  }, [router]);

  const fetchData = useCallback(
    async (loadMore: boolean = false) => {
      if (!loadMore) setLoading(true);
      try {
        const params = new URLSearchParams();
        if (selectedRanting) params.set('rantingId', selectedRanting);
        else if (selectedWilayah) params.set('wilayahId', selectedWilayah);
        else if (selectedDistrik) params.set('distrikId', selectedDistrik);
        if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
        params.set('limit', String(pageSize));
        if (loadMore) params.set('skip', String(page * pageSize));

        const [, leaderboardRes, statsRes, eventsRes] = await Promise.all([
          apiClient.get('/gamification/badges'),
          apiClient.get(`/gamification/leaderboard?${params.toString()}`),
          apiClient.get('/gamification/stats'),
          apiClient.get('/gamification/events?limit=10'),
        ]);
        const newData = unwrap<LeaderboardEntry[]>(leaderboardRes);
        if (loadMore) {
          setLeaderboard((prev) => [...prev, ...newData]);
        } else {
          setLeaderboard(newData);
        }
        setHasMore(newData.length >= pageSize);
        setStats(unwrap<GamificationStats>(statsRes));
        setEvents(unwrap<PointEvent[]>(eventsRes));
      } catch (err) {
        console.error('Failed to fetch gamification data:', err);
        setError('Gagal memuat data gamifikasi');
      } finally {
        setLoading(false);
      }
    },
    [selectedDistrik, selectedWilayah, selectedRanting, debouncedSearch, page, pageSize],
  );

  // Re-fetch when filter changes
  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, selectedDistrik, selectedWilayah, selectedRanting]);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? window.localStorage.getItem('accessToken') : null;
    if (token) fetchData();
  }, [selectedDistrik, selectedWilayah, selectedRanting, debouncedSearch, fetchData]);

  return {
    badges,
    leaderboard,
    stats,
    events,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    page,
    setPage,
    hasMore,
    fetchData,
  };
}
