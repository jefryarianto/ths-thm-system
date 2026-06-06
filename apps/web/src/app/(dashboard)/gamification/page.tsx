'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import {
  Trophy, Award, TrendingUp, Medal, Star, Zap,
  AlertCircle, Users, Target, Flame,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
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

export default function GamificationPage() {
  const router = useRouter();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [stats, setStats] = useState<GamificationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) {
      router.push('/login');
      return;
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [badgesRes, leaderboardRes, statsRes] = await Promise.all([
        apiClient.get('/gamification/badges'),
        apiClient.get('/gamification/leaderboard?limit=10'),
        apiClient.get('/gamification/stats'),
      ]);
      setBadges(badgesRes.data.data);
      setLeaderboard(leaderboardRes.data.data);
      setStats(statsRes.data.data);
    } catch (err) {
      console.error('Failed to fetch gamification data:', err);
      setError('Gagal memuat data gamifikasi');
    } finally {
      setLoading(false);
    }
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
          <div className="mb-4 flex items-center gap-2">
            <Medal size={20} className="text-yellow-500" />
            <h3 className="text-base font-semibold text-gray-900">Leaderboard</h3>
          </div>
          {leaderboard.length > 0 ? (
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
                    <tr key={entry.anggotaId} className={`hover:bg-gray-50 transition ${entry.rank <= 3 ? 'bg-yellow-50/30' : ''}`}>
                      <td className="px-3 py-3">
                        <span className="text-lg">{RANK_ICONS[entry.rank] || entry.rank}</span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-sm font-medium text-gray-900">{entry.anggotaId}</span>
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

      {/* All Badges Grid */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-gray-900">Semua Badge</h3>
          <p className="text-xs text-gray-500 mt-0.5">{badges.length} badge tersedia</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {badges.map((badge) => (
            <div
              key={badge.id}
              className="relative p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 text-center group"
            >
              <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">
                {badge.icon}
              </div>
              <p className="text-sm font-medium text-gray-900">{badge.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{badge.description}</p>
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
  );
}
