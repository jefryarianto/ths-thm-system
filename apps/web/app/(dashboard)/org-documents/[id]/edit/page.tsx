'use client';

import { PermissionGuard } from '@/components/auth/permission-guard';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import FormField from '@/components/ui/form-field';
import { DetailSkeleton, ErrorPage, FormLayout } from '@/components/crud';

interface DocDetail {
  id: string;
  judul: string;
  deskripsi: string | null;
  kategoriId: string;
  filePath: string | null;
  kategori?: { id: string; nama: string };
}

export default function EditOrgDocumentPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fetchError, setFetchError] = useState('');

  const [form, setForm] = useState({ judul: '', deskripsi: '', kategoriId: '', filePath: '' });
  const [categories, setCategories] = useState<Array<{ id: string; nama: string }>>([]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        const [docRes, catRes] = await Promise.all([
          apiClient.get(`/org-documents/${id}`),
          apiClient.get('/org-documents/categories/list'),
        ]);
        const d = docRes.data.data;
        setForm({
          judul: d.judul,
          deskripsi: d.deskripsi || '',
          kategoriId: d.kategoriId || '',
          filePath: d.filePath || '',
        });
        setCategories(catRes.data.data || []);
      } catch {
        setFetchError('Gagal memuat data dokumen');
      }
      setLoading(false);
    })();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.judul) { setError('Judul harus diisi'); return; }
    if (!form.kategoriId) { setError('Kategori harus dipilih'); return; }
    setSaving(true); setError('');
    try {
      await apiClient.patch(`/org-documents/${id}`, {
        judul: form.judul,
        deskripsi: form.deskripsi || undefined,
        kategoriId: form.kategoriId,
      });
      router.push(`/org-documents/${id}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Gagal menyimpan perubahan');
    }
    setSaving(false);
  };

  if (loading) return <DetailSkeleton />;
  if (fetchError) return <ErrorPage message={fetchError} backHref={`/org-documents/${id}`} backLabel="Kembali" />;

  return (
      <PermissionGuard module="org-documents" action="edit">
        <FormLayout
              backHref={`/org-documents/${id}`}
              title="Edit Dokumen Organisasi"
              subtitle={form.judul}
              error={error}
              saving={saving}
              onCancel={() => router.push(`/org-documents/${id}`)}
              onSubmit={handleSubmit}
              submitLabel="Simpan Perubahan"
            >
              <FormField label="Kategori" required>
                <select value={form.kategoriId} onChange={(e) => setForm({ ...form, kategoriId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition">
                  <option value="">Pilih kategori...</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.nama}</option>)}
                </select>
              </FormField>
        
              <FormField label="Judul" required>
                <input type="text" value={form.judul} onChange={(e) => setForm({ ...form, judul: e.target.value })} required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition" />
              </FormField>
        
              <FormField label="Deskripsi">
                <textarea value={form.deskripsi} onChange={(e) => setForm({ ...form, deskripsi: e.target.value })} rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition" />
              </FormField>
        
              {form.filePath && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-xl text-sm">
                  <p className="font-medium text-blue-700 dark:text-blue-400">File saat ini:</p>
                  <a href={`/api/uploads/${form.filePath}`} target="_blank" rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-300 hover:underline text-xs">{form.filePath}</a>
                </div>
              )}
            </FormLayout>
      </PermissionGuard>
    );
}
