'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import {
  Gift, Zap, AlertCircle, CheckCircle, Clock, XCircle,
  ShoppingBag, Loader2,
} from 'lucide-react';

interface Reward {
  id: string;
  name: string;
  description?: string;
  icon: string;
  pointCost: number;
  stock: number;
  isActive: boolean;
}

interface Redemption {
  id: string;
  rewardId: string;
  rewardName: string;
  rewardIcon: string;
  anggotaId: string;
  pointsSpent: number;
  status: string;
  notes?: string;
  createdAt: string;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; icon: typeof Clock }> = {
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock },
  approved: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
  rejected: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle },
  completed: { bg: 'bg-blue-100', text: 'text-blue-800', icon: CheckCircle },
};

export default function RewardsPage() {
  const router = useRouter();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [userAnggotaId, setUserAnggotaId] = useState<string | null>(null);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) {
      router.push('/login');
      return;
    }
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setUserAnggotaId(user?.anggotaId || null);
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rewardsRes] = await Promise.all([
        apiClient.get('/gamification/rewards'),
      ]);
      setRewards(rewardsRes.data.data);
    } catch (err) {
      console.error('Failed to fetch rewards:', err);
      setError('Gagal memuat data reward');
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = async (rewardId: string) => {
    if (!userAnggotaId) {
      alert('Silakan login terlebih dahulu');
      return;
    }
    setRedeemingId(rewardId);
    try {
      const res = await apiClient.post(`/gamification/rewards/${rewardId}/redeem`, {
        anggotaId: userAnggotaId,
      });
      setRedemptions((prev) => [res.data.data, ...prev]);
      // Refresh rewards to update stock
      const rewardsRes = await apiClient.get('/gamification/rewards');
      setRewards(rewardsRes.data.data);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal redeem reward');
    } finally {
      setRedeemingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          <p className="text-sm text-gray-500">Memuat reward...</p>
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
        </div>
      </div>
    );
  }

  const activeRewards = rewards.filter((r) => r.isActive);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reward</h1>
          <p className="text-sm text-gray-500 mt-1">Tukarkan poin Anda dengan reward menarik</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <ShoppingBag size={16} className="text-purple-500" />
          <span>{redemptions.length} redeem</span>
        </div>
      </div>

      {/* Rewards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {activeRewards.map((reward) => (
          <div
            key={reward.id}
            className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:shadow-lg transition-all duration-200 flex flex-col"
          >
            <div className="text-5xl text-center mb-4">{reward.icon}</div>
            <h3 className="text-base font-semibold text-gray-900 text-center">{reward.name}</h3>
            {reward.description && (
              <p className="text-xs text-gray-500 text-center mt-1 line-clamp-2">{reward.description}</p>
            )}
            <div className="mt-4 flex items-center justify-between">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">
                <Zap size={12} />
                {reward.pointCost.toLocaleString('id-ID')} poin
              </span>
              <span className={`text-xs font-medium ${reward.stock > 0 ? 'text-green-600' : 'text-red-500'}`}>
                {reward.stock > 0 ? `Stok: ${reward.stock}` : 'Habis'}
              </span>
            </div>
            <button
              onClick={() => handleRedeem(reward.id)}
              disabled={redeemingId === reward.id || reward.stock <= 0}
              className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium"
            >
              {redeemingId === reward.id ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Gift size={16} />
              )}
              {redeemingId === reward.id ? 'Memproses...' : 'Redeem'}
            </button>
          </div>
        ))}
        {activeRewards.length === 0 && (
          <div className="col-span-full flex items-center justify-center h-48 text-gray-400 text-sm">
            Belum ada reward tersedia
          </div>
        )}
      </div>

      {/* Redemption History */}
      {redemptions.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Riwayat Redeem</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">Reward</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">Poin</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {redemptions.map((r) => {
                  const statusStyle = STATUS_STYLES[r.status] || STATUS_STYLES.pending;
                  const StatusIcon = statusStyle.icon;
                  return (
                    <tr key={r.id} className="hover:bg-gray-50 transition">
                      <td className="px-3 py-3">
                        <span className="text-sm font-medium text-gray-900">
                          {r.rewardIcon} {r.rewardName}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center gap-1 text-sm font-semibold text-yellow-700">
                          <Zap size={12} /> {r.pointsSpent.toLocaleString('id-ID')}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                          <StatusIcon size={12} />
                          {r.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-500">
                        {new Date(r.createdAt).toLocaleDateString('id-ID')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
