'use client';

import { PermissionGuard } from '@/components/auth/permission-guard';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import FormField from '@/components/ui/form-field';
import { FormLayout } from '@/components/crud';

interface AspekOption {
  id: string;
  kodeAspek: string;
  namaAspek: string;
}

export default function NewItemPenilaianPage() {
  const router = useRouter();

  const [aspekList, setAspekList] = useState<AspekOption[]>([]);
  const [loadingAspek, setLoadingAspek] = useState(true);
  const [form, setForm] = useState({
    aspekId: '',
    kodeItem: '',
    namaItem: '',
    skorMaksimal: 100,
    bobot: 0,
    urutan: 0,
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { data: res } = await apiClient.get('/assessments/aspects', {
          params: { limit: 100 },
        });
        const aspects: AspekOption[] = res.data || [];
        setAspekList(aspects);
        if (aspects.length > 0) {
          setForm((prev) => ({ ...prev, aspekId: aspects[0].id }));
        }
      } catch {
        setError('Gagal memuat daftar aspek. Pastikan ada aspek penilaian yang tersedia.');
      }
      setLoadingAspek(false);
    })();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.aspekId) { setError('Pilih aspek penilaian'); return; }
    if (!form.kodeItem.trim()) { setError('Kode item harus diisi'); return; }
    if (!form.namaItem.trim()) { setError('Nama item harus diisi'); return; }
    if (form.skorMaksimal <= 0) { setError('Skor maksimal harus lebih dari 0'); return; }
    if (form.bobot <= 0) { setError('Bobot harus lebih dari 0'); return; }

    setSaving(true);
    setError('');
    try {
      const payload: Record<string, unknown> = {
        aspekId: form.aspekId,
        kodeItem: form.kodeItem.trim(),
        namaItem: form.namaItem.trim(),
        skorMaksimal: form.skorMaksimal,
        bobot: form.bobot,
      };
      if (form.urutan > 0) payload.urutan = form.urutan;

      await apiClient.post('/assessments/items', payload);
      router.push('/assessments/items');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Gagal menyimpan item penilaian');
    }
    setSaving(false);
  };

  return (
      <PermissionGuard module="assessments" action="create">
        <FormLayout
              backHref="/assessments/items"
              title="Tambah Item Penilaian"
              subtitle="Buat item penilaian baru dalam aspek"
              error={error}
              saving={saving}
              onCancel={() => router.push('/assessments/items')}
              onSubmit={handleSubmit}
              submitLabel="Tambah Item"
              savingLabel="Menyimpan..."
            >
              <FormField label="Aspek Penilaian" required>
                {loadingAspek ? (
                  <div className="h-10 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
                ) : (
                  <select
                    value={form.aspekId}
                    onChange={(e) => setForm((prev) => ({ ...prev, aspekId: e.target.value }))}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  >
                    <option value="">Pilih aspek...</option>
                    {aspekList.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.kodeAspek} — {a.namaAspek}
                      </option>
                    ))}
                  </select>
                )}
              </FormField>
        
              <FormField label="Kode Item" required>
                <input
                  type="text"
                  value={form.kodeItem}
                  onChange={(e) => setForm((prev) => ({ ...prev, kodeItem: e.target.value }))}
                  required
                  placeholder="Contoh: TKJ-01"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                />
              </FormField>
        
              <FormField label="Nama Item" required>
                <input
                  type="text"
                  value={form.namaItem}
                  onChange={(e) => setForm((prev) => ({ ...prev, namaItem: e.target.value }))}
                  required
                  placeholder="Nama item penilaian"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                />
              </FormField>
        
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Skor Maksimal" required>
                  <input
                    type="number"
                    value={form.skorMaksimal}
                    onChange={(e) => setForm((prev) => ({ ...prev, skorMaksimal: parseFloat(e.target.value) || 0 }))}
                    min="0.5"
                    max="1000"
                    step="0.5"
                    required
                    placeholder="Contoh: 100"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  />
                </FormField>
        
                <FormField label="Bobot" required>
                  <input
                    type="number"
                    value={form.bobot}
                    onChange={(e) => setForm((prev) => ({ ...prev, bobot: parseFloat(e.target.value) || 0 }))}
                    min="0.01"
                    max="100"
                    step="0.01"
                    required
                    placeholder="Contoh: 0.25"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  />
                </FormField>
              </div>
        
              <FormField label="Urutan">
                <input
                  type="number"
                  value={form.urutan}
                  onChange={(e) => setForm((prev) => ({ ...prev, urutan: parseInt(e.target.value) || 0 }))}
                  min="1"
                  step="1"
                  placeholder="Otomatis jika kosong"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                />
              </FormField>
            </FormLayout>
      </PermissionGuard>
    );
}
