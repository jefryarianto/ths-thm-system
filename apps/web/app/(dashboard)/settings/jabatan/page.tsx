'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { Plus, Edit3, Trash2, RefreshCw } from 'lucide-react';
import PageContainer from '@/components/ui/page-container';
import PageHeader from '@/components/ui/page-header';
import Modal from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-modal';
import { useAuth } from '@/hooks/use-auth';
import { invalidateJabatanCache } from '@/components/ui/jabatan-select';

interface Jabatan {
  id: string;
  nama: string;
  kode: string | null;
  urutan: number;
  distrikId: string | null;
  distrik?: { id: string; nama: string } | null;
  _count: { pengurus: number };
}

interface DistrictOption {
  id: string;
  nama: string;
}

/**
 * Pengelolaan preset jabatan (dipakai dropdown JabatanSelect di form
 * penandatangan/tanda tangan/struktur organisasi).
 * Superadmin: mengelola Global (nasional) + semua distrik (via pemilih cakupan).
 * admin_distrik: otomatis terkunci ke distriknya sendiri.
 */
export default function JabatanPage() {
  const toast = useToast();
  const { confirm, confirmModal } = useConfirm();
  const { user } = useAuth();
  const role = user?.role;
  const isSuperadmin = role === 'superadmin';

  const [data, setData] = useState<Jabatan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState<Jabatan | null>(null);
  const [form, setForm] = useState({ nama: '', kode: '', urutan: 0 });

  // Cakupan: '' = Global (Nasional), selain itu id distrik.
  const [districts, setDistricts] = useState<DistrictOption[]>([]);
  const [scope, setScope] = useState('');
  const scopeName = scope === '' ? 'Global (Nasional)' : districts.find((d) => d.id === scope)?.nama || scope;
  const isGlobalScope = scope === '';

  // Untuk admin_distrik: scope terkunci ke distriknya — ambil dari /auth/scope.
  useEffect(() => {
    if (isSuperadmin) return;
    apiClient
      .get('/auth/scope')
      .then(({ data: res }) => {
        const distrikId = res?.data?.distrikId as string | null | undefined;
        if (distrikId) setScope(distrikId);
        if (res?.data?.distrikNama) setDistricts([{ id: distrikId as string, nama: res.data.distrikNama }]);
      })
      .catch(() => {
        /* silent — service sudah membatasi hasil berdasarkan scope server-side */
      });
  }, [isSuperadmin]);

  // Daftar distrik untuk pemilih cakupan (superadmin saja).
  useEffect(() => {
    if (!isSuperadmin) return;
    apiClient
      .get('/org-structure/distrik')
      .then(({ data: res }) => setDistricts(res?.data ?? []))
      .catch(() => {
        /* silent */
      });
  }, [isSuperadmin]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: res } = await apiClient.get('/jabatan');
      setData(res.data || []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = isSuperadmin ? data.filter((j) => (j.distrikId ?? null) === (scope || null)) : data;

  const handleSave = async () => {
    if (!form.nama.trim()) return toast('error', 'Nama wajib diisi');
    try {
      const payload: Record<string, unknown> = { nama: form.nama.trim(), kode: form.kode.trim() || undefined, urutan: form.urutan };
      if (isSuperadmin) payload.distrikId = scope || null;
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
      invalidateJabatanCache();
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
      invalidateJabatanCache();
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

      {/* Cakupan preset */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-4">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Cakupan Jabatan</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {isGlobalScope
                ? 'Preset global dipakai semua distrik sebagai pilihan bawaan.'
                : `Preset ${scopeName} dipakai distrik ini dan menggantikan preset global yang bernama sama.`}{' '}
              Kelola preset di sini, lalu pilih di dropdown jabatan pada form penandatangan & struktur organisasi.
            </p>
          </div>
        </div>
        {isSuperadmin ? (
          <div className="mt-3 max-w-md">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Sedang mengelola jabatan untuk:
            </label>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Global (Nasional)</option>
              {districts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nama}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">{scopeName}</span>
            <span className="text-xs text-gray-400">(otomatis mengikuti distrik Anda)</span>
          </div>
        )}
      </div>

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
                {isSuperadmin && <th className="text-left px-4 py-3 font-medium text-gray-500">Cakupan</th>}
                <th className="text-left px-4 py-3 font-medium text-gray-500">Pengurus</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-4 py-3 text-gray-400">{item.urutan}</td>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{item.nama}</td>
                  <td className="px-4 py-3 text-gray-500">{item.kode || '-'}</td>
                  {isSuperadmin && (
                    <td className="px-4 py-3 text-gray-500">
                      {item.distrikId ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400">
                          {item.distrik?.nama || 'Distrik'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                          Global
                        </span>
                      )}
                    </td>
                  )}
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
          {filtered.length === 0 && (
            <p className="text-center py-8 text-gray-400">
              Belum ada jabatan {isGlobalScope ? 'global' : `untuk ${scopeName}`}
            </p>
          )}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editData ? 'Edit Jabatan' : 'Tambah Jabatan'}>
        <div className="space-y-4">
          {isSuperadmin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cakupan</label>
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">Global (Nasional)</option>
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>{d.nama}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                Preset distrik menggantikan preset global yang bernama sama untuk distrik tersebut.
              </p>
            </div>
          )}
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
