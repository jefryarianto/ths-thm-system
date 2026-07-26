'use client';

import { PermissionGuard } from '@/components/auth/permission-guard';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import apiClient, { unwrap } from '@/lib/api-client';
import DataTable from '@/components/ui/data-table';
import Breadcrumbs from '@/components/ui/breadcrumbs';
import {

  Gift,
  Zap,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  ShoppingBag,
  Loader2,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rewardsRes] = await Promise.all([apiClient.get('/gamification/rewards')]);
      setRewards(unwrap(rewardsRes));
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
      setRedemptions((prev) => [unwrap(res), ...prev]);
      // Refresh rewards to update stock
      const rewardsRes = await apiClient.get('/gamification/rewards');
      setRewards(unwrap(rewardsRes));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg || 'Gagal redeem reward');
    } finally {
      setRedeemingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900 sr-only">Reward</h1>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Memuat reward...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Reward</h1>
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-3" />
          <p className="text-red-600 font-medium">{error}</p>
        </div>
      </div>
    );
  }

  const activeRewards = rewards.filter((r) => r.isActive);

  return (
      <PermissionGuard module="gamification" action="view">
        <Breadcrumbs />
        <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Reward</h1>
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
                    className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 hover:shadow-lg transition-all duration-200 flex flex-col"
                  >
                    <div className="text-5xl text-center mb-4">{reward.icon}</div>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 text-center">{reward.name}</h3>
                    {reward.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-1 line-clamp-2">
                        {reward.description}
                      </p>
                    )}
                    <div className="mt-4 flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">
                        <Zap size={12} />
                        {reward.pointCost.toLocaleString('id-ID')} poin
                      </span>
                      <span
                        className={`text-xs font-medium ${reward.stock > 0 ? 'text-green-600' : 'text-red-500'}`}
                      >
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
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
                  <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">Riwayat Redeem</h2>
                  <DataTable
                    columns={[
                      {
                        key: 'reward',
                        label: 'Reward',
                        render: (r: Redemption) => (
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {r.rewardIcon} {r.rewardName}
                          </span>
                        ),
                      },
                      {
                        key: 'pointsSpent',
                        label: 'Poin',
                        render: (r: Redemption) => (
                          <span className="inline-flex items-center gap-1 text-sm font-semibold text-yellow-700">
                            <Zap size={12} /> {r.pointsSpent.toLocaleString('id-ID')}
                          </span>
                        ),
                      },
                      {
                        key: 'status',
                        label: 'Status',
                        render: (r: Redemption) => {
                          const statusStyle = STATUS_STYLES[r.status] || STATUS_STYLES.pending;
                          const StatusIcon = statusStyle.icon;
                          return (
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}
                            >
                              <StatusIcon size={12} />
                              {r.status}
                            </span>
                          );
                        },
                      },
                      {
                        key: 'createdAt',
                        label: 'Tanggal',
                        render: (r: Redemption) => (
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {new Date(r.createdAt).toLocaleDateString('id-ID')}
                          </span>
                        ),
                      },
                    ]}
                    data={redemptions}
                    loading={false}
                    empty={{ icon: Gift, message: 'Belum ada riwayat redeem' }}
                    page={1}
                    totalPages={1}
                    total={redemptions.length}
                    onPageChange={() => {}}
                  />
                </div>
              )}
            </div>
      </PermissionGuard>
    );
}
