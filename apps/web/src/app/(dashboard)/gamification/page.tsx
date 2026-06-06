'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import { useDebounce } from '@/lib/use-debounce';
import {
  Trophy, Award, TrendingUp, Medal, Star, Zap,
  AlertCircle, Users, Target, Flame, Activity,
  ArrowRight, Filter, X, Share2, Search, Download,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, Legend, Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  threshold: number;
  category: string;
}

interface LeaderboardEntry {
  rank: number;
  anggotaId: string;
  namaLengkap?: string;
  points: number;
  badges: number;
  streaks: { latihan: number; iuran: number };
}

interface GamificationStats {
  totalMembers: number;
  totalEvents: number;
  totalPointsAwarded: number;
  badgesAwarded: number;
}

interface OrgNode {
  id: string;
  nama: string;
  wilayahs?: OrgNode[];
  rantings?: { id: string; nama: string }[];
}

interface PointEvent {
  id: string;
  anggotaId: string;
  namaLengkap?: string;
  type: string;
  points: number;
  description: string;
  timestamp: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  latihan: '#3b82f6',
  iuran: '#22c55e',
  prestasi: '#a855f7',
  keaktifan: '#f59e0b',
};

const CATEGORY_LABELS: Record<string, string> = {
  latihan: 'Latihan',
  iuran: 'Iuran',
  prestasi: 'Prestasi',
  keaktifan: 'Keaktifan',
};

const statConfigs = [
  { key: 'totalMembers', label: 'Peserta Aktif', icon: Users, color: 'blue' as const },
  { key: 'totalPointsAwarded', label: 'Total Poin', icon: Zap, color: 'yellow' as const },
  { key: 'badgesAwarded', label: 'Badge Diraih', icon: Award, color: 'green' as const },
  { key: 'totalEvents', label: 'Total Aktivitas', icon: Target, color: 'purple' as const },
];

const colorMap = {
  blue: { bg: 'bg-blue-50', icon: 'text-blue-600', ring: 'ring-blue-100' },
  green: { bg: 'bg-green-50', icon: 'text-green-600', ring: 'ring-green-100' },
  yellow: { bg: 'bg-yellow-50', icon: 'text-yellow-600', ring: 'ring-yellow-100' },
  red: { bg: 'bg-red-50', icon: 'text-red-600', ring: 'ring-red-100' },
  purple: { bg: 'bg-purple-50', icon: 'text-purple-600', ring: 'ring-purple-100' },
};

const RANK_ICONS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

const EVENT_ICONS: Record<string, string> = {
  training: '🥋',
  dues: '💰',
  badge: '🏅',
  achievement: '🎯',
};

export default function GamificationPage() {
  const router = useRouter();
  const [badges, setBadges] = useState<Badge[]>([]);
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

  // Filter state
  const [orgTree, setOrgTree] = useState<OrgNode[]>([]);
  const [selectedDistrik, setSelectedDistrik] = useState('');
  const [selectedWilayah, setSelectedWilayah] = useState('');
  const [selectedRanting, setSelectedRanting] = useState('');
  const [filterActive, setFilterActive] = useState(false);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) {
      router.push('/login');
      return;
    }
    fetchData();
    fetchOrgStructure();
  }, []);

  const fetchData = useCallback(async (loadMore: boolean = false) => {
    if (!loadMore) setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedRanting) params.set('rantingId', selectedRanting);
      else if (selectedWilayah) params.set('wilayahId', selectedWilayah);
      else if (selectedDistrik) params.set('distrikId', selectedDistrik);
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
      params.set('limit', String(pageSize));
      if (loadMore) params.set('skip', String(page * pageSize));

      const [badgesRes, leaderboardRes, statsRes, eventsRes] = await Promise.all([
        apiClient.get('/gamification/badges'),
        apiClient.get(`/gamification/leaderboard?${params.toString()}`),
        apiClient.get('/gamification/stats'),
        apiClient.get('/gamification/events?limit=10'),
      ]);
      const newData = leaderboardRes.data.data;
      if (loadMore) {
        setLeaderboard((prev) => [...prev, ...newData]);
      } else {
        setLeaderboard(newData);
      }
      setHasMore(newData.length >= pageSize);
      setStats(statsRes.data.data);
      setEvents(eventsRes.data.data);
    } catch (err) {
      console.error('Failed to fetch gamification data:', err);
      setError('Gagal memuat data gamifikasi');
    } finally {
      setLoading(false);
    }
  }, [selectedDistrik, selectedWilayah, selectedRanting, debouncedSearch, page]);

  const fetchOrgStructure = async () => {
    try {
      const res = await apiClient.get('/gamification/org-structure');
      setOrgTree(res.data.data || []);
    } catch { /* ignore */ }
  };

  // Re-fetch when filter changes
  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, selectedDistrik, selectedWilayah, selectedRanting]);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (token) fetchData();
  }, [selectedDistrik, selectedWilayah, selectedRanting, debouncedSearch]);

  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'baru saja';
    if (mins < 60) return `${mins}m lalu`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}j lalu`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}h lalu`;
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          <p className="text-sm text-gray-500">Memuat data gamifikasi...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-3" />
          <p className="text-red-600 font-medium">{error}</p>
          <p className="text-sm text-gray-500 mt-1">Periksa koneksi ke server API</p>
        </div>
      </div>
    );
  }

  // Derived filter options
  const availableWilayahs = selectedDistrik
    ? orgTree.find((d) => d.id === selectedDistrik)?.wilayahs || []
    : [];
  const availableRantings = selectedWilayah
    ? availableWilayahs.find((w) => w.id === selectedWilayah)?.rantings || []
    : [];

  const clearFilter = () => {
    setSelectedDistrik('');
    setSelectedWilayah('');
    setSelectedRanting('');
  };

  // Badge distribution by category for pie chart
  const categoryData = badges.reduce((acc, b) => {
    acc[b.category] = (acc[b.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(categoryData).map(([cat, count]) => ({
    name: CATEGORY_LABELS[cat] || cat,
    value: count,
    color: CATEGORY_COLORS[cat] || '#6b7280',
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gamifikasi</h1>
          <p className="text-sm text-gray-500 mt-1">Poin, badge, dan leaderboard anggota</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Trophy size={16} className="text-yellow-500" />
          <span>Gamification System</span>
          <button
            onClick={async () => {
              const text = `🏆 THS-THM Leaderboard 🏆\n\n${leaderboard.slice(0, 5).map((e, i) => `${RANK_ICONS[e.rank] || `#${e.rank}`} ${e.namaLengkap || 'Member'} — ${e.points.toLocaleString('id-ID')} pts`).join('\n')}\n\nLihat selengkapnya di: ${window.location.origin}/public/leaderboard`;
              if (navigator.share) {
                await navigator.share({ title: 'THS-THM Leaderboard', text });
              } else {
                await navigator.clipboard.writeText(text);
                alert('Leaderboard disalin ke clipboard!');
              }
            }}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-md transition"
            title="Bagikan leaderboard"
          >
            <Share2 size={12} />
            Bagikan
          </button>
          <button
            onClick={() => {
              const csv = [
                'Rank,Nama,Poin,Badge,Streak Latihan,Streak Iuran',
                ...leaderboard.map((e) => `${e.rank},"${e.namaLengkap || ''}",${e.points},${e.badges},${e.streaks.latihan},${e.streaks.iuran}`),
              ].join('\n');
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `leaderboard-${new Date().toISOString().slice(0, 10)}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-green-50 hover:bg-green-100 rounded-md transition text-green-700"
            title="Export CSV leaderboard"
          >
            <Download size={12} />
            CSV
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 hover:bg-blue-100 rounded-md transition text-blue-700"
            title="Print leaderboard"
          >
            <Download size={12} />
            Print
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Filter size={16} className="text-gray-400" />
          <span className="text-xs font-medium text-gray-500 uppercase">Filter</span>

          {/* Distrik */}
          <select
            value={selectedDistrik}
            onChange={(e) => {
              setSelectedDistrik(e.target.value);
              setSelectedWilayah('');
              setSelectedRanting('');
              setFilterActive(!!e.target.value);
            }}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Semua Distrik</option>
            {orgTree.map((d) => (
              <option key={d.id} value={d.id}>{d.nama}</option>
            ))}
          </select>

          {/* Wilayah */}
          <select
            value={selectedWilayah}
            onChange={(e) => {
              setSelectedWilayah(e.target.value);
              setSelectedRanting('');
              setFilterActive(!!e.target.value || !!selectedDistrik);
            }}
            disabled={!selectedDistrik}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">Semua Wilayah</option>
            {availableWilayahs.map((w: any) => (
              <option key={w.id} value={w.id}>{w.nama}</option>
            ))}
          </select>

          {/* Ranting */}
          <select
            value={selectedRanting}
            onChange={(e) => {
              setSelectedRanting(e.target.value);
              setFilterActive(!!e.target.value || !!selectedWilayah || !!selectedDistrik);
            }}
            disabled={!selectedWilayah}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">Semua Ranting</option>
            {availableRantings.map((r: any) => (
              <option key={r.id} value={r.id}>{r.nama}</option>
            ))}
          </select>

          {filterActive && (
            <button
              onClick={clearFilter}
              className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 ml-auto"
            >
              <X size={14} />
              Hapus filter
            </button>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statConfigs.map(({ key, label, icon: Icon, color }) => {
            const styles = colorMap[color];
            const value = (stats as any)[key] ?? 0;
            return (
              <div
                key={key}
                className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow duration-200"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">{label}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {value.toLocaleString('id-ID')}
                    </p>
                  </div>
                  <div className={`p-3 rounded-xl ring-1 ${styles.ring} ${styles.bg}`}>
                    <Icon size={22} className={styles.icon} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Leaderboard + Badge Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leaderboard */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Medal size={20} className="text-yellow-500" />
              <h3 className="text-base font-semibold text-gray-900">Leaderboard</h3>
            </div>
            <span className="text-xs text-gray-400">Klik nama untuk detail</span>
          </div>
          {/* Search Bar */}
          <div className="relative mb-4">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Cari anggota..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={14} />
              </button>
            )}
          </div>
          {leaderboard.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">Rank</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">Anggota</th>
                      <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 uppercase">Poin</th>
                      <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 uppercase">Badge</th>
                      <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 uppercase">Latihan</th>
                      <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 uppercase">Iuran</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {leaderboard.map((entry) => (
                      <tr
                        key={entry.anggotaId}
                        className={`hover:bg-blue-50 transition cursor-pointer ${entry.rank <= 3 ? 'bg-yellow-50/30' : ''}`}
                        onClick={() => router.push(`/gamification/${entry.anggotaId}`)}
                      >
                        <td className="px-3 py-3">
                          <span className="text-lg">{RANK_ICONS[entry.rank] || entry.rank}</span>
                        </td>
                        <td className="px-3 py-3">
                          <span className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors">
                            {entry.namaLengkap || entry.anggotaId}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">
                            <Zap size={12} />
                            {entry.points.toLocaleString('id-ID')}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <span className="text-sm text-gray-600">{entry.badges}</span>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <span className="inline-flex items-center gap-1 text-sm text-blue-600">
                            <Flame size={12} />
                            {entry.streaks.latihan}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <span className="inline-flex items-center gap-1 text-sm text-green-600">
                            <Star size={12} />
                            {entry.streaks.iuran}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {hasMore && (
                <div className="text-center mt-4">
                  <button
                    onClick={() => {
                      setPage((p) => p + 1);
                      fetchData(true);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                  >
                    <ArrowRight size={14} />
                    Muat Lainnya
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
              Belum ada data leaderboard
            </div>
          )}
        </div>

        {/* Badge Distribution Pie Chart */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-gray-900">Distribusi Badge</h3>
            <p className="text-xs text-gray-500 mt-0.5">Berdasarkan kategori</p>
          </div>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="45%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} stroke="white" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [value.toLocaleString('id-ID'), 'Badge']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => <span className="text-xs text-gray-600">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
              Belum ada badge
            </div>
          )}
        </div>
      </div>

      {/* Recent Events + Badges Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Recent Events Feed */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity size={20} className="text-blue-500" />
              <h3 className="text-base font-semibold text-gray-900">Aktivitas Terbaru</h3>
            </div>
            <Link
              href="/gamification"
              className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
            >
              Lihat semua <ArrowRight size={12} />
            </Link>
          </div>
          {events.length > 0 ? (
            <div className="space-y-0">
              {events.map((event, idx) => (
                <div key={event.id} className="flex gap-3 relative">
                  {idx < events.length - 1 && (
                    <div className="absolute left-[13px] top-8 bottom-0 w-0.5 bg-gray-100" />
                  )}
                  <div className="relative z-10 flex-shrink-0 w-7 h-7 rounded-full bg-gray-50 flex items-center justify-center">
                    <span className="text-xs">{EVENT_ICONS[event.type] || '📌'}</span>
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm text-gray-900 truncate">
                          <span className="font-medium">{event.namaLengkap || event.anggotaId.slice(0, 8)}</span>
                        </p>
                        <p className="text-xs text-gray-500 truncate">{event.description}</p>
                      </div>
                      <span className="flex-shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-[10px] font-semibold">
                        <Zap size={8} />+{event.points}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5">{getTimeAgo(event.timestamp)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
              Belum ada aktivitas
            </div>
          )}
        </div>

        {/* All Badges Grid */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-gray-900">Semua Badge</h3>
            <p className="text-xs text-gray-500 mt-0.5">{badges.length} badge tersedia</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {badges.map((badge) => (
              <div
                key={badge.id}
                className="relative p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 text-center group"
              >
                <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">
                  {badge.icon}
                </div>
                <p className="text-sm font-medium text-gray-900">{badge.name}</p>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{badge.description}</p>
                <span
                  className="mt-2 inline-block px-2 py-0.5 rounded-full text-[10px] font-medium text-white"
                  style={{ backgroundColor: CATEGORY_COLORS[badge.category] || '#6b7280' }}
                >
                  {CATEGORY_LABELS[badge.category] || badge.category}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
