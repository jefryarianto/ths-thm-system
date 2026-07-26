'use client';

import { PermissionGuard } from '@/components/auth/permission-guard';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { FormLayout } from '@/components/crud';
import { Field } from '../../shared';

export default function NewOutgoingLetterPage() {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState({
    nomorSurat: '',
    tanggalSurat: today,
    tujuan: '',
    perihal: '',
    isi: '',
    filePath: '',
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
    if (!form.tujuan.trim()) {
      setError('Tujuan harus diisi');
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
        tujuan: form.tujuan.trim(),
        perihal: form.perihal.trim(),
        isi: form.isi.trim() || undefined,
      };
      if (form.filePath.trim()) {
        payload.filePath = form.filePath.trim();
      }

      const { data: res } = await apiClient.post('/letters/outgoing', payload);
      router.push(`/letters/outgoing/${res.data?.id || res.id}`);
    } catch (err: unknown) {
      const apiErr = (
        err as { response?: { data?: { message?: string } } }
      )?.response?.data?.message;
      setError(apiErr || 'Gagal menyimpan surat keluar');
    } finally {
      setSaving(false);
    }
  };

  return (
      <PermissionGuard module="letters" action="create">
        <FormLayout
              backHref="/letters"
              title="Tambah Surat Keluar"
              subtitle="Buat catatan surat keluar baru"
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
                  placeholder="Contoh: 002/THS-THM/V/2026"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                />
              </Field>
        
              <Field label="Tujuan" required>
                <input
                  type="text"
                  value={form.tujuan}
                  onChange={(e) => handleChange('tujuan', e.target.value)}
                  placeholder="Nama tujuan / instansi"
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
        
              <Field label="Isi / Konten Surat">
                <textarea
                  value={form.isi}
                  onChange={(e) => handleChange('isi', e.target.value)}
                  placeholder="Isi surat (opsional)"
                  rows={5}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition resize-none"
                />
              </Field>
        
              <Field label="Tanggal Surat">
                <input
                  type="date"
                  value={form.tanggalSurat}
                  onChange={(e) => handleChange('tanggalSurat', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                />
              </Field>
        
              <Field label="File Lampiran (URL)">
                <input
                  type="url"
                  value={form.filePath}
                  onChange={(e) => handleChange('filePath', e.target.value)}
                  placeholder="URL file lampiran (opsional)"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                />
              </Field>
            </FormLayout>
      </PermissionGuard>
    );
}
