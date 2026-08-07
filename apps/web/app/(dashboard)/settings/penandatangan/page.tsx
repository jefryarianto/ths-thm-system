'use client';

import { PermissionGuard } from '@/components/auth/permission-guard';
import { useConfirm } from '@/components/ui/confirm-modal';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import { Plus, PenLine, Edit3, Trash2, CheckCircle, XCircle, Eye, RefreshCw, Save, IdCard, AlertCircle } from 'lucide-react';
import PageHeader from '@/components/ui/page-header';
import PageContainer from '@/components/ui/page-container';
import SummaryBar from '@/components/ui/summary-bar';
import Modal from '@/components/ui/modal';
import FormField from '@/components/ui/form-field';
import { useToast } from '@/components/ui/toast';

interface PenandatanganRow {
  id: string;
  nama: string;
  jabatan: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export default function PenandatanganPage() {
  const { confirm, confirmModal } = useConfirm();
  const toast = useToast();
  const [data, setData] = useState<PenandatanganRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state (create / edit)
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<PenandatanganRow | null>(null);
  const [form, setForm] = useState({ nama: '', jabatan: '', isActive: false });
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

  const fetchDocAssignments = useCallback(async () => {
    try {
      const { data: res } = await apiClient.get('/penandatangan/dokumen');
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
  }, []);

  useEffect(() => {
    fetchData();
    fetchDocAssignments();
  }, [fetchData, fetchDocAssignments]);

  const activeCount = data.filter((s) => s.isActive).length;

  // ─── Modal helpers ───

  const openCreate = () => {
    setEditing(null);
    setForm({ nama: '', jabatan: '', isActive: data.length === 0 });
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (row: PenandatanganRow) => {
    setEditing(row);
    setForm({ nama: row.nama, jabatan: row.jabatan, isActive: row.isActive });
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
      const payload = { nama: form.nama.trim(), jabatan: form.jabatan.trim(), isActive: form.isActive };
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
      await apiClient.put(`/penandatangan/dokumen/${type}`, { penandatanganIds: ids });
      toast('success', 'Penandatangan dokumen disimpan');
      fetchDocAssignments();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast('error', msg || 'Gagal menyimpan penandatangan dokumen');
    }
    setSavingDoc(null);
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
            Penandatangan dengan status <strong>Aktif</strong> dipakai sebagai bawaan pada dokumen.
            Di bagian <strong>Penandatangan per Dokumen</strong> (bawah), Anda bisa mengatur 1-3
            penandatangan khusus untuk tiap jenis dokumen (mis. moderator + koordinator distrik pada
            KTA, atau koordinator distrik + ketua panitia pada piagam).
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
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {data.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
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
              ? `${activeCount} penandatangan aktif — dipakai pada kartu anggota digital.`
              : 'Belum ada penandatangan aktif — kartu akan memakai fallback default.'}
          </p>
        )}

        {/* ─── Penandatangan per Dokumen (1-3) ─── */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              Penandatangan per Dokumen
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Atur 1-3 penandatangan yang tampil di tiap jenis dokumen — urutan slot = posisi tanda
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
                          <option value="">— Kosong —</option>
                          {data.map((s) => (
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
              <input
                type="text"
                value={form.jabatan}
                onChange={(e) => setForm((p) => ({ ...p, jabatan: e.target.value }))}
                placeholder="Contoh: Koordinator Distrik"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
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
                <p className="flex items-center gap-1.5 mt-2 text-xs text-amber-600 dark:text-amber-400">
                  <AlertCircle size={13} />
                  Penandatangan aktif lainnya akan dinonaktifkan otomatis.
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
        {confirmModal}
      </PageContainer>
    </PermissionGuard>
  );
}
