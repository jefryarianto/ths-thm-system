'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { Plus, Edit3, Trash2, RefreshCw, Calendar, CheckCircle2 } from 'lucide-react';
import PageContainer from '@/components/ui/page-container';
import PageHeader from '@/components/ui/page-header';
import Modal from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-modal';

interface Periode {
  id: string;
  nama: string;
  tglMulai: string;
  tglSelesai: string;
  isActive: boolean;
  _count: { pengurus: number };
}

export default function PeriodePage() {
  const toast = useToast();
  const { confirm, confirmModal } = useConfirm();
  const [data, setData] = useState<Periode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState<Periode | null>(null);
  const [form, setForm] = useState({ nama: '', tglMulai: '', tglSelesai: '', isActive: false });

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: res } = await apiClient.get('/periode');
      setData(res.data || []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async () => {
    if (!form.nama.trim()) return toast('error', 'Nama wajib diisi');
    if (!form.tglMulai || !form.tglSelesai) return toast('error', 'Tanggal wajib diisi');
    try {
      const payload = { nama: form.nama.trim(), tglMulai: form.tglMulai, tglSelesai: form.tglSelesai, isActive: form.isActive };
      if (editData) {
        await apiClient.patch(`/periode/${editData.id}`, payload);
        toast('success', 'Periode berhasil diupdate');
      } else {
        await apiClient.post('/periode', payload);
        toast('success', 'Periode berhasil ditambahkan');
      }
      setShowModal(false);
      setEditData(null);
      setForm({ nama: '', tglMulai: '', tglSelesai: '', isActive: false });
      fetchData();
    } catch (e: any) {
      toast('error', e?.response?.data?.message || 'Gagal menyimpan');
    }
  };

  const handleDelete = async (item: Periode) => {
    const ok = await confirm({ title: `Hapus "${item.nama}"?`, message: item._count.pengurus > 0 ? `Masih digunakan oleh ${item._count.pengurus} pengurus` : '' });
    if (!ok) return;
    try {
      await apiClient.delete(`/periode/${item.id}`);
      toast('success', 'Periode berhasil dihapus');
      fetchData();
    } catch (e: any) {
      toast('error', e?.response?.data?.message || 'Gagal menghapus');
    }
  };

  const handleToggleActive = async (item: Periode) => {
    try {
      await apiClient.patch(`/periode/${item.id}`, { isActive: !item.isActive });
      toast('success', `Periode ${item.nama} ${!item.isActive ? 'diaktifkan' : 'dinonaktifkan'}`);
      fetchData();
    } catch (e: any) {
      toast('error', e?.response?.data?.message || 'Gagal update');
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Periode Kepengurusan"
        onRefresh={fetchData}
        children={
          <button
            onClick={() => { setEditData(null); setForm({ nama: '', tglMulai: '', tglSelesai: '', isActive: false }); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} /> Tambah Periode
          </button>
        }
      />

      {loading ? (
        <div className="flex justify-center py-20"><RefreshCw className="animate-spin text-gray-400" size={24} /></div>
      ) : (
        <div className="grid gap-4">
          {data.map((item) => (
            <div key={item.id} className={`bg-white dark:bg-gray-800 rounded-xl border p-4 flex items-center justify-between ${item.isActive ? 'border-green-300 dark:border-green-700' : 'border-gray-200 dark:border-gray-700'}`}>
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${item.isActive ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-700'}`}>
                  <Calendar size={18} className={item.isActive ? 'text-green-600' : 'text-gray-400'} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 dark:text-white">{item.nama}</span>
                    {item.isActive && (
                      <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full flex items-center gap-1">
                        <CheckCircle2 size={10} /> Aktif
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(item.tglMulai).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })} — {new Date(item.tglSelesai).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                    <span className="ml-2">• {item._count.pengurus} pengurus</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => handleToggleActive(item)} className={`px-3 py-1.5 text-xs rounded-lg font-medium ${item.isActive ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                  {item.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                </button>
                <button onClick={() => { setEditData(item); setForm({ nama: item.nama, tglMulai: item.tglMulai.split('T')[0], tglSelesai: item.tglSelesai.split('T')[0], isActive: item.isActive }); setShowModal(true); }} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700"><Edit3 size={14} className="text-gray-500" /></button>
                <button onClick={() => handleDelete(item)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 size={14} className="text-red-500" /></button>
              </div>
            </div>
          ))}
          {data.length === 0 && <p className="text-center py-8 text-gray-400">Belum ada periode</p>}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editData ? 'Edit Periode' : 'Tambah Periode'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nama Periode *</label>
            <input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="Contoh: 2025-2028" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tanggal Mulai *</label>
              <input type="date" value={form.tglMulai} onChange={(e) => setForm({ ...form, tglMulai: e.target.value })} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tanggal Selesai *</label>
              <input type="date" value={form.tglSelesai} onChange={(e) => setForm({ ...form, tglSelesai: e.target.value })} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="isActive" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="rounded" />
            <label htmlFor="isActive" className="text-sm text-gray-700 dark:text-gray-300">Aktif (periode yang berlaku)</label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border rounded-lg">Batal</button>
            <button onClick={handleSave} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Simpan</button>
          </div>
        </div>
      </Modal>
      {confirmModal}
    </PageContainer>
  );
}
