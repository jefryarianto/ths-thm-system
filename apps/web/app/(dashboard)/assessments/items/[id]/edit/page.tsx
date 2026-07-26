'use client';

import { PermissionGuard } from '@/components/auth/permission-guard';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import FormField from '@/components/ui/form-field';
import { DetailSkeleton, ErrorPage, FormLayout } from '@/components/crud';

interface ItemDetail {
  id: string;
  kodeItem: string;
  namaItem: string;
  skorMaksimal: number;
  bobot: number;
  urutan: number;
  isActive: boolean;
}

export default function EditItemPenilaianPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fetchError, setFetchError] = useState('');

  const [form, setForm] = useState({
    namaItem: '',
    skorMaksimal: 0,
    bobot: 0,
    urutan: 0,
    isActive: true,
  });

  const [itemTitle, setItemTitle] = useState('');

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        const { data: res } = await apiClient.get(`/assessments/items/${id}`);
        const item: ItemDetail = res.data;
        setForm({
          namaItem: item.namaItem,
          skorMaksimal: item.skorMaksimal,
          bobot: item.bobot,
          urutan: item.urutan,
          isActive: item.isActive,
        });
        setItemTitle(`${item.kodeItem} — ${item.namaItem}`);
      } catch {
        setFetchError('Gagal memuat data item penilaian');
      }
      setLoading(false);
    })();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.namaItem.trim()) { setError('Nama item harus diisi'); return; }
    if (form.skorMaksimal <= 0) { setError('Skor maksimal harus lebih dari 0'); return; }
    if (form.bobot <= 0) { setError('Bobot harus lebih dari 0'); return; }

    setSaving(true);
    setError('');
    try {
      await apiClient.patch(`/assessments/items/${id}`, {
        namaItem: form.namaItem.trim(),
        skorMaksimal: form.skorMaksimal,
        bobot: form.bobot,
        urutan: form.urutan || undefined,
        isActive: form.isActive,
      });
      router.push('/assessments/items');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Gagal menyimpan perubahan');
    }
    setSaving(false);
  };

  if (loading) return <DetailSkeleton />;
  if (fetchError) return <ErrorPage message={fetchError} backHref="/assessments/items" backLabel="Kembali ke Item Penilaian" />;

  return (
      <PermissionGuard module="assessments" action="edit">
        <FormLayout
              backHref="/assessments/items"
              title="Edit Item Penilaian"
              subtitle={itemTitle}
              error={error}
              saving={saving}
              onCancel={() => router.push('/assessments/items')}
              onSubmit={handleSubmit}
              submitLabel="Simpan Perubahan"
            >
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
                    min="0"
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
                    min="0"
                    max="100"
                    step="0.01"
                    required
                    placeholder="Contoh: 0.25"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  />
                </FormField>
              </div>
        
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        
                <FormField label="Status">
                  <select
                    value={form.isActive ? 'true' : 'false'}
                    onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.value === 'true' }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  >
                    <option value="true">Aktif</option>
                    <option value="false">Nonaktif</option>
                  </select>
                </FormField>
              </div>
            </FormLayout>
      </PermissionGuard>
    );
}
