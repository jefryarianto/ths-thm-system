'use client';

import { PermissionGuard } from '@/components/auth/permission-guard';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';
import FormField from '@/components/ui/form-field';

import Breadcrumbs from '@/components/ui/breadcrumbs';

interface ActivityDetail {
  id: string;
  nama: string;
  tipe: string;
  lokasi: string | null;
  tanggalMulai: string;
  tanggalSelesai: string | null;
  status: string;
  scopeType: string;
  scopeId: string | null;
}

export default function EditActivityPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fetchError, setFetchError] = useState('');

  const [form, setForm] = useState({
    nama: '',
    tipe: 'latihan',
    lokasi: '',
    tanggalMulai: '',
    tanggalSelesai: '',
    status: 'direncanakan',
  });

  // ── Load activity data ────────────────────────────
  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        const { data: res } = await apiClient.get(`/activities/${id}`);
        const a: ActivityDetail = res.data;
        setForm({
          nama: a.nama,
          tipe: a.tipe,
          lokasi: a.lokasi || '',
          tanggalMulai: a.tanggalMulai ? a.tanggalMulai.split('T')[0] : '',
          tanggalSelesai: a.tanggalSelesai ? a.tanggalSelesai.split('T')[0] : '',
          status: a.status,
        });
      } catch {
        setFetchError('Gagal memuat data kegiatan');
      }
      setLoading(false);
    })();
  }, [id]);

  // ── Submit ────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama) { setError('Nama kegiatan harus diisi'); return; }
    if (!form.tanggalMulai) { setError('Tanggal mulai harus diisi'); return; }

    setSaving(true);
    setError('');
    try {
      const { data: orig } = await apiClient.get(`/activities/${id}`);
      const original: ActivityDetail = orig.data;
      const payload: Record<string, unknown> = {};

      if (form.nama !== original.nama) payload.nama = form.nama;
      if (form.tipe !== original.tipe) payload.tipe = form.tipe;
      if (form.lokasi !== (original.lokasi || '')) payload.lokasi = form.lokasi;
      if (form.tanggalMulai !== (original.tanggalMulai?.split('T')[0] || '')) payload.tanggalMulai = form.tanggalMulai;
      if (form.tanggalSelesai !== (original.tanggalSelesai?.split('T')[0] || '')) payload.tanggalSelesai = form.tanggalSelesai || undefined;
      if (form.status !== original.status) payload.status = form.status;

      if (Object.keys(payload).length === 0) {
        setError('Tidak ada perubahan yang dilakukan');
        setSaving(false);
        return;
      }

      await apiClient.patch(`/activities/${id}`, payload);
      router.push(`/activities/${id}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Gagal menyimpan perubahan');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-pulse">
        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-36" />
        <div className="bg-white dark:bg-gray-800 rounded-2xl border p-6 space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48" />
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center max-w-md">
          <AlertCircle size={40} className="mx-auto text-red-400 mb-3" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Gagal Memuat Data</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{fetchError}</p>
          <button onClick={() => router.push('/activities')} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
            ← Kembali ke Kegiatan
          </button>
        </div>
      </div>
    );
  }

  return (
      <PermissionGuard module="activities" action="edit">
        <Breadcrumbs />
        <div className="max-w-2xl mx-auto space-y-6">
              {/* Header */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.push(`/activities/${id}`)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <ArrowLeft size={20} className="text-gray-500" />
                </button>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Edit Kegiatan
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    {form.nama || 'Memuat...'}
                  </p>
                </div>
              </div>
        
              {/* Error */}
              {error && (
                <div className="flex items-center gap-2.5 p-3.5 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
                  <AlertCircle size={16} className="shrink-0" />
                  {error}
                </div>
              )}
        
              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 space-y-5">
                  <FormField label="Nama Kegiatan" required>
                    <input
                      type="text"
                      value={form.nama}
                      onChange={(e) => setForm({ ...form, nama: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition"
                    />
                  </FormField>
        
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField label="Tipe">
                      <select
                        value={form.tipe}
                        onChange={(e) => setForm({ ...form, tipe: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition"
                      >
                        <option value="latihan">Latihan</option>
                        <option value="pendadaran">Pendadaran</option>
                        <option value="ujian_tingkat">Ujian Tingkat</option>
                        <option value="rapat">Rapat</option>
                        <option value="retret">Retret</option>
                        <option value="pelantikan">Pelantikan</option>
                        <option value="lainnya">Lainnya</option>
                      </select>
                    </FormField>
                    <FormField label="Status">
                      <select
                        value={form.status}
                        onChange={(e) => setForm({ ...form, status: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition"
                      >
                        <option value="direncanakan">Direncanakan</option>
                        <option value="berlangsung">Berlangsung</option>
                        <option value="selesai">Selesai</option>
                        <option value="dibatalkan">Dibatalkan</option>
                      </select>
                    </FormField>
                  </div>
        
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField label="Tanggal Mulai" required>
                      <input
                        type="date"
                        value={form.tanggalMulai}
                        onChange={(e) => setForm({ ...form, tanggalMulai: e.target.value })}
                        required
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition"
                      />
                    </FormField>
                    <FormField label="Tanggal Selesai">
                      <input
                        type="date"
                        value={form.tanggalSelesai}
                        onChange={(e) => setForm({ ...form, tanggalSelesai: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition"
                      />
                    </FormField>
                  </div>
        
                  <FormField label="Lokasi">
                    <input
                      type="text"
                      value={form.lokasi}
                      onChange={(e) => setForm({ ...form, lokasi: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition"
                    />
                  </FormField>
                </div>
        
                {/* Actions */}
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => router.push(`/activities/${id}`)}
                    className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                  >
                    <Save size={16} />
                    {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </button>
                </div>
              </form>
            </div>
      </PermissionGuard>
    );
}
