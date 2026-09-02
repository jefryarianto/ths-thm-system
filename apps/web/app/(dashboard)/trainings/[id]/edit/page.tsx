'use client';

import { PermissionGuard } from '@/components/auth/permission-guard';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';
import FormField from '@/components/ui/form-field';
import MateriMultiSelect, { MateriItem } from '@/components/trainings/materi-select';

import Breadcrumbs from '@/components/ui/breadcrumbs';

interface MateriLatihan {
  id: string;
  kategori: string;
  detail: string;
}

interface TrainingDetail {
  id: string;
  hariTanggal: string;
  lokasi: string | null;
  jenisMateri: string | null;
  hasilLatihanGlobal: string | null;
  rekomendasiLatihanBerikutnya: string | null;
  rantingId: string;
  pelatihId: string | null;
  ranting?: { id: string; nama: string };
  materi?: MateriLatihan[];
}

export default function EditTrainingPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fetchError, setFetchError] = useState('');

  const [hariTanggal, setHariTanggal] = useState('');
  const [lokasi, setLokasi] = useState('');
  const [materi, setMateri] = useState<MateriItem[]>([]);

  // ── Load training data ────────────────────────────
  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        const { data: res } = await apiClient.get(`/trainings/${id}`);
        const t: TrainingDetail = res.data;

        // Format datetime-local value
        const d = new Date(t.hariTanggal);
        const pad = (n: number) => String(n).padStart(2, '0');
        setHariTanggal(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
        setLokasi(t.lokasi || '');
        // Load existing materi from API
        if (t.materi && t.materi.length > 0) {
          setMateri(t.materi.map((m) => ({ kategori: m.kategori, detail: m.detail || '' })));
        }
      } catch {
        setFetchError('Gagal memuat data latihan');
      }
      setLoading(false);
    })();
  }, [id]);

  // ── Submit ────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hariTanggal) { setError('Tanggal & waktu harus diisi'); return; }
    if (materi.length === 0) { setError('Pilih minimal satu materi latihan'); return; }

    setSaving(true);
    setError('');
    try {
      const body: Record<string, unknown> = {
        hariTanggal: new Date(hariTanggal).toISOString(),
        materi,
      };
      if (lokasi) body.lokasi = lokasi;

      await apiClient.patch(`/trainings/${id}`, body);
      router.push(`/trainings/${id}`);
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
          <button onClick={() => router.push('/trainings')} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
            ← Kembali ke Latihan
          </button>
        </div>
      </div>
    );
  }

  return (
      <PermissionGuard module="trainings" action="edit">
        <Breadcrumbs />
        <div className="max-w-2xl mx-auto space-y-6">
              {/* Header */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.push(`/trainings/${id}`)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <ArrowLeft size={20} className="text-gray-500" />
                </button>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Edit Jadwal Latihan
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    Perbarui jadwal latihan
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField label="Tanggal & Waktu" required>
                      <input
                        type="datetime-local"
                        value={hariTanggal}
                        onChange={(e) => setHariTanggal(e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition"
                      />
                    </FormField>
                    <FormField label="Lokasi">
                      <input
                        type="text"
                        value={lokasi}
                        onChange={(e) => setLokasi(e.target.value)}
                        placeholder="Contoh: Dojo THS Larantuka"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition"
                      />
                    </FormField>
                  </div>
        
                  <FormField label="Materi Latihan" required>
                    <MateriMultiSelect
                      value={materi}
                      onChange={setMateri}
                    />
                  </FormField>
                </div>
        
                {/* Actions */}
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => router.push(`/trainings/${id}`)}
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
