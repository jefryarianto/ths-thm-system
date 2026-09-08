'use client';

import { PermissionGuard } from '@/components/auth/permission-guard';
import { useConfirm } from '@/components/ui/confirm-modal';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import { Plus, PenLine, Edit3, Trash2, CheckCircle, XCircle, Eye, RefreshCw, Save, IdCard, AlertCircle, Globe, Upload, Stamp as StampIcon } from 'lucide-react';
import PageHeader from '@/components/ui/page-header';
import PageContainer from '@/components/ui/page-container';
import SummaryBar from '@/components/ui/summary-bar';
import Modal from '@/components/ui/modal';
import FormField from '@/components/ui/form-field';
import JabatanSelect from '@/components/ui/jabatan-select';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/hooks/use-auth';

interface PenandatanganRow {
  id: string;
  nama: string;
  jabatan: string;
  isActive: boolean;
  distrikId?: string | null;
  distrik?: { id: string; nama: string } | null;
  createdAt?: string;
  updatedAt?: string;
}

interface DistrictOption {
  id: string;
  nama: string;
  kodeDistrik?: string;
}

/** Gambar tanda tangan (tabel tanda_tangan) — punya cakupan distrik. */
interface TandaTanganRow {
  id: string;
  nama: string;
  jabatan: string;
  imagePath?: string | null;
  isActive: boolean;
  distrikId?: string | null;
  distrik?: { id: string; nama: string } | null;
}

/** Stempel (tabel stempel) — punya cakupan distrik. */
interface StampRow {
  id: string;
  nama: string;
  imagePath?: string | null;
  isActive: boolean;
  distrikId?: string | null;
  distrik?: { id: string; nama: string } | null;
}

export default function PenandatanganPage() {
  const { confirm, confirmModal } = useConfirm();
  const toast = useToast();
  const { role } = useAuth();
  const [data, setData] = useState<PenandatanganRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Cakupan: '' = Global (Nasional), selain itu id distrik
  const [districts, setDistricts] = useState<DistrictOption[]>([]);
  const [scope, setScope] = useState('');
  const [scopeName, setScopeName] = useState('');
  const isSuperadmin = role === 'superadmin';

  // Modal state (create / edit)
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<PenandatanganRow | null>(null);
  const [form, setForm] = useState({ nama: '', jabatan: '', isActive: false, distrikId: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Penandatangan per tipe dokumen (1-3 orang)
  const [docTypes, setDocTypes] = useState<
    {
      type: string;
      label: string;
      signers: { penandatanganId: string; nama: string; jabatan: string }[];
    }[]
  >([]);
  const [docSlots, setDocSlots] = useState<Record<string, string[]>>({});
  const [savingDoc, setSavingDoc] = useState<string | null>(null);

  // Gambar tanda tangan & stempel per scope (tabel tanda_tangan / stempel)
  const [ttdRows, setTtdRows] = useState<TandaTanganRow[]>([]);
  const [stampRows, setStampRows] = useState<StampRow[]>([]);

  // Upload Tanda Tangan modal
  const [showTtdModal, setShowTtdModal] = useState(false);
  const [ttdForm, setTtdForm] = useState({ nama: '', jabatan: '', file: null as File | null });
  const [savingTtd, setSavingTtd] = useState(false);
  const [ttdError, setTtdError] = useState('');

  // Upload Stempel modal
  const [showStampModal, setShowStampModal] = useState(false);
  const [stampForm, setStampForm] = useState({ nama: '', file: null as File | null });
  const [savingStamp, setSavingStamp] = useState(false);
  const [stampError, setStampError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await apiClient.get('/penandatangan');
      setData(res.data || []);
    } catch {
      // silent
    }
    setLoading(false);
  }, []);

  const fetchDistricts = useCallback(async () => {
    try {
      const { data: res } = await apiClient.get('/org-structure/distrik', { params: { limit: 200 } });
      const list = (res.data ?? res ?? []) as DistrictOption[];
      setDistricts(list);
    } catch {
      // silent
    }
  }, []);

  const fetchTtdStamps = useCallback(async () => {
    try {
      const [sigRes, stampRes] = await Promise.all([
        apiClient.get('/settings/signatures'),
        apiClient.get('/settings/stamps'),
      ]);
      setTtdRows((sigRes.data?.data || sigRes.data || []) as TandaTanganRow[]);
      setStampRows((stampRes.data?.data || stampRes.data || []) as StampRow[]);
    } catch {
      // silent
    }
  }, []);

  const fetchDocAssignments = useCallback(async () => {
    try {
      const { data: res } = await apiClient.get('/penandatangan/dokumen', {
        params: scope ? { distrikId: scope } : {},
      });
      const list = (res.data || []) as {
        type: string;
        label: string;
        signers: { penandatanganId: string; nama: string; jabatan: string }[];
      }[];
      setDocTypes(list);
      const slots: Record<string, string[]> = {};
      for (const t of list) {
        slots[t.type] = [
          t.signers[0]?.penandatanganId || '',
          t.signers[1]?.penandatanganId || '',
          t.signers[2]?.penandatanganId || '',
        ];
      }
      setDocSlots(slots);
    } catch {
      // silent
    }
  }, [scope]);

  // Fetch user scope on mount (auto-set for admin_distrik)
  useEffect(() => {
    if (!isSuperadmin && role) {
      apiClient.get('/auth/scope').then(({ data: res }) => {
        if (res?.distrikId) {
          setScope(res.distrikId);
          // Find the distrik name
          apiClient.get('/org-structure/distrik', { params: { limit: 200 } }).then(({ data: dRes }) => {
            const list = (dRes.data ?? dRes ?? []) as DistrictOption[];
            setDistricts(list);
            const match = list.find((d) => d.id === res.distrikId);
            setScopeName(match?.nama || 'Distrik');
          }).catch(() => {});
        }
      }).catch(() => {});
    } else {
      fetchDistricts();
    }
  }, [isSuperadmin, role, fetchDistricts]);

  useEffect(() => {
    fetchData();
    fetchTtdStamps();
  }, [fetchData, fetchTtdStamps]);

useEffect(() => {
  fetchDocAssignments();
}, [fetchDocAssignments]);

  const activeCount = data.filter((s) => s.isActive).length;

  /** Penandatengan yang boleh dipilih pada scope aktif (dropdown per dokumen). */
  const scopedData = scope
    ? data.filter((s) => (s.distrikId ?? null) === scope)
    : data.filter((s) => !s.distrikId);

  const scopeLabel = scope
    ? (isSuperadmin ? districts.find((d) => d.id === scope)?.nama || 'Distrik' : scopeName || 'Distrik')
    : 'Global (Nasional)';

  // Reset docSlots ketika scope berubah untuk mencegah data stale
  const prevScopeRef = useRef(scope);
  useEffect(() => {
    if (prevScopeRef.current !== scope) {
      // Filter docSlots yang tidak valid untuk scope baru
      setDocSlots((prev) => {
        const validIds = new Set(scopedData.map((s) => s.id));
        const filtered: Record<string, string[]> = {};
        Object.keys(prev).forEach((type) => {
          const validSlots = (prev[type] || [])
            .filter((id) => id !== '' && validIds.has(id))
            .slice(0, 3); // maks 3 slot
          // Pastikan array selalu panjang 3
          while (validSlots.length < 3) {
            validSlots.push('');
          }
          filtered[type] = validSlots;
        });
        return filtered;
      });
      prevScopeRef.current = scope;
    }
  }, [scope, scopedData]);

  // ─── Modal helpers ───

  const openCreate = () => {
    setEditing(null);
    setForm({ nama: '', jabatan: '', isActive: data.length === 0, distrikId: isSuperadmin ? scope : '' });
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (row: PenandatanganRow) => {
    setEditing(row);
    setForm({ nama: row.nama, jabatan: row.jabatan, isActive: row.isActive, distrikId: row.distrikId || '' });
    setFormError('');
    setShowModal(true);
  };

  const save = async () => {
    if (!form.nama.trim() || !form.jabatan.trim()) {
      setFormError('Nama dan jabatan harus diisi');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const payload = {
        nama: form.nama.trim(),
        jabatan: form.jabatan.trim(),
        isActive: form.isActive,
        // Untuk admin distrik: backend akan menentukan distrik otomatis dari session
        // Hanya superadmin yang dapat memilih scope global vs distrik melalui form
        distrikId: isSuperadmin ? (form.distrikId || null) : null,
      };
      if (editing) {
        await apiClient.patch(`/penandatangan/${editing.id}`, payload);
        toast('success', 'Penandatangan diperbarui');
      } else {
        await apiClient.post('/penandatangan', payload);
        toast('success', 'Penandatangan ditambahkan');
      }
      setShowModal(false);
      fetchData();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setFormError(msg || 'Gagal menyimpan penandatangan');
    }
    setSaving(false);
  };

  // ─── Row actions ───

  const toggleActive = async (row: PenandatanganRow) => {
    try {
      await apiClient.patch(`/penandatangan/${row.id}`, { isActive: !row.isActive });
      fetchData();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast('error', msg || 'Gagal mengubah status');
    }
  };

  const handleDelete = async (row: PenandatanganRow) => {
    if (!(await confirm(`Hapus penandatangan "${row.nama}"?`))) return;
    try {
      await apiClient.delete(`/penandatangan/${row.id}`);
      toast('success', 'Penandatangan dihapus');
      fetchData();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast('error', msg || 'Gagal menghapus penandatangan');
    }
  };

  const saveDocAssignment = async (type: string) => {
    const ids = (docSlots[type] || []).filter(Boolean);
    setSavingDoc(type);
    try {
      await apiClient.put(`/penandatangan/dokumen/${type}`, {
        penandatanganIds: ids,
        distrikId: scope || null,
      });
      toast('success', `Penandatangan dokumen disimpan (${scopeLabel})`);
      fetchDocAssignments();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast('error', msg || 'Gagal menyimpan penandatangan dokumen');
    }
    setSavingDoc(null);
  };

  // ─── Gambar Tanda Tangan & Stempel (per scope) ───

  /** Baris yang relevan untuk scope aktif (API sudah ter-scope; filter client sebagai jaring pengaman). */
  const scopedTtd = ttdRows.filter((s) => (s.distrikId ?? null) === (scope || null));
  const scopedStamps = stampRows.filter((s) => (s.distrikId ?? null) === (scope || null));

  const openTtdModal = () => {
    setTtdForm({ nama: '', jabatan: 'Koordinator Distrik', file: null });
    setTtdError('');
    setShowTtdModal(true);
  };

  const saveTtd = async () => {
    if (!ttdForm.file) {
      setTtdError('Pilih file gambar tanda tangan terlebih dahulu');
      return;
    }
    setSavingTtd(true);
    setTtdError('');
    try {
      // Raw fetch — apiClient memaksa Content-Type JSON yang merusak multipart.
      const fd = new FormData();
      fd.append('file', ttdForm.file);
      fd.append('nama', ttdForm.nama.trim());
      fd.append('jabatan', ttdForm.jabatan.trim());
      fd.append('distrikId', scope || '');
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/settings/signatures', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        setTtdError(data?.message || 'Gagal mengupload tanda tangan');
        return;
      }
      setShowTtdModal(false);
      toast('success', `Tanda tangan tersimpan (${scopeLabel})`);
      fetchTtdStamps();
    } catch {
      setTtdError('Gagal mengupload tanda tangan. Silakan coba lagi.');
    }
    setSavingTtd(false);
  };

  const deleteTtd = async (row: TandaTanganRow) => {
    if (!(await confirm(`Hapus gambar tanda tangan "${row.nama}"?`))) return;
    try {
      await apiClient.delete(`/settings/signatures/${row.id}`);
      toast('success', 'Tanda tangan dihapus');
      fetchTtdStamps();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast('error', msg || 'Gagal menghapus tanda tangan');
    }
  };

  const openStampModal = () => {
    setStampForm({ nama: '', file: null });
    setStampError('');
    setShowStampModal(true);
  };

  const saveStamp = async () => {
    if (!stampForm.file) {
      setStampError('Pilih file gambar stempel terlebih dahulu');
      return;
    }
    setSavingStamp(true);
    setStampError('');
    try {
      const fd = new FormData();
      fd.append('file', stampForm.file);
      fd.append('nama', stampForm.nama.trim() || `Stempel ${scopeLabel}`);
      fd.append('distrikId', scope || '');
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/settings/stamp', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        setStampError(data?.message || 'Gagal mengupload stempel');
        return;
      }
      setShowStampModal(false);
      toast('success', `Stempel tersimpan (${scopeLabel})`);
      fetchTtdStamps();
    } catch {
      setStampError('Gagal mengupload stempel. Silakan coba lagi.');
    }
    setSavingStamp(false);
  };

  const deleteStamp = async (row: StampRow) => {
    if (!(await confirm(`Hapus stempel "${row.nama}"?`))) return;
    try {
      await apiClient.delete(`/settings/stamp/${row.id}`);
      toast('success', 'Stempel dihapus');
      fetchTtdStamps();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast('error', msg || 'Gagal menghapus stempel');
    }
  };

  return (
    <PermissionGuard module="settings" action="view">
      <PageContainer>
        <PageHeader title="Penandatangan" onRefresh={fetchData}>
          <Link
            href="/settings"
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Kembali ke Settings
          </Link>
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors"
          >
            <Plus size={14} /> Tambah Penandatangan
          </button>
        </PageHeader>

        <SummaryBar icon={PenLine} label="Total Penandatangan" total={data.length} />

        {/* Info banner */}
        <div className="flex items-start gap-2.5 p-3.5 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-xl text-sm text-blue-700 dark:text-blue-400">
          <IdCard size={16} className="shrink-0 mt-0.5" />
          <p>
            Penandatangan dengan status <strong>Aktif</strong> dipakai sebagai bawaan pada dokumen
            (satu penandatangan aktif per distrik/global).
            Untuk menampilkan lebih dari satu penandatangan pada satu dokumen (mis. Koordinator
            Distrik + Pastor Moderator pada KTA), gunakan bagian <strong>Penandatangan per
            Dokumen</strong> (bawah) — di sana Anda bisa mengatur 1-3 penandatangan khusus untuk
            tiap jenis dokumen.
          </p>
        </div>

        {/* List */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-sm text-gray-400">
              <RefreshCw size={20} className="animate-spin mx-auto mb-2" />
              Memuat data...
            </div>
          ) : data.length === 0 ? (
            <div className="p-12 text-center">
              <PenLine size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Belum ada penandatangan</p>
              <button
                onClick={openCreate}
                className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition"
              >
                <Plus size={14} /> Tambah Penandatangan Pertama
              </button>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nama</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell">Jabatan</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">Cakupan</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {data.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900 dark:text-white">{row.nama}</span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-sm text-gray-600 dark:text-gray-400">{row.jabatan}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {row.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400">
                          <CheckCircle size={12} /> Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                          <XCircle size={12} /> Nonaktif
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          row.distrikId
                            ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {row.distrikId ? row.distrik?.nama || 'Distrik' : <><Globe size={10} /> Global</>}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => toggleActive(row)}
                          className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950 rounded-md transition-colors"
                          title={row.isActive ? 'Nonaktifkan' : 'Aktifkan (jadikan aktif)'}
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          onClick={() => openEdit(row)}
                          className="p-1.5 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950 rounded-md transition-colors"
                          title="Edit"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(row)}
                          className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-md transition-colors"
                          title="Hapus"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Small caption */}
        {!loading && data.length > 0 && (
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {activeCount > 0
              ? `${activeCount} penandatangan aktif - dipakai pada kartu anggota digital.`
              : 'Belum ada penandatangan aktif - kartu akan memakai fallback default.'}
          </p>
        )}

        {/* ─── Scope Distrik ─── */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
          <div className="flex items-start gap-2.5">
            <Globe size={16} className="shrink-0 mt-0.5 text-indigo-500" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Cakupan Penandatangan</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Atur penandatangan per <strong>distrik</strong> (setiap distrik bisa punya penandatangan &
                tanda tangan sendiri) atau <strong>global</strong>. Bila satu distrik tidak diatur, kartunya
                otomatis memakai penandatangan global.
              </p>
            </div>
          </div>
          {isSuperadmin ? (
            <div className="mt-4 max-w-md">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Sedang mengelola penandatangan untuk:
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
            <div className="mt-4 flex items-center gap-2">
              <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                {scopeLabel}
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                (ditentukan otomatis oleh sistem)
              </span>
            </div>
          )}
        </div>

        {/* ─── Gambar Tanda Tangan (per scope) ─── */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                Gambar Tanda Tangan — {scopeLabel}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Upload gambar tanda tangan untuk distrik ini. Gambar aktif dipakai pada kartu
                anggota & dokumen distrik; bila kosong, otomatis memakai tanda tangan global.
              </p>
            </div>
            <button
              onClick={openTtdModal}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
            >
              <Upload size={14} /> Upload Tanda Tangan
            </button>
          </div>
          {scopedTtd.length === 0 ? (
            <p className="text-sm text-gray-400 py-4">
              Belum ada gambar tanda tangan pada scope ini — dokumen memakai tanda tangan global.
            </p>
          ) : (
            <div className="mt-4 space-y-2">
              {scopedTtd.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-3 py-2.5 border-b border-gray-100 dark:border-gray-700/50 last:border-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {s.imagePath ? (
                      <img
                        src={`/api/uploads/${encodeURIComponent(s.imagePath)}`}
                        alt={s.nama}
                        className="w-16 h-10 object-contain bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600"
                      />
                    ) : (
                      <div className="w-16 h-10 rounded border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 flex items-center justify-center">
                        <PenLine size={14} className="text-gray-400" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{s.nama}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{s.jabatan}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {s.isActive ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400">
                        <CheckCircle size={12} /> Aktif
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                        <XCircle size={12} /> Nonaktif
                      </span>
                    )}
                    {!isSuperadmin || s.distrikId ? (
                      <button
                        onClick={() => deleteTtd(s)}
                        className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-md transition-colors"
                        title="Hapus"
                      >
                        <Trash2 size={14} />
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ─── Stempel (per scope) ─── */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                Stempel — {scopeLabel}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Upload stempel distrik. Stempel aktif dipakai bersama tanda tangan pada kartu &
                dokumen; bila kosong, otomatis memakai stempel global.
              </p>
            </div>
            <button
              onClick={openStampModal}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
            >
              <Upload size={14} /> Upload Stempel
            </button>
          </div>
          {scopedStamps.length === 0 ? (
            <p className="text-sm text-gray-400 py-4">
              Belum ada stempel pada scope ini — dokumen memakai stempel global.
            </p>
          ) : (
            <div className="mt-4 space-y-2">
              {scopedStamps.map((st) => (
                <div
                  key={st.id}
                  className="flex items-center justify-between gap-3 py-2.5 border-b border-gray-100 dark:border-gray-700/50 last:border-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {st.imagePath ? (
                      <img
                        src={`/api/uploads/${encodeURIComponent(st.imagePath)}`}
                        alt={st.nama}
                        className="w-16 h-10 object-contain bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600"
                      />
                    ) : (
                      <div className="w-16 h-10 rounded border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 flex items-center justify-center">
                        <StampIcon size={14} className="text-gray-400" />
                      </div>
                    )}
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{st.nama}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {st.isActive ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400">
                        <CheckCircle size={12} /> Aktif
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                        <XCircle size={12} /> Nonaktif
                      </span>
                    )}
                    {!isSuperadmin || st.distrikId ? (
                      <button
                        onClick={() => deleteStamp(st)}
                        className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-md transition-colors"
                        title="Hapus"
                      >
                        <Trash2 size={14} />
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ─── Penandatangan per Dokumen (1-3) ─── */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              Penandatangan per Dokumen — {scopeLabel}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Atur 1-3 penandatangan yang tampil di tiap jenis dokumen - urutan slot = posisi tanda
              tangan. Kosongkan semua slot untuk memakai penandatangan aktif sebagai bawaan.
            </p>
          </div>

          {docTypes.length === 0 ? (
            <p className="text-sm text-gray-400 py-4">Memuat penugasan...</p>
          ) : (
            <div className="space-y-4">
              {docTypes.map((t) => (
                <div
                  key={t.type}
                  className="border border-gray-200 dark:border-gray-700 rounded-xl p-4"
                >
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">{t.label}</h4>
                    <button
                      onClick={() => saveDocAssignment(t.type)}
                      disabled={savingDoc === t.type}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Save size={13} />
                      {savingDoc === t.type ? 'Menyimpan...' : 'Simpan'}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                    {[0, 1, 2].map((i) => (
                      <div key={i}>
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                          Tanda tangan {i + 1}
                        </label>
                        <select
                          value={docSlots[t.type]?.[i] || ''}
                          onChange={(e) =>
                            setDocSlots((prev) => {
                              const cur = [...(prev[t.type] || ['', '', ''])];
                              cur[i] = e.target.value;
                              return { ...prev, [t.type]: cur };
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">- Kosong -</option>
                          {scopedData.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.nama} ({s.jabatan})
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                  {t.signers.length > 0 && (
                    <p className="text-xs text-gray-400 mt-2">
                      Saat ini: {t.signers.map((s) => s.nama).join(', ')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ─── Create / Edit Modal ─── */}
        <Modal
          open={showModal}
          onClose={() => setShowModal(false)}
          title={editing ? 'Edit Penandatangan' : 'Tambah Penandatangan'}
        >
          <div className="space-y-4">
            <FormField label="Nama Lengkap" required>
              <input
                type="text"
                value={form.nama}
                onChange={(e) => setForm((p) => ({ ...p, nama: e.target.value }))}
                placeholder="Contoh: Yoseph Pehan Betan"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </FormField>
            <FormField label="Jabatan" required>
              <JabatanSelect value={form.jabatan} onChange={(v) => setForm((p) => ({ ...p, jabatan: v }))} />
            </FormField>
            <FormField label="Cakupan">
              {isSuperadmin ? (
                <select
                  value={form.distrikId}
                  onChange={(e) => setForm((p) => ({ ...p, distrikId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">Global (Nasional)</option>
                  {districts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nama}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm text-gray-500 dark:text-gray-400">
                  Distrik Anda (ditentukan otomatis)
                </div>
              )}
              <p className="text-xs text-gray-400 mt-1">
                Penandatangan global dipakai sebagai <em>fallback</em> bila distrik belum punya penandatangan aktif.
              </p>
            </FormField>
            <FormField label="Status">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-gray-700 dark:text-gray-300">
                  Aktifkan sebagai penandatangan kartu
                </span>
              </label>
              {form.isActive && (
                <p className="flex items-center gap-1.5 mt-2 text-xs text-blue-600 dark:text-blue-400">
                  <AlertCircle size={13} />
                  Lebih dari satu penandatangan boleh aktif bersamaan dalam satu distrik.
                </p>
              )}
            </FormField>
            {formError && <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Batal
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Save size={14} />{' '}
                {saving ? 'Menyimpan...' : editing ? 'Simpan' : 'Tambah'}
              </button>
            </div>
          </div>
        </Modal>
        {/* ─── Upload Tanda Tangan Modal ─── */}
        <Modal
          open={showTtdModal}
          onClose={() => setShowTtdModal(false)}
          title={`Upload Tanda Tangan — ${scopeLabel}`}
        >
          <div className="space-y-4">
            <FormField label="Nama" required>
              <input
                type="text"
                value={ttdForm.nama}
                onChange={(e) => setTtdForm((p) => ({ ...p, nama: e.target.value }))}
                placeholder="Contoh: Yoseph Pehan Betan"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </FormField>
            <FormField label="Jabatan" required>
              <JabatanSelect value={ttdForm.jabatan} onChange={(v) => setTtdForm((p) => ({ ...p, jabatan: v }))} />
            </FormField>
            <FormField label="File Gambar" required>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => setTtdForm((p) => ({ ...p, file: e.target.files?.[0] || null }))}
                className="w-full text-sm text-gray-700 dark:text-gray-300 file:mr-3 file:px-3 file:py-1.5 file:rounded-md file:border-0 file:bg-blue-50 dark:file:bg-blue-950 file:text-blue-700 dark:file:text-blue-300 file:text-sm hover:file:bg-blue-100"
              />
            </FormField>
            {ttdError && <p className="text-sm text-red-600 dark:text-red-400">{ttdError}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowTtdModal(false)}
                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Batal
              </button>
              <button
                onClick={saveTtd}
                disabled={savingTtd}
                className="flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Upload size={14} /> {savingTtd ? 'Mengunggah...' : 'Upload'}
              </button>
            </div>
          </div>
        </Modal>

        {/* ─── Upload Stempel Modal ─── */}
        <Modal
          open={showStampModal}
          onClose={() => setShowStampModal(false)}
          title={`Upload Stempel — ${scopeLabel}`}
        >
          <div className="space-y-4">
            <FormField label="Nama Stempel">
              <input
                type="text"
                value={stampForm.nama}
                onChange={(e) => setStampForm((p) => ({ ...p, nama: e.target.value }))}
                placeholder={`Stempel ${scopeLabel}`}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </FormField>
            <FormField label="File Gambar" required>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => setStampForm((p) => ({ ...p, file: e.target.files?.[0] || null }))}
                className="w-full text-sm text-gray-700 dark:text-gray-300 file:mr-3 file:px-3 file:py-1.5 file:rounded-md file:border-0 file:bg-blue-50 dark:file:bg-blue-950 file:text-blue-700 dark:file:text-blue-300 file:text-sm hover:file:bg-blue-100"
              />
            </FormField>
            {stampError && <p className="text-sm text-red-600 dark:text-red-400">{stampError}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowStampModal(false)}
                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Batal
              </button>
              <button
                onClick={saveStamp}
                disabled={savingStamp}
                className="flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Upload size={14} /> {savingStamp ? 'Mengunggah...' : 'Upload'}
              </button>
            </div>
          </div>
        </Modal>
        {confirmModal}
      </PageContainer>
    </PermissionGuard>
  );
}
