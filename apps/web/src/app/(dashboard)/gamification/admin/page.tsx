'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import {
  Trophy, Award, Zap, AlertCircle, Gift, Users,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';

interface PointsDistribution {
  level: string;
  icon: string;
  color: string;
  count: number;
}

interface Redemption {
  id: string;
  rewardName: string;
  rewardIcon: string;
  namaLengkap: string;
  pointsSpent: number;
  status: string;
  createdAt: string;
}

const STATUS_BADGES: Record<string, { label: string; class: string }> = {
  pending: { label: 'Pending', class: 'bg-yellow-100 text-yellow-800' },
  approved: { label: 'Disetujui', class: 'bg-blue-100 text-blue-800' },
  rejected: { label: 'Ditolak', class: 'bg-red-100 text-red-800' },
  completed: { label: 'Selesai', class: 'bg-green-100 text-green-800' },
};

export default function GamificationAdminPage() {
  const [distribution, setDistribution] = useState<PointsDistribution[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [distRes, redeemRes] = await Promise.all([
        apiClient.get('/gamification/admin/points-distribution'),
        apiClient.get('/gamification/admin/top-redemptions?limit=20'),
      ]);
      setDistribution(distRes.data.data || []);
      setRedemptions(redeemRes.data.data || []);
    } catch (err) {
      console.error('Failed to fetch gamification admin data:', err);
      setError('Gagal memuat data admin gamifikasi');
    } finally {
      setLoading(false);
    }
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
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          <p className="text-sm text-gray-500">Memuat data admin gamifikasi...</p>
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Gamifikasi</h1>
          <p className="text-sm text-gray-500 mt-1">Distribusi poin dan riwayat redeem reward</p>
        </div>
        <Trophy size={20} className="text-yellow-500" />
      </div>

      {/* Points Distribution Chart */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="mb-6 flex items-center gap-2">
          <Users size={20} className="text-blue-500" />
          <h3 className="text-base font-semibold text-gray-900">Distribusi Anggota per Level</h3>
        </div>
        {distribution.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={distribution} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="level"
                tick={{ fontSize: 12, fill: '#6b7280' }}
                tickFormatter={(val) => {
                  const item = distribution.find((d) => d.level === val);
                  return item ? `${item.icon} ${val}` : val;
                }}
              />
              <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} allowDecimals={false} />
              <Tooltip
                formatter={(value: number, _name: string, props: any) => [
                  `${value} anggota`,
                  `${props.payload.icon} ${props.payload.level}`,
                ]}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={60}>
                {distribution.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
            Belum ada data distribusi
          </div>
        )}
        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-4 justify-center">
          {distribution.map((d) => (
            <div key={d.level} className="flex items-center gap-1.5 text-xs text-gray-600">
              <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: d.color }} />
              {d.icon} {d.level}: <span className="font-semibold">{d.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Top Redemptions Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="mb-6 flex items-center gap-2">
          <Gift size={20} className="text-purple-500" />
          <h3 className="text-base font-semibold text-gray-900">Riwayat Redeem Reward</h3>
        </div>
        {redemptions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">Reward</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">Anggota</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 uppercase">Poin</th>
                  <th className="text-center px-3 py-2 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 uppercase">Waktu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {redemptions.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 transition">
                    <td className="px-3 py-3">
                      <span className="text-sm font-medium text-gray-900">
                        {r.rewardIcon} {r.rewardName}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-sm text-gray-700">{r.namaLengkap}</span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">
                        <Zap size={10} />
                        {r.pointsSpent.toLocaleString('id-ID')}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGES[r.status]?.class || 'bg-gray-100 text-gray-800'}`}>
                        {STATUS_BADGES[r.status]?.label || r.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right text-xs text-gray-500">
                      {getTimeAgo(r.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
            Belum ada redeem reward
          </div>
        )}
      </div>
    </div>
  );
}
