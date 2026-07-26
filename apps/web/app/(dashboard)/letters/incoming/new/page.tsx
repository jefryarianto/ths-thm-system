'use client';

import { PermissionGuard } from '@/components/auth/permission-guard';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { FormLayout } from '@/components/crud';
import { Field } from '../../shared';

export default function NewIncomingLetterPage() {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState({
    nomorSurat: '',
    tanggalSurat: today,
    tanggalTerima: today,
    pengirim: '',
    perihal: '',
    fileScanPath: '',
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.nomorSurat.trim()) {
      setError('Nomor surat harus diisi');
      return;
    }
    if (!form.pengirim.trim()) {
      setError('Pengirim harus diisi');
      return;
    }
    if (!form.perihal.trim()) {
      setError('Perihal harus diisi');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const payload: Record<string, unknown> = {
        nomorSurat: form.nomorSurat.trim(),
        tanggalSurat: form.tanggalSurat,
        tanggalTerima: form.tanggalTerima,
        pengirim: form.pengirim.trim(),
        perihal: form.perihal.trim(),
      };
      if (form.fileScanPath.trim()) {
        payload.fileScanPath = form.fileScanPath.trim();
      }

      const { data: res } = await apiClient.post('/letters/incoming', payload);
      router.push(`/letters/incoming/${res.data?.id || res.id}`);
    } catch (err: unknown) {
      const apiErr = (
        err as { response?: { data?: { message?: string } } }
      )?.response?.data?.message;
      setError(apiErr || 'Gagal menyimpan surat masuk');
    } finally {
      setSaving(false);
    }
  };

  return (
      <PermissionGuard module="letters" action="create">
        <FormLayout
              backHref="/letters"
              title="Tambah Surat Masuk"
              subtitle="Buat catatan surat masuk baru"
              error={error}
              saving={saving}
              onSubmit={handleSubmit}
              onCancel={() => router.push('/letters')}
              submitLabel="Tambah Surat"
              savingLabel="Menyimpan..."
            >
              <Field label="Nomor Surat" required>
                <input
                  type="text"
                  value={form.nomorSurat}
                  onChange={(e) => handleChange('nomorSurat', e.target.value)}
                  placeholder="Contoh: 001/THS-THM/V/2026"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                />
              </Field>
        
              <Field label="Pengirim" required>
                <input
                  type="text"
                  value={form.pengirim}
                  onChange={(e) => handleChange('pengirim', e.target.value)}
                  placeholder="Nama pengirim / instansi"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                />
              </Field>
        
              <Field label="Perihal" required>
                <input
                  type="text"
                  value={form.perihal}
                  onChange={(e) => handleChange('perihal', e.target.value)}
                  placeholder="Perihal surat"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                />
              </Field>
        
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Tanggal Surat">
                  <input
                    type="date"
                    value={form.tanggalSurat}
                    onChange={(e) => handleChange('tanggalSurat', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  />
                </Field>
        
                <Field label="Tanggal Terima">
                  <input
                    type="date"
                    value={form.tanggalTerima}
                    onChange={(e) => handleChange('tanggalTerima', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  />
                </Field>
              </div>
        
              <Field label="File Scan (URL)">
                <input
                  type="url"
                  value={form.fileScanPath}
                  onChange={(e) => handleChange('fileScanPath', e.target.value)}
                  placeholder="URL file scan surat (opsional)"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                />
              </Field>
            </FormLayout>
      </PermissionGuard>
    );
}
