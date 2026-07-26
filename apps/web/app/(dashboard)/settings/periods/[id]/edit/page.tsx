'use client';

import { PermissionGuard } from '@/components/auth/permission-guard';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import FormField from '@/components/ui/form-field';
import { FormLayout, DetailSkeleton, ErrorPage } from '@/components/crud';

interface PeriodDetail {
  id: string;
  nama: string;
  tglMulai: string;
  tglSelesai: string;
  isActive: boolean;
}

export default function EditPeriodPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [original, setOriginal] = useState<PeriodDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    nama: '',
    tglMulai: '',
    tglSelesai: '',
    isActive: false,
  });

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchPeriod = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data: res } = await apiClient.get('/settings/periods');
      const periods: PeriodDetail[] = res.data || [];
      const found = periods.find((p: PeriodDetail) => p.id === id);
      if (!found) { setError('Periode tidak ditemukan'); return; }
      setOriginal(found);
      setForm({
        nama: found.nama || '',
        tglMulai: found.tglMulai ? found.tglMulai.slice(0, 10) : '',
        tglSelesai: found.tglSelesai ? found.tglSelesai.slice(0, 10) : '',
        isActive: found.isActive,
      });
      setError(null);
    } catch {
      setError('Gagal memuat data periode');
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchPeriod(); }, [fetchPeriod]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama.trim()) { setFormError('Nama periode harus diisi'); return; }
    if (!form.tglMulai) { setFormError('Tanggal mulai harus diisi'); return; }
    if (!form.tglSelesai) { setFormError('Tanggal selesai harus diisi'); return; }
    if (new Date(form.tglSelesai) <= new Date(form.tglMulai)) {
      setFormError('Tanggal selesai harus setelah tanggal mulai');
      return;
    }

    setSaving(true);
    setFormError('');

    try {
      const payload: Record<string, unknown> = {};
      if (form.nama !== original?.nama) payload.nama = form.nama.trim();
      if (form.tglMulai !== original?.tglMulai?.slice(0, 10)) payload.tglMulai = form.tglMulai;
      if (form.tglSelesai !== original?.tglSelesai?.slice(0, 10)) payload.tglSelesai = form.tglSelesai;
      if (form.isActive !== original?.isActive) payload.isActive = form.isActive;

      await apiClient.patch(`/settings/periods/${id}`, payload);
      router.push('/settings/periods');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setFormError(msg || 'Gagal menyimpan perubahan');
    }
    setSaving(false);
  };

  if (loading) return <DetailSkeleton />;
  if (error || !original) return <ErrorPage message={error || 'Periode tidak ditemukan'} backHref="/settings/periods" onRetry={fetchPeriod} />;

  return (
      <PermissionGuard module="settings" action="edit">
        <FormLayout
              backHref="/settings/periods"
              title="Edit Periode"
              subtitle={original.nama}
              error={formError}
              saving={saving}
              onCancel={() => router.push('/settings/periods')}
              onSubmit={handleSubmit}
              submitLabel="Simpan Perubahan"
            >
              <FormField label="Nama Periode" required>
                <input
                  type="text"
                  value={form.nama}
                  onChange={(e) => setForm((prev) => ({ ...prev, nama: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                />
              </FormField>
        
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Tanggal Mulai" required>
                  <input
                    type="date"
                    value={form.tglMulai}
                    onChange={(e) => setForm((prev) => ({ ...prev, tglMulai: e.target.value }))}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  />
                </FormField>
        
                <FormField label="Tanggal Selesai" required>
                  <input
                    type="date"
                    value={form.tglSelesai}
                    onChange={(e) => setForm((prev) => ({ ...prev, tglSelesai: e.target.value }))}
                    required
                    min={form.tglMulai}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  />
                </FormField>
              </div>
        
              <FormField label="Status">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                    className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-700 dark:text-gray-300">Periode aktif</span>
                </label>
              </FormField>
            </FormLayout>
      </PermissionGuard>
    );
}
