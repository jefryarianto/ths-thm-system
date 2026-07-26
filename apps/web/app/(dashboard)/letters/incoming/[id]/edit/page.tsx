'use client';

import { PermissionGuard } from '@/components/auth/permission-guard';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { FormLayout, DetailSkeleton, ErrorPage } from '@/components/crud';
import { Field } from '../../../shared';

interface IncomingLetter {
  id: string;
  nomorSurat: string;
  tanggalSurat: string;
  tanggalTerima: string;
  pengirim: string;
  perihal: string;
  status: string;
  fileScanPath: string | null;
}

export default function EditIncomingLetterPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [original, setOriginal] = useState<IncomingLetter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    nomorSurat: '',
    tanggalSurat: '',
    pengirim: '',
    perihal: '',
    status: 'diterima',
    fileScanPath: '',
  });

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchLetter = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data: res } = await apiClient.get(`/letters/incoming/${id}`);
      const l = res.data as IncomingLetter;
      setOriginal(l);
      setForm({
        nomorSurat: l.nomorSurat || '',
        tanggalSurat: l.tanggalSurat ? l.tanggalSurat.slice(0, 10) : '',
        pengirim: l.pengirim || '',
        perihal: l.perihal || '',
        status: l.status || 'diterima',
        fileScanPath: l.fileScanPath || '',
      });
      setError(null);
    } catch {
      setError('Gagal memuat data surat masuk');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchLetter(); }, [fetchLetter]);

  const handleChange = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.nomorSurat.trim() || !form.pengirim.trim() || !form.perihal.trim()) {
      setFormError('Nomor surat, pengirim, dan perihal harus diisi');
      return;
    }

    setSaving(true);
    setFormError('');

    try {
      // Only send changed fields
      const payload: Record<string, unknown> = {};
      if (form.nomorSurat !== original?.nomorSurat) payload.nomorSurat = form.nomorSurat.trim();
      if (form.tanggalSurat !== original?.tanggalSurat?.slice(0, 10))
        payload.tanggalSurat = form.tanggalSurat;
      if (form.pengirim !== original?.pengirim) payload.pengirim = form.pengirim.trim();
      if (form.perihal !== original?.perihal) payload.perihal = form.perihal.trim();
      if (form.status !== original?.status) payload.status = form.status;
      if (form.fileScanPath !== (original?.fileScanPath || ''))
        payload.fileScanPath = form.fileScanPath.trim() || undefined;

      await apiClient.patch(`/letters/incoming/${id}`, payload);
      router.push(`/letters/incoming/${id}`);
    } catch (err: unknown) {
      const apiErr = (
        err as { response?: { data?: { message?: string } } }
      )?.response?.data?.message;
      setFormError(apiErr || 'Gagal menyimpan perubahan');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <DetailSkeleton rows={4} />;
  if (error || !original) return <ErrorPage message={error || 'Surat tidak ditemukan'} backHref="/letters" onRetry={fetchLetter} />;

  return (
      <PermissionGuard module="letters" action="edit">
        <FormLayout
              backHref={`/letters/incoming/${id}`}
              title="Edit Surat Masuk"
              subtitle={`${original.nomorSurat} — ${original.pengirim}`}
              error={formError}
              saving={saving}
              onSubmit={handleSubmit}
              onCancel={() => router.push(`/letters/incoming/${id}`)}
              submitLabel="Simpan Perubahan"
              savingLabel="Menyimpan..."
            >
              <Field label="Nomor Surat" required>
                <input
                  type="text"
                  value={form.nomorSurat}
                  onChange={(e) => handleChange('nomorSurat', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                />
              </Field>
        
              <Field label="Pengirim" required>
                <input
                  type="text"
                  value={form.pengirim}
                  onChange={(e) => handleChange('pengirim', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                />
              </Field>
        
              <Field label="Perihal" required>
                <input
                  type="text"
                  value={form.perihal}
                  onChange={(e) => handleChange('perihal', e.target.value)}
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
        
                <Field label="Status">
                  <select
                    value={form.status}
                    onChange={(e) => handleChange('status', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  >
                    <option value="diterima">Diterima</option>
                    <option value="diproses">Diproses</option>
                    <option value="ditolak">Ditolak</option>
                  </select>
                </Field>
              </div>
        
              <Field label="File Scan (URL)">
                <input
                  type="url"
                  value={form.fileScanPath}
                  onChange={(e) => handleChange('fileScanPath', e.target.value)}
                  placeholder="URL file scan surat"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                />
              </Field>
            </FormLayout>
      </PermissionGuard>
    );
}
