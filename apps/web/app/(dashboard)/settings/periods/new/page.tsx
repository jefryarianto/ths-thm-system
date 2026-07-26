'use client';

import { PermissionGuard } from '@/components/auth/permission-guard';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import FormField from '@/components/ui/form-field';
import { FormLayout } from '@/components/crud';

export default function NewPeriodPage() {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState({
    nama: '',
    tglMulai: today,
    tglSelesai: '',
    isActive: false,
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama.trim()) { setError('Nama periode harus diisi'); return; }
    if (!form.tglMulai) { setError('Tanggal mulai harus diisi'); return; }
    if (!form.tglSelesai) { setError('Tanggal selesai harus diisi'); return; }
    if (new Date(form.tglSelesai) <= new Date(form.tglMulai)) {
      setError('Tanggal selesai harus setelah tanggal mulai');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await apiClient.post('/settings/periods', {
        nama: form.nama.trim(),
        tglMulai: form.tglMulai,
        tglSelesai: form.tglSelesai,
        isActive: form.isActive,
      });
      router.push('/settings/periods');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Gagal menyimpan periode');
    }
    setSaving(false);
  };

  return (
      <PermissionGuard module="settings" action="create">
        <FormLayout
              backHref="/settings/periods"
              title="Tambah Periode Baru"
              subtitle="Buat periode iuran baru"
              error={error}
              saving={saving}
              onCancel={() => router.push('/settings/periods')}
              onSubmit={handleSubmit}
              submitLabel="Tambah Periode"
              savingLabel="Menyimpan..."
            >
              <FormField label="Nama Periode" required>
                <input
                  type="text"
                  value={form.nama}
                  onChange={(e) => setForm((prev) => ({ ...prev, nama: e.target.value }))}
                  required
                  placeholder="Contoh: 2026/2027"
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
                  <span className="text-gray-700 dark:text-gray-300">Aktifkan periode ini</span>
                </label>
              </FormField>
            </FormLayout>
      </PermissionGuard>
    );
}
