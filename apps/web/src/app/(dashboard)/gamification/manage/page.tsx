'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import {
  Zap, Plus, Edit3, Trash2, AlertCircle, CheckCircle, XCircle,
  Loader2, Save, X,
} from 'lucide-react';

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
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', icon: '🎁', pointCost: 100, stock: 10 });

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) { router.push('/login'); return; }
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rewardsRes, redemptionsRes] = await Promise.all([
        apiClient.get('/gamification/rewards'),
        apiClient.get('/gamification/redemptions'),
      ]);
      setRewards(rewardsRes.data.data);
      setRedemptions(redemptionsRes.data.data);
    } catch (_err) {
      setError('Gagal memuat data');
    } finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!form.name || form.pointCost <= 0) return alert('Nama dan poin wajib diisi');
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
      await fetchData();      } catch (_err: any) {
        alert(_err.response?.data?.message || 'Gagal menyimpan');
      } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus reward ini?')) return;
    try {
      await apiClient.delete(`/gamification/rewards/${id}`);
      await fetchData();
    } catch (err: unknown) {
      alert((err as any)?.response?.data?.message || 'Gagal menghapus');
    }
  };

  const handleStatus = async (id: string, status: string) => {
    try {
      await apiClient.patch(`/gamification/redemptions/${id}/status`, { status });
      await fetchData();
    } catch (err: unknown) {
      alert((err as any)?.response?.data?.message || 'Gagal update status');
    }
  };

  const editReward = (reward: Reward) => {
    setEditingReward(reward);
    setForm({ name: reward.name, description: reward.description || '', icon: reward.icon, pointCost: reward.pointCost, stock: reward.stock });
    setShowForm(true);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={24} className="animate-spin text-blue-600" />
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center h-64">
      <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-3" />
      <p className="text-red-600 font-medium">{error}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Rewards</h1>
          <p className="text-sm text-gray-500 mt-1">Kelola reward dan permintaan redeem</p>
        </div>
        <button
          onClick={() => { setEditingReward(null); setForm({ name: '', description: '', icon: '🎁', pointCost: 100, stock: 10 }); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
        >
          <Plus size={16} /> Tambah Reward
        </button>
      </div>

      {/* Reward Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{editingReward ? 'Edit Reward' : 'Tambah Reward'}</h3>
              <button onClick={() => { setShowForm(false); setEditingReward(null); }}><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500">Nama *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Deskripsi</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" rows={2} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500">Icon</label>
                  <input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 text-center text-2xl" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Poin *</label>
                  <input type="number" value={form.pointCost} onChange={(e) => setForm({ ...form, pointCost: parseInt(e.target.value) || 0 })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Stok</label>
                  <input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: parseInt(e.target.value) || 0 })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" />
                </div>
              </div>
              <button onClick={handleSave} disabled={saving}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium mt-4">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {editingReward ? 'Update' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rewards Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Daftar Reward ({rewards.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Reward</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Poin</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Stok</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rewards.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3">
                    <span className="text-lg mr-2">{r.icon}</span>
                    <span className="text-sm font-medium text-gray-900">{r.name}</span>
                    {r.description && <p className="text-xs text-gray-500 mt-0.5">{r.description}</p>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-yellow-700">
                      <Zap size={12} />{r.pointCost.toLocaleString('id-ID')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`text-sm font-medium ${r.stock > 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {r.stock}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                      {r.isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => editReward(r)} className="p-1.5 hover:bg-blue-50 rounded-lg transition">
                        <Edit3 size={14} className="text-blue-600" />
                      </button>
                      <button onClick={() => handleDelete(r.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition">
                        <Trash2 size={14} className="text-red-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Redemption Requests */}
      {redemptions.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-base font-semibold text-gray-900">Permintaan Redeem ({redemptions.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Anggota</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Reward</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Poin</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {redemptions.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">{r.namaLengkap || r.anggotaId.slice(0, 8)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{r.rewardIcon} {r.rewardName}</td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-yellow-700">{r.pointsSpent.toLocaleString('id-ID')}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[r.status]?.bg || 'bg-gray-100'} ${STATUS_STYLES[r.status]?.text || 'text-gray-600'}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 text-right">
                      {new Date(r.createdAt).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {r.status === 'pending' && (
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => handleStatus(r.id, 'approved')} className="p-1.5 hover:bg-green-50 rounded-lg transition" title="Setujui">
                            <CheckCircle size={16} className="text-green-600" />
                          </button>
                          <button onClick={() => handleStatus(r.id, 'rejected')} className="p-1.5 hover:bg-red-50 rounded-lg transition" title="Tolak">
                            <XCircle size={16} className="text-red-500" />
                          </button>
                        </div>
                      )}
                      {r.status === 'approved' && (
                        <button onClick={() => handleStatus(r.id, 'completed')} className="text-xs text-blue-600 hover:underline">
                          Selesaikan
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
