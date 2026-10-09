'use client';

import { PermissionGuard } from '@/components/auth/permission-guard';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import apiClient, { unwrap } from '@/lib/api-client';
import FormField from '@/components/ui/form-field';
import { DetailSkeleton, ErrorPage, FormLayout } from '@/components/crud';
import { Upload, FileText, X } from 'lucide-react';

const ACCEPTED_EXTENSIONS = [
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.txt',
  '.rtf',
  '.zip',
];
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
  const [newFile, setNewFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        const [docRes, catRes] = await Promise.all([
          apiClient.get(`/org-documents/${id}`),
          apiClient.get('/org-documents/categories'),
        ]);
        const d = unwrap<{
          judul: string;
          deskripsi?: string | null;
          kategoriId?: string | null;
          filePath?: string | null;
        }>(docRes);
        setForm({
          judul: d.judul,
          deskripsi: d.deskripsi || '',
          kategoriId: d.kategoriId || '',
          filePath: d.filePath || '',
        });
        setCategories(unwrap<Array<{ id: string; nama: string }>>(catRes) || []);
      } catch {
        setFetchError('Gagal memuat data dokumen');
      }
      setLoading(false);
    })();
  }, [id]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    const name = f.name.toLowerCase();
    if (!ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext))) {
      setError(`Ekstensi tidak diizinkan. Gunakan: ${ACCEPTED_EXTENSIONS.join(', ')}`);
      return;
    }
    if (f.size > MAX_FILE_SIZE) {
      setError(`Ukuran file melebihi batas 25MB (file: ${formatBytes(f.size)})`);
      return;
    }

    setError('');
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', f);
      const res = await apiClient.post('/org-documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const payload = unwrap<{ filePath: string; originalName: string; size: number }>(res);
      if (!payload?.filePath) throw new Error('filePath tidak diterima dari server');
      setNewFile(f);
      setForm((prev) => ({ ...prev, filePath: payload.filePath }));
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Gagal mengupload file';
      setError(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.judul) {
      setError('Judul harus diisi');
      return;
    }
    if (!form.kategoriId) {
      setError('Kategori harus dipilih');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await apiClient.patch(`/org-documents/${id}`, {
        judul: form.judul,
        deskripsi: form.deskripsi || undefined,
        kategoriId: form.kategoriId,
        filePath: form.filePath || undefined,
      });
      router.push(`/org-documents/${id}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Gagal menyimpan perubahan');
    }
    setSaving(false);
  };

  if (loading) return <DetailSkeleton />;
  if (fetchError)
    return <ErrorPage message={fetchError} backHref={`/org-documents/${id}`} backLabel="Kembali" />;

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
          <select
            value={form.kategoriId}
            onChange={(e) => setForm({ ...form, kategoriId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition"
          >
            <option value="">Pilih kategori...</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nama}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Judul" required>
          <input
            type="text"
            value={form.judul}
            onChange={(e) => setForm({ ...form, judul: e.target.value })}
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition"
          />
        </FormField>

        <FormField label="Deskripsi">
          <textarea
            value={form.deskripsi}
            onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition"
          />
        </FormField>

        {/* File dokumen */}
        <FormField label="File Dokumen">
          {form.filePath && !newFile ? (
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30">
                <FileText size={20} className="text-blue-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {form.filePath.split('/').pop() || form.filePath}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">File saat ini</p>
                </div>
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 cursor-pointer hover:underline">
                <Upload size={14} />
                Ganti file
                <input
                  type="file"
                  accept={ACCEPTED_EXTENSIONS.join(',')}
                  onChange={handleFileChange}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            </div>
          ) : (
            <div className="space-y-2">
              {newFile && (
                <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30">
                  <FileText size={20} className="text-blue-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{newFile.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatBytes(newFile.size)} • file baru
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setNewFile(null);
                      // Kembalikan ke file lama tidak dimungkinkan tanpa refetch,
                      // jadi user harus refresh; kosongkan saja pilihan baru.
                    }}
                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500"
                    aria-label="Batal ganti file"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
              <label className="inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 cursor-pointer hover:underline">
                <Upload size={14} />
                {uploading ? 'Mengupload...' : newFile ? 'Ganti file lain' : 'Upload file'}
                <input
                  type="file"
                  accept={ACCEPTED_EXTENSIONS.join(',')}
                  onChange={handleFileChange}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            </div>
          )}
        </FormField>
      </FormLayout>
    </PermissionGuard>
  );
}
