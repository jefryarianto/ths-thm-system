'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { Plus, Edit3, Trash2, RefreshCw, GripVertical } from 'lucide-react';
import PageContainer from '@/components/ui/page-container';
import PageHeader from '@/components/ui/page-header';
import Modal from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-modal';

interface Jabatan {
  id: string;
  nama: string;
  kode: string | null;
  urutan: number;
  _count: { pengurus: number };
}

export default function JabatanPage() {
  const toast = useToast();
  const { confirm, confirmModal } = useConfirm();
  const [data, setData] = useState<Jabatan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState<Jabatan | null>(null);
  const [form, setForm] = useState({ nama: '', kode: '', urutan: 0 });

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: res } = await apiClient.get('/jabatan');
      setData(res.data || []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async () => {
    if (!form.nama.trim()) return toast('error', 'Nama wajib diisi');
    try {
      const payload = { nama: form.nama.trim(), kode: form.kode.trim() || undefined, urutan: form.urutan };
      if (editData) {
        await apiClient.patch(`/jabatan/${editData.id}`, payload);
        toast('success', 'Jabatan berhasil diupdate');
      } else {
        await apiClient.post('/jabatan', payload);
        toast('success', 'Jabatan berhasil ditambahkan');
      }
      setShowModal(false);
      setEditData(null);
      setForm({ nama: '', kode: '', urutan: 0 });
      fetchData();
    } catch (e: any) {
      toast('error', e?.response?.data?.message || 'Gagal menyimpan');
    }
  };

  const handleDelete = async (item: Jabatan) => {
    const ok = await confirm({ title: `Hapus "${item.nama}"?`, message: item._count.pengurus > 0 ? `Masih digunakan oleh ${item._count.pengurus} pengurus` : '' });
    if (!ok) return;
    try {
      await apiClient.delete(`/jabatan/${item.id}`);
      toast('success', 'Jabatan berhasil dihapus');
      fetchData();
    } catch (e: any) {
      toast('error', e?.response?.data?.message || 'Gagal menghapus');
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Jabatan"
        onRefresh={fetchData}
        children={
          <button
            onClick={() => { setEditData(null); setForm({ nama: '', kode: '', urutan: data.length }); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} /> Tambah Jabatan
          </button>
        }
      />

      {loading ? (
        <div className="flex justify-center py-20"><RefreshCw className="animate-spin text-gray-400" size={24} /></div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <th className="text-left px-4 py-3 font-medium text-gray-500 w-12">#</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Nama</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Kode</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Pengurus</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item, idx) => (
                <tr key={item.id} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-4 py-3 text-gray-400">{item.urutan}</td>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{item.nama}</td>
                  <td className="px-4 py-3 text-gray-500">{item.kode || '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{item._count.pengurus}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => { setEditData(item); setForm({ nama: item.nama, kode: item.kode || '', urutan: item.urutan }); setShowModal(true); }} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700"><Edit3 size={14} className="text-gray-500" /></button>
                      <button onClick={() => handleDelete(item)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 size={14} className="text-red-500" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.length === 0 && <p className="text-center py-8 text-gray-400">Belum ada jabatan</p>}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editData ? 'Edit Jabatan' : 'Tambah Jabatan'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nama Jabatan *</label>
            <input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="Contoh: Koordinator" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kode</label>
              <input value={form.kode} onChange={(e) => setForm({ ...form, kode: e.target.value })} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="Contoh: KRD" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Urutan</label>
              <input type="number" value={form.urutan} onChange={(e) => setForm({ ...form, urutan: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            </div>
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
