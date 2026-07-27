'use client';

import { PermissionGuard } from '@/components/auth/permission-guard';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import apiClient, { unwrap } from '@/lib/api-client';
import DataTable from '@/components/ui/data-table';
import PageContainer from '@/components/ui/page-container';
import PageHeader from '@/components/ui/page-header';
import {
  Zap,
  Plus,
  Edit3,
  Trash2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Gift,
  Loader2,
  Save,
  X,
} from 'lucide-react';
import { useToast } from '@/components/ui/toast';

interface Reward {
  id: string;
  name: string;
  description?: string;
  icon: string;
  pointCost: number;
  stock: number;
  isActive: boolean;
  createdAt: string;
}

interface Redemption {
  id: string;
  rewardId: string;
  rewardName?: string;
  rewardIcon?: string;
  anggotaId: string;
  namaLengkap?: string;
  pointsSpent: number;
  status: string;
  notes?: string;
  createdAt: string;
}

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  approved: { bg: 'bg-green-100', text: 'text-green-800' },
  rejected: { bg: 'bg-red-100', text: 'text-red-800' },
  completed: { bg: 'bg-blue-100', text: 'text-blue-800' },
};

export default function ManageRewardsPage() {
  const router = useRouter();
  const toast = useToast();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    icon: '🎁',
    pointCost: 100,
    stock: 10,
  });

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) {
      router.push('/login');
      return;
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rewardsRes, redemptionsRes] = await Promise.all([
        apiClient.get('/gamification/rewards'),
        apiClient.get('/gamification/redemptions'),
      ]);
      setRewards(unwrap(rewardsRes));
      setRedemptions(unwrap(redemptionsRes));
    } catch {
      setError('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.name || form.pointCost <= 0) return toast('error', 'Nama dan poin wajib diisi');
    setSaving(true);
    try {
      if (editingReward) {
        await apiClient.patch(`/gamification/rewards/${editingReward.id}`, form);
      } else {
        await apiClient.post('/gamification/rewards', form);
      }
      setShowForm(false);
      setEditingReward(null);
      setForm({ name: '', description: '', icon: '🎁', pointCost: 100, stock: 10 });
      await fetchData();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
       toast(msg || 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus reward ini?')) return;
    try {
      await apiClient.delete(`/gamification/rewards/${id}`);
      await fetchData();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
       toast(msg || 'Gagal menghapus');
    }
  };

  const handleStatus = async (id: string, status: string) => {
    try {
      await apiClient.patch(`/gamification/redemptions/${id}/status`, { status });
      await fetchData();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
       toast(msg || 'Gagal update status');
    }
  };

  const editReward = (reward: Reward) => {
    setEditingReward(reward);
    setForm({
      name: reward.name,
      description: reward.description || '',
      icon: reward.icon,
      pointCost: reward.pointCost,
      stock: reward.stock,
    });
    setShowForm(true);
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 sr-only">Manage Rewards</h1>
          <Loader2 size={24} className="animate-spin text-blue-600 mx-auto" />
        </div>
      </div>
    );

  if (error)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Manage Rewards</h1>
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-3" />
          <p className="text-red-600 dark:text-red-400 font-medium">{error}</p>
        </div>
      </div>
    );

  return (
      <PermissionGuard module="gamification" action="view">
        <PageContainer>
              <PageHeader title="Manage Rewards" onRefresh={fetchData}>
                <button
                  onClick={() => {
                    setEditingReward(null);
                    setForm({ name: '', description: '', icon: '🎁', pointCost: 100, stock: 10 });
                    setShowForm(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                >
                  <Plus size={16} /> Tambah Reward
                </button>
              </PageHeader>
        
              {/* Reward Form Modal */}
              {showForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-xl">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">
                        {editingReward ? 'Edit Reward' : 'Tambah Reward'}
                      </h3>
                      <button
                        onClick={() => {
                          setShowForm(false);
                          setEditingReward(null);
                        }}
                        className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                      >
                        <X size={20} />
                      </button>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Nama *</label>
                        <input
                          name="rewardName"
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm mt-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Deskripsi</label>
                        <textarea
                          name="description"
                          value={form.description}
                          onChange={(e) => setForm({ ...form, description: e.target.value })}
                          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm mt-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          rows={2}
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Icon</label>
                          <input
                            name="icon"
                            value={form.icon}
                            onChange={(e) => setForm({ ...form, icon: e.target.value })}
                            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm mt-1 text-center text-2xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Poin *</label>
                          <input
                            type="number"
                            name="pointCost"
                            value={form.pointCost}
                            onChange={(e) => setForm({ ...form, pointCost: parseInt(e.target.value) || 0 })}
                            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm mt-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Stok</label>
                          <input
                            type="number"
                            name="stock"
                            value={form.stock}
                            onChange={(e) => setForm({ ...form, stock: parseInt(e.target.value) || 0 })}
                            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm mt-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          />
                        </div>
                      </div>
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium mt-4"
                      >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        {editingReward ? 'Update' : 'Simpan'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
        
              {/* Rewards Table */}
              <DataTable
                columns={[
                  {
                    key: 'reward',
                    label: 'Reward',
                    render: (r: Reward) => (
                      <>
                        <span className="text-lg mr-2">{r.icon}</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{r.name}</span>
                      </>
                    ),
                  },
                  {
                    key: 'pointCost',
                    label: 'Poin',
                    render: (r: Reward) => (
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-yellow-700">
                        <Zap size={12} />
                        {r.pointCost.toLocaleString('id-ID')}
                      </span>
                    ),
                    align: 'right',
                  },
                  {
                    key: 'stock',
                    label: 'Stok',
                    render: (r: Reward) => (
                      <span
                        className={`text-sm font-medium ${r.stock > 0 ? 'text-green-600' : 'text-red-500'}`}
                      >
                        {r.stock}
                      </span>
                    ),
                    align: 'right',
                  },
                  {
                    key: 'isActive',
                    label: 'Status',
                    render: (r: Reward) => (
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}
                      >
                        {r.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    ),
                    align: 'center',
                  },
                ]}
                data={rewards}
                loading={false}
                empty={{ icon: Gift, message: 'Belum ada reward' }}
                page={1}
                totalPages={1}
                total={rewards.length}
                onPageChange={() => {}}
                actions={(r: Reward) => (
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => editReward(r)}
                      className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition"
                    >
                      <Edit3 size={14} className="text-blue-600" />
                    </button>
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition"
                    >
                      <Trash2 size={14} className="text-red-500" />
                    </button>
                  </div>
                )}
              />
        
              {/* Redemption Requests */}
              {redemptions.length > 0 && (
                <DataTable
                  columns={[
                    {
                      key: 'anggota',
                      label: 'Anggota',
                      render: (r: Redemption) => (
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {r.namaLengkap || r.anggotaId.slice(0, 8)}
                        </span>
                      ),
                    },
                    {
                      key: 'reward',
                      label: 'Reward',
                      render: (r: Redemption) => (
                        <span className="text-sm text-gray-900 dark:text-gray-100">
                          {r.rewardIcon} {r.rewardName}
                        </span>
                      ),
                    },
                    {
                      key: 'pointsSpent',
                      label: 'Poin',
                      render: (r: Redemption) => (
                        <span className="text-sm font-semibold text-yellow-700">
                          {r.pointsSpent.toLocaleString('id-ID')}
                        </span>
                      ),
                      align: 'right',
                    },
                    {
                      key: 'status',
                      label: 'Status',
                      render: (r: Redemption) => (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[r.status]?.bg || 'bg-gray-100'} ${STATUS_STYLES[r.status]?.text || 'text-gray-600'}`}
                        >
                          {r.status}
                        </span>
                      ),
                      align: 'center',
                    },
                    {
                      key: 'createdAt',
                      label: 'Tanggal',
                      render: (r: Redemption) => (
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(r.createdAt).toLocaleDateString('id-ID')}
                        </span>
                      ),
                      align: 'right',
                    },
                  ]}
                  data={redemptions}
                  loading={false}
                  empty={{ icon: Gift, message: 'Belum ada permintaan redeem' }}
                  page={1}
                  totalPages={1}
                  total={redemptions.length}
                  onPageChange={() => {}}
                  actions={(r: Redemption) => (
                    <>
                      {r.status === 'pending' ? (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleStatus(r.id, 'approved')}
                            className="p-1.5 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition"
                            title="Setujui"
                          >
                            <CheckCircle size={16} className="text-green-600" />
                          </button>
                          <button
                            onClick={() => handleStatus(r.id, 'rejected')}
                            className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition"
                            title="Tolak"
                          >
                            <XCircle size={16} className="text-red-500" />
                          </button>
                        </div>
                      ) : r.status === 'approved' ? (
                        <button
                          onClick={() => handleStatus(r.id, 'completed')}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Selesaikan
                        </button>
                      ) : null}
                    </>
                  )}
                />
              )}
            </PageContainer>
      </PermissionGuard>
    );
}
