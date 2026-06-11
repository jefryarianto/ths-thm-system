'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import apiClient, { unwrap } from '@/lib/api-client';
import {
  ArrowLeft, Zap, Flame, Star, Award,
  AlertCircle, Activity, TrendingUp,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
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

interface GamificationProfile {
  anggotaId: string;
  namaLengkap?: string;
  points: number;
  level?: { name: string; icon: string; color: string };
  badges: Badge[];
  streaks: { latihan: number; iuran: number };
  lastActivity: string;
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

const EVENT_ICONS: Record<string, string> = {
  training: '🥋',
  dues: '💰',
  badge: '🏅',
  achievement: '🎯',
};

export default function GamificationProfilePage() {
  const params = useParams();
  const router = useRouter();
  const anggotaId = (params?.anggotaId as string) || '';

  const [profile, setProfile] = useState<GamificationProfile | null>(null);
  const [events, setEvents] = useState<PointEvent[]>([]);
  const [pointsHistory, setPointsHistory] = useState<Array<{ month: string; points: number; cumulative: number; count: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) {
      router.push('/login');
      return;
    }
    fetchData();
  }, [anggotaId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [profileRes, eventsRes, historyRes] = await Promise.all([
        apiClient.get(`/gamification/profile/${anggotaId}`),
        apiClient.get(`/gamification/profile/${anggotaId}/events?limit=20`),
        apiClient.get(`/gamification/profile/${anggotaId}/points-history`),
      ]);
      setProfile(unwrap(profileRes));
      setEvents(unwrap(eventsRes));
      setPointsHistory(unwrap(historyRes) || []);
    } catch (err) {
      console.error('Failed to fetch gamification profile:', err);
      setError('Gagal memuat profil gamifikasi');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'baru saja';
    if (mins < 60) return `${mins}m lalu`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}j lalu`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}h lalu`;
    return formatDate(dateStr);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          <p className="text-sm text-gray-500">Memuat profil...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-3" />
          <p className="text-red-600 font-medium">{error || 'Profil tidak ditemukan'}</p>
          <Link href="/gamification" className="text-sm text-blue-600 hover:underline mt-2 inline-block">
            ← Kembali ke gamifikasi
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link
        href="/gamification"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition"
      >
        <ArrowLeft size={16} />
        Kembali ke Gamifikasi
      </Link>

      {/* Profile Header */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
            {(profile.namaLengkap || anggotaId).charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">{profile.namaLengkap || anggotaId}</h1>
            <p className="text-sm text-gray-500 mt-0.5">ID: {anggotaId}</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-2xl font-bold text-yellow-600">
              <Zap size={24} />
              {profile.points.toLocaleString('id-ID')}
            </div>
            <p className="text-xs text-gray-500">Total Poin</p>
            {profile.level && (
              <div className="flex items-center gap-1 mt-1 justify-end">
                <span className="text-lg">{profile.level.icon}</span>
                <span className="text-sm font-bold" style={{ color: profile.level.color }}>
                  {profile.level.name}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-500">Streak Latihan</span>
            <Flame size={20} className="text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{profile.streaks.latihan}</p>
          <p className="text-xs text-gray-400 mt-1">latihan berturut-turut</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-500">Streak Iuran</span>
            <Star size={20} className="text-green-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{profile.streaks.iuran}</p>
          <p className="text-xs text-gray-400 mt-1">iuran tepat waktu</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-500">Badge Diraih</span>
            <Award size={20} className="text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{profile.badges.length}</p>
          <p className="text-xs text-gray-400 mt-1">dari 10 badge tersedia</p>
        </div>
      </div>

      {/* Points History Chart */}
      {pointsHistory.length > 1 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp size={20} className="text-blue-500" />
            <h2 className="text-base font-semibold text-gray-900">Perkembangan Poin</h2>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={pointsHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11 }}
                tickFormatter={(val) => {
                  const [y, m] = val.split('-');
                  const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
                  return `${months[parseInt(m) - 1]} ${y.slice(2)}`;
                }}
              />
              <YAxis tick={{ fontSize: 11 }} />
              <RechartsTooltip
                formatter={(value: number, name: string) => [
                  value.toLocaleString('id-ID'),
                  name === 'cumulative' ? 'Total Poin' : 'Poin Bulan Ini',
                ]}
                labelFormatter={(label) => {
                  const [y, m] = label.split('-');
                  const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
                  return `${months[parseInt(m) - 1]} ${y}`;
                }}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
              />
              <Line
                type="monotone"
                dataKey="cumulative"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 3, fill: '#3b82f6' }}
                activeDot={{ r: 5 }}
                name="cumulative"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Badges Section */}
      {profile.badges.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-gray-900">Badge Diraih</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {profile.badges.map((badge) => (
              <div
                key={badge.id}
                className="p-4 rounded-xl border border-gray-200 bg-gradient-to-br from-yellow-50 to-orange-50 text-center group hover:shadow-md transition-all"
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
                  {badge.category}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Events Timeline */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="mb-4 flex items-center gap-2">
          <Activity size={20} className="text-blue-500" />
          <h2 className="text-base font-semibold text-gray-900">Aktivitas Terbaru</h2>
          <span className="text-xs text-gray-400">({events.length} event)</span>
        </div>
        {events.length > 0 ? (
          <div className="space-y-0">
            {events.map((event, idx) => (
              <div key={event.id} className="flex gap-4 relative">
                {/* Timeline line */}
                {idx < events.length - 1 && (
                  <div className="absolute left-[15px] top-9 bottom-0 w-0.5 bg-gray-200" />
                )}
                {/* Icon */}
                <div className="relative z-10 flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <span className="text-sm">{EVENT_ICONS[event.type] || '📌'}</span>
                </div>
                {/* Content */}
                <div className="flex-1 pb-5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">{event.description}</span>
                    </p>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">
                      <Zap size={10} />
                      +{event.points}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{getTimeAgo(event.timestamp)}</p>
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
    </div>
  );
}
