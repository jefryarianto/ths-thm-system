'use client';

import { PermissionGuard } from '@/components/auth/permission-guard';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';
import FormField from '@/components/ui/form-field';
import { MATERI_OPTIONS } from '@/components/trainings/constants';

import Breadcrumbs from '@/components/ui/breadcrumbs';

interface Ranting {
  id: string;
  nama: string;
  kodeRanting: string;
  wilayah?: { nama: string };
}

interface Pelatih {
  id: string;
  namaLengkap: string;
  email: string;
  role: string;
}

export default function NewTrainingPage() {
  const router = useRouter();

  // Form state
  const [hariTanggal, setHariTanggal] = useState('');
  const [lokasi, setLokasi] = useState('');
  const [jenisMateri, setJenisMateri] = useState('');

  // Async data
  const [rantings, setRantings] = useState<Ranting[]>([]);
  const [selectedRantingId, setSelectedRantingId] = useState('');
  const [pelatihList, setPelatihList] = useState<Pelatih[]>([]);
  const [selectedPelatihId, setSelectedPelatihId] = useState('');

  // UI state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loadingRanting, setLoadingRanting] = useState(true);
  const [loadingPelatih, setLoadingPelatih] = useState(true);

  // ── Load ranting options ──────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { data: res } = await apiClient.get('/org-structure/ranting', {
          params: { limit: 200 },
        });
        setRantings(res.data || []);
      } catch {
        setError('Gagal memuat data ranting');
      }
      setLoadingRanting(false);
    })();
  }, []);

  // ── Load pelatih / users with role penguji ────────────
  useEffect(() => {
    (async () => {
      try {
        // Fetch users with role penguji or admin_kegiatan (potential pelatih)
        const { data: res } = await apiClient.get('/users', {
          params: { limit: 200, role: 'penguji' },
        });
        setPelatihList(res.data || []);
      } catch {
        // Fallback: get examiners
        try {
          const { data: res } = await apiClient.get('/examiners', {
            params: { limit: 200 },
          });
          setPelatihList(res.data || []);
        } catch {
          // Leave empty — user can still submit without pelatihId (auto-assign to current user)
        }
      }
      setLoadingPelatih(false);
    })();
  }, []);

  // ── Submit handler ────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hariTanggal) {
      setError('Tanggal & waktu harus diisi');
      return;
    }
    if (!jenisMateri) {
      setError('Jenis materi harus dipilih');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const body: Record<string, unknown> = {
        hariTanggal: new Date(hariTanggal).toISOString(),
        jenisMateri,
        lokasi,
      };

      // Only send rantingId if selected (otherwise auto-assigned from scope)
      if (selectedRantingId) {
        body.rantingId = selectedRantingId;
      }

      // Only send pelatihId if selected (otherwise auto-assigned to current user)
      if (selectedPelatihId) {
        body.pelatihId = selectedPelatihId;
      }

      const { data: res } = await apiClient.post('/trainings', body);
      const newId = res.data?.id;

      if (newId) {
        router.push(`/trainings/${newId}`);
      } else {
        router.push('/trainings');
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Gagal menyimpan jadwal latihan');
    }
    setSaving(false);
  };

  // ── Set default date/time to now + 1 hour ─────────────
  useEffect(() => {
    if (!hariTanggal) {
      const d = new Date();
      d.setHours(d.getHours() + 1, 0, 0, 0);
      // Format as datetime-local value (YYYY-MM-DDTHH:MM)
      const pad = (n: number) => String(n).padStart(2, '0');
      setHariTanggal(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
    }
  }, []);

  return (
      <PermissionGuard module="trainings" action="create">
        <Breadcrumbs />
        <div className="max-w-2xl mx-auto space-y-6">
              {/* Header */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.push('/trainings')}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <ArrowLeft size={20} className="text-gray-500" />
                </button>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Jadwal Latihan Baru
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    Buat jadwal latihan untuk anggota
                  </p>
                </div>
              </div>
        
              {/* Error banner */}
              {error && (
                <div className="flex items-center gap-2.5 p-3.5 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
                  <AlertCircle size={16} className="shrink-0" />
                  {error}
                </div>
              )}
        
              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 space-y-5">
                  {/* Row 1: Tanggal & Lokasi */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField label="Tanggal & Waktu" required>
                      <input
                        type="datetime-local"
                        value={hariTanggal}
                        onChange={(e) => setHariTanggal(e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                      />
                    </FormField>
        
                    <FormField label="Lokasi">
                      <input
                        type="text"
                        value={lokasi}
                        onChange={(e) => setLokasi(e.target.value)}
                        placeholder="Contoh: Dojo THS Larantuka"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                      />
                    </FormField>
                  </div>
        
                  {/* Row 2: Materi & Ranting */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField label="Jenis Materi" required>
                      <select
                        value={jenisMateri}
                        onChange={(e) => setJenisMateri(e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                      >
                        <option value="">Pilih materi...</option>
                        {MATERI_OPTIONS.filter((o) => o.value).map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </FormField>
        
                    <FormField label="Ranting">
                      <select
                        value={selectedRantingId}
                        onChange={(e) => setSelectedRantingId(e.target.value)}
                        disabled={loadingRanting}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition disabled:opacity-50"
                      >
                        <option value="">
                          {loadingRanting ? 'Memuat...' : 'Otomatis (dari scope Anda)'}
                        </option>
                        {rantings.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.nama} {r.wilayah ? `— ${r.wilayah.nama}` : ''}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-gray-400">
                        Kosongkan untuk menggunakan ranting default Anda
                      </p>
                    </FormField>
                  </div>
        
                  {/* Row 3: Pelatih */}
                  <FormField label="Pelatih">
                    <select
                      value={selectedPelatihId}
                      onChange={(e) => setSelectedPelatihId(e.target.value)}
                      disabled={loadingPelatih}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition disabled:opacity-50"
                    >
                      <option value="">
                        {loadingPelatih ? 'Memuat...' : 'Saya sendiri (logged-in user)'}
                      </option>
                      {pelatihList.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.namaLengkap} {p.role ? `(${p.role.replace('_', ' ')})` : ''}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-400">
                      Kosongkan untuk mencatat sebagai pelatih Anda sendiri
                    </p>
                  </FormField>
                </div>
        
                {/* Submit */}
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => router.push('/trainings')}
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
                    {saving ? 'Menyimpan...' : 'Simpan Jadwal'}
                  </button>
                </div>
              </form>
            </div>
      </PermissionGuard>
    );
}
