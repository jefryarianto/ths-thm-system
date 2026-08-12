'use client';

import { PermissionGuard } from '@/components/auth/permission-guard';
import { useConfirm } from '@/components/ui/confirm-modal';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import { Plus, Edit3, Trash2, RefreshCw, Save, Layers, ArrowUp, ArrowDown } from 'lucide-react';
import PageHeader from '@/components/ui/page-header';
import PageContainer from '@/components/ui/page-container';
import SummaryBar from '@/components/ui/summary-bar';
import Modal from '@/components/ui/modal';
import FormField from '@/components/ui/form-field';
import { useToast } from '@/components/ui/toast';

interface TingkatanRow {
  id: string;
  nama: string;
  stripCount: number;
  stripWarna: string;
  urutan: number;
}

const STRIP_COLORS = [
  { value: '#1d4ed8', label: 'Biru' },
  { value: '#ca8a04', label: 'Kuning' },
  { value: '#b91c1c', label: 'Merah' },
  { value: '#15803d', label: 'Hijau' },
  { value: '#1e293b', label: 'Hitam' },
  { value: '#94a3b8', label: 'Abu-abu' },
];

export default function TingkatanPage() {
  const { confirm, confirmModal } = useConfirm();
  const toast = useToast();
  const [data, setData] = useState<TingkatanRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<TingkatanRow | null>(null);
  const [form, setForm] = useState({ nama: '', stripCount: 1, stripWarna: '#1d4ed8' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await apiClient.get('/tingkatan');
      setData(res.data || []);
    } catch {
      // silent
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Modal helpers ───

  const openCreate = () => {
    setEditing(null);
    setForm({ nama: '', stripCount: 1, stripWarna: '#1d4ed8' });
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (row: TingkatanRow) => {
    setEditing(row);
    setForm({ nama: row.nama, stripCount: row.stripCount, stripWarna: row.stripWarna });
    setFormError('');
    setShowModal(true);
  };

  const save = async () => {
    if (!form.nama.trim()) {
      setFormError('Nama tingkatan harus diisi');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const payload = {
        nama: form.nama.trim(),
        stripCount: Number(form.stripCount),
        stripWarna: form.stripWarna,
      };
      if (editing) {
        await apiClient.patch(`/tingkatan/${editing.id}`, payload);
        toast('success', 'Tingkatan diperbarui');
      } else {
        await apiClient.post('/tingkatan', payload);
        toast('success', 'Tingkatan ditambahkan');
      }
      setShowModal(false);
      fetchData();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setFormError(msg || 'Gagal menyimpan tingkatan');
    }
    setSaving(false);
  };

  // ─── Row actions ───

  const handleDelete = async (row: TingkatanRow) => {
    if (!(await confirm(`Hapus tingkatan "${row.nama}"? Anggota dengan tingkat ini akan tampil tanpa strip.`))) return;
    try {
      await apiClient.delete(`/tingkatan/${row.id}`);
      toast('success', 'Tingkatan dihapus');
      fetchData();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast('error', msg || 'Gagal menghapus tingkatan');
    }
  };

  const move = async (row: TingkatanRow, dir: -1 | 1) => {
    const idx = data.findIndex((d) => d.id === row.id);
    const target = data[idx + dir];
    if (!target) return;
    try {
      await apiClient.patch(`/tingkatan/${row.id}`, { urutan: target.urutan });
      await apiClient.patch(`/tingkatan/${target.id}`, { urutan: row.urutan });
      toast('success', 'Urutan diperbarui');
      fetchData();
    } catch {
      toast('error', 'Gagal mengubah urutan');
    }
  };

  return (
    <PermissionGuard module="settings" action="view">
      <PageContainer>
        <PageHeader title="Tingkatan" onRefresh={fetchData}>
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
            <Plus size={14} /> Tambah Tingkatan
          </button>
        </PageHeader>

        <SummaryBar icon={Layers} label="Total Tingkatan" total={data.length} />

        {/* Info banner */}
        <div className="flex items-start gap-2.5 p-3.5 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-xl text-sm text-blue-700 dark:text-blue-400">
          <Layers size={16} className="shrink-0 mt-0.5" />
          <p>
            Pengaturan ini menentukan <strong>strip/balok warna di bawah foto</strong> pada kartu
            anggota (KTA). <strong>Jumlah strip</strong> = banyaknya balok (0 = tanpa strip, mis.
            tingkat Anggota), <strong>warna</strong> = warna balok (Pratama/Tamtama biru,
            Muda/Madya/Utama kuning). Perubahan langsung diterapkan di kartu digital, PDF, dan PNG.
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
              <Layers size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Belum ada tingkatan</p>
              <button
                onClick={openCreate}
                className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition"
              >
                <Plus size={14} /> Tambah Tingkatan Pertama
              </button>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-16">No</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nama Tingkatan</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Strip</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pratinjau</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {data.map((row, i) => (
                  <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{i + 1}</td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900 dark:text-white">{row.nama}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {row.stripCount === 0 ? (
                          <span className="text-gray-400">Tanpa strip</span>
                        ) : (
                          `${STRIP_COLORS.find((c) => c.value === row.stripWarna)?.label || row.stripWarna} ${row.stripCount}`
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-[4px]" style={{ width: 120 }}>
                        {Array.from({ length: row.stripCount }).map((_, s) => (
                          <div
                            key={s}
                            className="h-[10px] w-full rounded-sm border border-black/25"
                            style={{ backgroundColor: row.stripWarna }}
                          />
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => move(row, -1)}
                          disabled={i === 0}
                          className="p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors disabled:opacity-30"
                          title="Naikkan urutan"
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          onClick={() => move(row, 1)}
                          disabled={i === data.length - 1}
                          className="p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors disabled:opacity-30"
                          title="Turunkan urutan"
                        >
                          <ArrowDown size={14} />
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

        {/* ─── Create / Edit Modal ─── */}
        <Modal
          open={showModal}
          onClose={() => setShowModal(false)}
          title={editing ? 'Edit Tingkatan' : 'Tambah Tingkatan'}
        >
          <div className="space-y-4">
            <FormField label="Nama Tingkatan" required>
              <input
                type="text"
                value={form.nama}
                onChange={(e) => setForm((p) => ({ ...p, nama: e.target.value }))}
                placeholder="Contoh: Muda"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </FormField>
            <FormField label="Jumlah Strip (balok)">
              <select
                value={form.stripCount}
                onChange={(e) => setForm((p) => ({ ...p, stripCount: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value={0}>0 — Tanpa strip</option>
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
              </select>
            </FormField>
            <FormField label="Warna Strip">
              <div className="flex flex-wrap gap-2">
                {STRIP_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, stripWarna: c.value }))}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition ${
                      form.stripWarna === c.value
                        ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-900'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    <span className="w-3.5 h-3.5 rounded-sm border border-black/20" style={{ backgroundColor: c.value }} />
                    {c.label}
                  </button>
                ))}
              </div>
            </FormField>
            {form.stripCount > 0 && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Pratinjau:</p>
                <div className="flex flex-col gap-[4px] border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-900" style={{ width: 120 }}>
                  {Array.from({ length: form.stripCount }).map((_, s) => (
                    <div
                      key={s}
                      className="h-[10px] w-full rounded-sm border border-black/25"
                      style={{ backgroundColor: form.stripWarna }}
                    />
                  ))}
                </div>
              </div>
            )}
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
