'use client';

import { PermissionGuard } from '@/components/auth/permission-guard';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import FormField from '@/components/ui/form-field';
import { DetailSkeleton, ErrorPage, FormLayout } from '@/components/crud';

interface AspectDetail {
  id: string;
  kodeAspek: string;
  namaAspek: string;
  deskripsi: string | null;
  bobot: number;
  isActive: boolean;
}

export default function EditAspectPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fetchError, setFetchError] = useState('');

  const [form, setForm] = useState({
    namaAspek: '',
    deskripsi: '',
    bobot: 0,
    isActive: true,
  });

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        const { data: res } = await apiClient.get(`/assessments/aspects/${id}`);
        const a: AspectDetail = res.data;
        setForm({
          namaAspek: a.namaAspek,
          deskripsi: a.deskripsi || '',
          bobot: a.bobot,
          isActive: a.isActive,
        });
      } catch {
        setFetchError('Gagal memuat data aspek');
      }
      setLoading(false);
    })();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.namaAspek) { setError('Nama aspek harus diisi'); return; }
    if (form.bobot <= 0) { setError('Bobot harus lebih dari 0'); return; }
    setSaving(true); setError('');
    try {
      await apiClient.patch(`/assessments/aspects/${id}`, {
        namaAspek: form.namaAspek,
        deskripsi: form.deskripsi || undefined,
        bobot: form.bobot,
        isActive: form.isActive,
      });
      router.push('/assessments');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Gagal menyimpan perubahan');
    }
    setSaving(false);
  };

  if (loading) return <DetailSkeleton />;
  if (fetchError) return <ErrorPage message={fetchError} backHref="/assessments" backLabel="Kembali ke Penilaian" />;

  return (
      <PermissionGuard module="assessments" action="edit">
        <FormLayout
              backHref="/assessments"
              title="Edit Aspek Penilaian"
              subtitle={form.namaAspek}
              error={error}
              saving={saving}
              onCancel={() => router.push('/assessments')}
              onSubmit={handleSubmit}
              submitLabel="Simpan Perubahan"
            >
              <FormField label="Nama Aspek" required>
                <input type="text" value={form.namaAspek} onChange={(e) => setForm({ ...form, namaAspek: e.target.value })} required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition" />
              </FormField>
        
              <FormField label="Deskripsi">
                <textarea value={form.deskripsi} onChange={(e) => setForm({ ...form, deskripsi: e.target.value })} rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition" />
              </FormField>
        
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Bobot" required>
                  <input type="number" value={form.bobot} onChange={(e) => setForm({ ...form, bobot: parseFloat(e.target.value) || 0 })}
                    min="0" max="100" step="0.1" required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition" />
                </FormField>
                <FormField label="Status">
                  <select value={form.isActive ? 'true' : 'false'} onChange={(e) => setForm({ ...form, isActive: e.target.value === 'true' })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition">
                    <option value="true">Aktif</option>
                    <option value="false">Nonaktif</option>
                  </select>
                </FormField>
              </div>
            </FormLayout>
      </PermissionGuard>
    );
}
