'use client';

import { useEffect, useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { Plus, Edit3, Trash2, RefreshCw, CheckCircle2, X } from 'lucide-react';
import PageContainer from '@/components/ui/page-container';
import PageHeader from '@/components/ui/page-header';
import Modal from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-modal';

type PeriodeLevel = 'nasional' | 'distrik' | 'wilayah' | 'ranting';

interface PeriodeAktifUnit {
  id: string;
  periodeId: string;
  level: string;
  unitId: string;
}

interface Periode {
  id: string;
  nama: string;
  tglMulai: string;
  tglSelesai: string;
  isActive: boolean;
  _count: { pengurus: number };
  aktifUnits: PeriodeAktifUnit[];
}

interface UnitOption {
  id: string;
  nama: string;
  kode?: string;
}

const LEVEL_OPTIONS: { value: PeriodeLevel; label: string }[] = [
  { value: 'nasional', label: 'Nasional' },
  { value: 'distrik', label: 'Distrik' },
  { value: 'wilayah', label: 'Wilayah' },
  { value: 'ranting', label: 'Ranting' },
];

export default function PeriodePage() {
  const toast = useToast();
  const { confirm, confirmModal } = useConfirm();
  const [data, setData] = useState<Periode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState<Periode | null>(null);
  const [form, setForm] = useState({ nama: '', tglMulai: '', tglSelesai: '', isActive: false });

  // ─── Per-unit activation state ─────────────────────────
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [unitForm, setUnitForm] = useState<{ level: PeriodeLevel; unitId: string; periodeId: string }>({
    level: 'nasional', unitId: '', periodeId: '',
  });
  const [unitOptions, setUnitOptions] = useState<UnitOption[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: res } = await apiClient.get('/periode');
      setData(res.data || []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // ─── Fetch units when level changes ──────────────────────
  const fetchUnits = useCallback(async (level: PeriodeLevel) => {
    setLoadingUnits(true);
    try {
      if (level === 'nasional') {
        const { data: res } = await apiClient.get('/org-structure/nasional');
        setUnitOptions(res.data || []);
      } else {
        const { data: res } = await apiClient.get(`/org-structure/${level}`);
        setUnitOptions(res.data || []);
      }
    } catch { setUnitOptions([]); }
    setLoadingUnits(false);
  }, []);

  useEffect(() => {
    if (showUnitModal) {
      setUnitForm((prev) => ({ ...prev, unitId: '' }));
      fetchUnits(unitForm.level);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showUnitModal, unitForm.level]);

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

  const handleToggleGlobal = async (item: Periode) => {
    try {
      await apiClient.patch(`/periode/${item.id}`, { isActive: !item.isActive });
      toast('success', `Periode ${item.nama} ${!item.isActive ? 'diaktifkan' : 'dinonaktifkan'} (global)`);
      fetchData();
    } catch (e: any) {
      toast('error', e?.response?.data?.message || 'Gagal update');
    }
  };

  const handleActivateUnit = async () => {
    if (!unitForm.periodeId) return toast('error', 'Pilih periode terlebih dahulu');
    if (!unitForm.unitId && unitForm.level !== 'nasional') return toast('error', 'Pilih unit terlebih dahulu');
    try {
      await apiClient.post(`/periode/${unitForm.periodeId}/activate-unit`, { level: unitForm.level, unitId: unitForm.unitId });
      toast('success', 'Periode aktif per unit berhasil disimpan');
      setShowUnitModal(false);
      fetchData();
    } catch (e: any) {
      toast('error', e?.response?.data?.message || 'Gagal mengaktifkan');
    }
  };

  const handleDeactivateUnit = async (level: string, unitId: string) => {
    const ok = await confirm({ title: 'Nonaktifkan periode untuk unit ini?', message: 'Unit akan kembali menggunakan periode global sebagai fallback.' });
    if (!ok) return;
    try {
      await apiClient.delete(`/periode/active-unit/${level}/${unitId}`);
      toast('success', 'Berhasil dinonaktifkan');
      fetchData();
    } catch (e: any) {
      toast('error', e?.response?.data?.message || 'Gagal menonaktifkan');
    }
  };

  const activeUnitRows = data
    .flatMap((p) => (p.aktifUnits || []).map((au) => ({ ...au, periodeNama: p.nama, levelLabel: LEVEL_OPTIONS.find((l) => l.value === au.level)?.label || au.level })))
    .sort((a, b) => a.level.localeCompare(b.level));

  return (
    <PageContainer>
      <PageHeader
        title="Periode Kepengurusan"
        subtitle="Kelola periode kepengurusan. Periode global aktif digunakan sebagai fallback bila unit belum punya periode aktif sendiri."
        onRefresh={fetchData}
        children={
          <div className="flex gap-2">
            <button
              onClick={() => { setUnitForm((prev) => ({ ...prev, periodeId: data.find((p) => p.isActive)?.id || data[0]?.id || '' })); setShowUnitModal(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
            >
              <Plus size={16} /> Atur Per Unit
            </button>
            <button
              onClick={() => { setEditData(null); setForm({ nama: '', tglMulai: '', tglSelesai: '', isActive: false }); setShowModal(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <Plus size={16} /> Tambah Periode
            </button>
          </div>
        }
      />

      {loading ? (
        <div className="flex justify-center py-20"><RefreshCw className="animate-spin text-gray-400" size={24} /></div>
      ) : (
        <div className="grid gap-4 mb-8">
          {data.map((item) => (
            <div key={item.id} className={`bg-white dark:bg-gray-800 rounded-xl border p-4 flex items-center justify-between ${item.isActive ? 'border-green-300 dark:border-green-700' : 'border-gray-200 dark:border-gray-700'}`}>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900 dark:text-white">{item.nama}</span>
                  {item.isActive && (
                    <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full flex items-center gap-1">
                      <CheckCircle2 size={10} /> Aktif (Global)
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  {new Date(item.tglMulai).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })} — {new Date(item.tglSelesai).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                  <span className="ml-2">• {item._count.pengurus} pengurus</span>
                  {(item.aktifUnits?.length || 0) > 0 && (
                    <span className="ml-2">• {item.aktifUnits.length} unit aktif</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => handleToggleGlobal(item)} className={`px-3 py-1.5 text-xs rounded-lg font-medium ${item.isActive ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                  {item.isActive ? 'Nonaktif Global' : 'Aktifkan Global'}
                </button>
                <button onClick={() => { setEditData(item); setForm({ nama: item.nama, tglMulai: item.tglMulai.split('T')[0], tglSelesai: item.tglSelesai.split('T')[0], isActive: item.isActive }); setShowModal(true); }} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700"><Edit3 size={14} className="text-gray-500" /></button>
                <button onClick={() => handleDelete(item)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 size={14} className="text-red-500" /></button>
              </div>
            </div>
          ))}
          {data.length === 0 && <p className="text-center py-8 text-gray-400">Belum ada periode</p>}
        </div>
      )}

      {/* ── Section: Periode Aktif per Unit ───────────── */}
      {!loading && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold dark:text-white mb-1">Periode Aktif per Unit</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Atur periode aktif untuk masing-masing level organisasi. Unit yang belum diatur akan menggunakan periode global.
          </p>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Level</th>
                  <th className="px-4 py-3 font-medium">Unit ID</th>
                  <th className="px-4 py-3 font-medium">Periode Aktif</th>
                  <th className="px-4 py-3 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-700">
                {activeUnitRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                      Belum ada periode aktif per unit. Semua unit menggunakan periode global (isActive).
                    </td>
                  </tr>
                ) : activeUnitRows.map((row) => (
                  <tr key={`${row.level}-${row.unitId}`} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-600 dark:text-gray-300">
                        {row.levelLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300 font-mono text-xs">{row.unitId}</td>
                    <td className="px-4 py-3 font-medium">{row.periodeNama}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleDeactivateUnit(row.level, row.unitId)} className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600" title="Nonaktifkan">
                        <X className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
            <label htmlFor="isActive" className="text-sm text-gray-700 dark:text-gray-300">Aktif Global (fallback jika unit belum punya periode aktif sendiri)</label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border rounded-lg">Batal</button>
            <button onClick={handleSave} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Simpan</button>
          </div>
        </div>
      </Modal>

      {/* ── Modal: Atur Per Unit ─────────────────────── */}
      <Modal open={showUnitModal} onClose={() => setShowUnitModal(false)} title="Atur Periode Aktif per Unit">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Level *</label>
            <select value={unitForm.level} onChange={(e) => setUnitForm({ ...unitForm, level: e.target.value as PeriodeLevel, unitId: '' })}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white">
              {LEVEL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          {unitForm.level !== 'nasional' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {LEVEL_OPTIONS.find((l) => l.value === unitForm.level)?.label} *
              </label>
              <select value={unitForm.unitId} onChange={(e) => setUnitForm({ ...unitForm, unitId: e.target.value })}
                disabled={loadingUnits}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:opacity-50">
                <option value="">{loadingUnits ? 'Memuat...' : `Pilih ${unitForm.level}`}</option>
                {unitOptions.map((u) => (
                  <option key={u.id} value={u.id}>{u.nama}{u.kode ? ` (${u.kode})` : ''}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Periode Aktif *</label>
            <select value={unitForm.periodeId} onChange={(e) => setUnitForm({ ...unitForm, periodeId: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white">
              <option value="">Pilih Periode</option>
              {data.map((p) => (
                <option key={p.id} value={p.id}>{p.nama} ({new Date(p.tglMulai).getFullYear()} – {new Date(p.tglSelesai).getFullYear()})</option>
              ))}
            </select>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-sm text-amber-700 dark:text-amber-400">
            ⚠️ Mengatur periode aktif untuk unit ini tidak akan mempengaruhi unit lain. Setiap unit bisa memiliki periode aktif yang berbeda.
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowUnitModal(false)} className="px-4 py-2 text-sm border rounded-lg">Batal</button>
            <button onClick={handleActivateUnit} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">Simpan</button>
          </div>
        </div>
      </Modal>
      {confirmModal}
    </PageContainer>
  );
}
