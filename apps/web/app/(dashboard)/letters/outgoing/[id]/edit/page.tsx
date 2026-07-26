'use client';

import { PermissionGuard } from '@/components/auth/permission-guard';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { FormLayout, DetailSkeleton, ErrorPage } from '@/components/crud';
import { Field } from '../../../shared';

interface OutgoingLetter {
  id: string;
  nomorSurat: string;
  tanggalSurat: string;
  tujuan: string;
  perihal: string;
  isi: string;
  status: string;
  filePath: string | null;
}

export default function EditOutgoingLetterPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [original, setOriginal] = useState<OutgoingLetter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    nomorSurat: '',
    tanggalSurat: '',
    tujuan: '',
    perihal: '',
    isi: '',
    status: 'draft',
    filePath: '',
  });

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchLetter = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data: res } = await apiClient.get(`/letters/outgoing/${id}`);
      const l = res.data as OutgoingLetter;
      setOriginal(l);
      setForm({
        nomorSurat: l.nomorSurat || '',
        tanggalSurat: l.tanggalSurat ? l.tanggalSurat.slice(0, 10) : '',
        tujuan: l.tujuan || '',
        perihal: l.perihal || '',
        isi: l.isi || '',
        status: l.status || 'draft',
        filePath: l.filePath || '',
      });
      setError(null);
    } catch {
      setError('Gagal memuat data surat keluar');
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

    if (!form.nomorSurat.trim() || !form.tujuan.trim() || !form.perihal.trim()) {
      setFormError('Nomor surat, tujuan, dan perihal harus diisi');
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
      if (form.tujuan !== original?.tujuan) payload.tujuan = form.tujuan.trim();
      if (form.perihal !== original?.perihal) payload.perihal = form.perihal.trim();
      if (form.isi !== (original?.isi || '')) payload.isi = form.isi || undefined;
      if (form.status !== original?.status) payload.status = form.status;
      if (form.filePath !== (original?.filePath || ''))
        payload.filePath = form.filePath.trim() || undefined;

      await apiClient.patch(`/letters/outgoing/${id}`, payload);
      router.push(`/letters/outgoing/${id}`);
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
              backHref={`/letters/outgoing/${id}`}
              title="Edit Surat Keluar"
              subtitle={`${original.nomorSurat} → ${original.tujuan}`}
              error={formError}
              saving={saving}
              onSubmit={handleSubmit}
              onCancel={() => router.push(`/letters/outgoing/${id}`)}
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
        
              <Field label="Tujuan" required>
                <input
                  type="text"
                  value={form.tujuan}
                  onChange={(e) => handleChange('tujuan', e.target.value)}
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
        
              <Field label="Isi / Konten Surat">
                <textarea
                  value={form.isi}
                  onChange={(e) => handleChange('isi', e.target.value)}
                  rows={5}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition resize-none"
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
                    <option value="draft">Draft</option>
                    <option value="terkirim">Terkirim</option>
                    <option value="dibatalkan">Dibatalkan</option>
                  </select>
                </Field>
              </div>
        
              <Field label="File Lampiran (URL)">
                <input
                  type="url"
                  value={form.filePath}
                  onChange={(e) => handleChange('filePath', e.target.value)}
                  placeholder="URL file lampiran"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                />
              </Field>
            </FormLayout>
      </PermissionGuard>
    );
}
