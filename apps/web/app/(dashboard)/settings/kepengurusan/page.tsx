'use client';

import { useEffect, useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { Plus, Edit3, Trash2, RefreshCw, Users, Search, Filter } from 'lucide-react';
import PageContainer from '@/components/ui/page-container';
import PageHeader from '@/components/ui/page-header';
import Modal from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-modal';

interface Kepengurusan {
  id: string;
  userId: string;
  jabatanId: string;
  periodeId: string;
  distrikId: string | null;
  wilayahId: string | null;
  rantingId: string | null;
  parentId: string | null;
  user: { id: string; namaLengkap: string; email: string };
  jabatan: { id: string; nama: string; urutan: number };
  periode: { id: string; nama: string; isActive: boolean };
  distrik: { id: string; nama: string } | null;
  wilayah: { id: string; nama: string } | null;
  ranting: { id: string; nama: string } | null;
  parent: { id: string; user: { namaLengkap: string }; jabatan: { nama: string } } | null;
  children: { id: string; user: { namaLengkap: string }; jabatan: { nama: string } }[];
}

type Level = 'nasional' | 'distrik' | 'wilayah' | 'ranting';

export default function KepengurusanPage() {
  const toast = useToast();
  const { confirm } = useConfirm();
  const [data, setData] = useState<Kepengurusan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState<Kepengurusan | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter state
  const [level, setLevel] = useState<Level>('distrik');
  const [distrikId, setDistrikId] = useState('');
  const [wilayahId, setWilayahId] = useState('');
  const [rantingId, setRantingId] = useState('');
  const [periodeId, setPeriodeId] = useState('');

  // Dropdown data
  const [distriks, setDistriks] = useState<{ id: string; nama: string }[]>([]);
  const [wilayahs, setWilayahs] = useState<{ id: string; nama: string }[]>([]);
  const [rantings, setRantings] = useState<{ id: string; nama: string }[]>([]);
  const [periodes, setPeriodes] = useState<{ id: string; nama: string; isActive: boolean }[]>([]);
  const [jabatans, setJabatans] = useState<{ id: string; nama: string; urutan: number }[]>([]);
  const [users, setUsers] = useState<{ id: string; namaLengkap: string }[]>([]);

  // Form state
  const [form, setForm] = useState({
    userId: '', jabatanId: '', periodeId: '', parentId: '',
  });

  // Load dropdowns
  useEffect(() => {
    apiClient.get('/org-structure/distrik').then(({ data }) => setDistriks(data.data || [])).catch(() => {});
    apiClient.get('/periode').then(({ data }) => {
      setPeriodes(data.data || []);
      const active = (data.data || []).find((p: any) => p.isActive);
      if (active) setPeriodeId(active.id);
    }).catch(() => {});
    apiClient.get('/jabatan').then(({ data }) => setJabatans(data.data || [])).catch(() => {});
  }, []);

  // Load wilayahs
  useEffect(() => {
    if (!distrikId) { setWilayahs([]); return; }
    apiClient.get(`/org-structure/wilayah?distrikId=${distrikId}`).then(({ data }) => setWilayahs(data.data || [])).catch(() => {});
  }, [distrikId]);

  // Load rantings
  useEffect(() => {
    if (!wilayahId) { setRantings([]); return; }
    apiClient.get(`/org-structure/ranting?wilayahId=${wilayahId}`).then(({ data }) => setRantings(data.data || [])).catch(() => {});
  }, [wilayahId]);

  // Load users when modal opens
  useEffect(() => {
    if (showModal) {
      apiClient.get('/users?limit=200').then(({ data }) => setUsers(data.data || [])).catch(() => {});
    }
  }, [showModal]);

  // Fetch kepengurusan data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (level) params.level = level;
      const unitId = level === 'ranting' ? rantingId : level === 'wilayah' ? wilayahId : level === 'distrik' ? distrikId : undefined;
      if (unitId) params.unitId = unitId;
      if (periodeId) params.periodeId = periodeId;
      const { data: res } = await apiClient.get('/kepengurusan', { params });
      setData(res.data || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [level, distrikId, wilayahId, rantingId, periodeId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getUnitName = (item: Kepengurusan) => {
    return item.ranting?.nama || item.wilayah?.nama || item.distrik?.nama || 'Nasional';
  };

  const getLevelTag = (item: Kepengurusan) => {
    if (item.rantingId) return 'Ranting';
    if (item.wilayahId) return 'Wilayah';
    if (item.distrikId) return 'Distrik';
    return 'Nasional';
  };

  const filteredData = data.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return item.user.namaLengkap.toLowerCase().includes(q) || item.jabatan.nama.toLowerCase().includes(q) || getUnitName(item).toLowerCase().includes(q);
  });

  const handleSave = async () => {
    if (!form.userId) return toast('error', 'Pilih user');
    if (!form.jabatanId) return toast('error', 'Pilih jabatan');
    if (!form.periodeId && !periodeId) return toast('error', 'Pilih periode');

    try {
      const unitId = level === 'ranting' ? rantingId : level === 'wilayah' ? wilayahId : distrikId;
      const payload: Record<string, string> = {
        userId: form.userId,
        jabatanId: form.jabatanId,
        periodeId: form.periodeId || periodeId,
        parentId: form.parentId,
      };
      if (level === 'distrik') payload.distrikId = unitId;
      else if (level === 'wilayah') payload.wilayahId = unitId;
      else if (level === 'ranting') payload.rantingId = unitId;

      if (editData) {
        await apiClient.patch(`/kepengurusan/${editData.id}`, { userId: form.userId, jabatanId: form.jabatanId, parentId: form.parentId || null });
        toast('success', 'Kepengurusan berhasil diupdate');
      } else {
        await apiClient.post('/kepengurusan', payload);
        toast('success', 'Kepengurusan berhasil ditambahkan');
      }
      setShowModal(false);
      setEditData(null);
      setForm({ userId: '', jabatanId: '', periodeId: '', parentId: '' });
      fetchData();
    } catch (e: any) {
      toast('error', e?.response?.data?.message || 'Gagal menyimpan');
    }
  };

  const handleDelete = async (item: Kepengurusan) => {
    const ok = await confirm({ title: `Hapus ${item.user.namaLengkap} sebagai ${item.jabatan.nama}?`, message: item.children.length > 0 ? `Masih ada ${item.children.length} bawahan` : '' });
    if (!ok) return;
    try {
      await apiClient.delete(`/kepengurusan/${item.id}`);
      toast('success', 'Kepengurusan berhasil dihapus');
      fetchData();
    } catch (e: any) {
      toast('error', e?.response?.data?.message || 'Gagal menghapus');
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Kepengurusan"
        onRefresh={fetchData}
        children={
          <button
            onClick={() => { setEditData(null); setForm({ userId: '', jabatanId: '', periodeId: periodeId, parentId: '' }); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} /> Tambah Pengurus
          </button>
        }
      />

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <select value={level} onChange={(e) => { setLevel(e.target.value as Level); setWilayahId(''); setRantingId(''); }} className="px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white">
            <option value="nasional">Nasional</option>
            <option value="distrik">Distrik</option>
            <option value="wilayah">Wilayah</option>
            <option value="ranting">Ranting</option>
          </select>
          <select value={distrikId} onChange={(e) => { setDistrikId(e.target.value); setWilayahId(''); setRantingId(''); }} className="px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white">
            <option value="">Semua Distrik</option>
            {distriks.map((d) => <option key={d.id} value={d.id}>{d.nama}</option>)}
          </select>
          {(level === 'wilayah' || level === 'ranting') && (
            <select value={wilayahId} onChange={(e) => { setWilayahId(e.target.value); setRantingId(''); }} className="px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white">
              <option value="">Semua Wilayah</option>
              {wilayahs.map((w) => <option key={w.id} value={w.id}>{w.nama}</option>)}
            </select>
          )}
          {level === 'ranting' && (
            <select value={rantingId} onChange={(e) => setRantingId(e.target.value)} className="px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white">
              <option value="">Semua Ranting</option>
              {rantings.map((r) => <option key={r.id} value={r.id}>{r.nama}</option>)}
            </select>
          )}
          <select value={periodeId} onChange={(e) => setPeriodeId(e.target.value)} className="px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white">
            <option value="">Semua Periode</option>
            {periodes.map((p) => <option key={p.id} value={p.id}>{p.nama} {p.isActive ? '(Aktif)' : ''}</option>)}
          </select>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Cari nama, jabatan, atau unit..." className="w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20"><RefreshCw className="animate-spin text-gray-400" size={24} /></div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <th className="text-left px-4 py-3 font-medium text-gray-500">Nama</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Jabatan</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Unit</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Level</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Periode</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Atasan</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((item) => (
                <tr key={item.id} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{item.user.namaLengkap}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded text-xs font-medium">{item.jabatan.nama}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{getUnitName(item)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getLevelTag(item) === 'Distrik' ? 'bg-purple-50 text-purple-700' : getLevelTag(item) === 'Wilayah' ? 'bg-green-50 text-green-700' : getLevelTag(item) === 'Ranting' ? 'bg-orange-50 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>
                      {getLevelTag(item)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{item.periode.nama}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{item.parent ? `${item.parent.user.namaLengkap} (${item.parent.jabatan.nama})` : '-'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => { setEditData(item); setForm({ userId: item.userId, jabatanId: item.jabatanId, periodeId: item.periodeId, parentId: item.parentId || '' }); setShowModal(true); }} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700"><Edit3 size={14} className="text-gray-500" /></button>
                      <button onClick={() => handleDelete(item)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 size={14} className="text-red-500" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredData.length === 0 && <p className="text-center py-8 text-gray-400">Belum ada data kepengurusan</p>}
        </div>
      )}

      {/* Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editData ? 'Edit Pengurus' : 'Tambah Pengurus'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pengurus *</label>
            <select value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white">
              <option value="">Pilih pengurus</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.namaLengkap}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Jabatan *</label>
            <select value={form.jabatanId} onChange={(e) => setForm({ ...form, jabatanId: e.target.value })} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white">
              <option value="">Pilih jabatan</option>
              {jabatans.map((j) => <option key={j.id} value={j.id}>{j.nama}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Atasan (Parent)</label>
            <select value={form.parentId} onChange={(e) => setForm({ ...form, parentId: e.target.value })} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white">
              <option value="">Tidak ada (Root)</option>
              {data.filter((d) => d.id !== editData?.id).map((d) => (
                <option key={d.id} value={d.id}>{d.user.namaLengkap} — {d.jabatan.nama}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border rounded-lg">Batal</button>
            <button onClick={handleSave} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Simpan</button>
          </div>
        </div>
      </Modal>
    </PageContainer>
  );
}
