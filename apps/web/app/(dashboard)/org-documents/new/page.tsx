'use client';

import { PermissionGuard } from '@/components/auth/permission-guard';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import apiClient, { unwrap } from '@/lib/api-client';
import { ArrowLeft, Save, Upload, FileText, X } from 'lucide-react';

import Breadcrumbs from '@/components/ui/breadcrumbs';
import { useToast } from '@/components/ui/toast';

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
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB - sama dengan nginx client_max_body_size

interface Category {
  id: string;
  nama: string;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function NewOrgDocumentPage() {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState({ judul: '', kategoriId: '', deskripsi: '' });
  const [file, setFile] = useState<File | null>(null);
  const [uploadedPath, setUploadedPath] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await apiClient.get('/org-documents/categories');
        setCategories(unwrap<Category[]>(res) ?? []);
      } catch {
        toast('error', 'Gagal memuat kategori');
      } finally {
        setLoadingCats(false);
      }
    };
    fetchCategories();
  }, [toast]);

  const validateFile = (f: File): string | null => {
    const name = f.name.toLowerCase();
    const hasValidExt = ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
    if (!hasValidExt) {
      return `Ekstensi tidak diizinkan. Gunakan: ${ACCEPTED_EXTENSIONS.join(', ')}`;
    }
    if (f.size > MAX_FILE_SIZE) {
      return `Ukuran file melebihi batas 25MB (file: ${formatBytes(f.size)})`;
    }
    return null;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    const validationError = validateFile(f);
    if (validationError) {
      setError(validationError);
      setFile(null);
      return;
    }

    setError('');
    setFile(f);
    // Auto-isi judul bila masih kosong
    if (!form.judul) {
      const baseName = f.name.replace(/\.[^.]+$/, '');
      setForm((prev) => ({ ...prev, judul: baseName }));
    }

    // Upload langsung ke endpoint /upload
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', f);
        const res = await apiClient.post('/org-documents/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const payload = unwrap<{ filePath: string; originalName: string; size: number }>(res);
        if (!payload?.filePath) throw new Error('filePath tidak diterima dari server');
        setUploadedPath(payload.filePath);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Gagal mengupload file';
      setError(msg);
      setFile(null);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setUploadedPath('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.judul.trim()) {
      setError('Judul harus diisi');
      return;
    }
    if (!form.kategoriId) {
      setError('Kategori harus dipilih');
      return;
    }
    if (!uploadedPath) {
      setError('File dokumen harus diupload terlebih dahulu');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await apiClient.post('/org-documents', {
        judul: form.judul,
        deskripsi: form.deskripsi || undefined,
        kategoriId: form.kategoriId,
        filePath: uploadedPath,
      });
      toast('success', 'Dokumen berhasil ditambahkan');
      router.push('/org-documents');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Gagal menyimpan dokumen';
      setError(msg);
    }
    setSaving(false);
  };

  return (
    <PermissionGuard module="org-documents" action="create">
      <Breadcrumbs />
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/org-documents')}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-xl font-semibold">Dokumen Organisasi Baru</h1>
        </div>
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-gray-800 rounded-2xl border p-6 space-y-4"
        >
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Upload file */}
          <div>
            <label className="block text-sm font-medium mb-1">File Dokumen</label>
            {!file ? (
              <label
                className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition"
              >
                <Upload size={24} className="text-gray-400" />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {uploading ? 'Mengupload...' : 'Klik untuk memilih file'}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  PDF, DOC, XLS, PPT, TXT, ZIP — maks 25MB
                </span>
                <input
                  type="file"
                  accept={ACCEPTED_EXTENSIONS.join(',')}
                  onChange={handleFileChange}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            ) : (
              <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30">
                <FileText size={20} className="text-blue-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatBytes(file.size)}
                    {uploading && ' • mengupload...'}
                    {!uploading && uploadedPath && ' ✓ tersimpan'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500"
                  aria-label="Hapus file"
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Judul */}
          <div>
            <label className="block text-sm font-medium mb-1">Judul</label>
            <input
              type="text"
              value={form.judul}
              onChange={(e) => setForm({ ...form, judul: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition"
              placeholder="Judul dokumen"
            />
          </div>

          {/* Kategori */}
          <div>
            <label className="block text-sm font-medium mb-1">Kategori</label>
            {loadingCats ? (
              <p className="text-sm text-gray-400">Memuat kategori...</p>
            ) : categories.length === 0 ? (
              <p className="text-sm text-amber-500">
                Belum ada kategori.{' '}
                <a href="/org-documents/categories" className="underline font-medium">
                  Buat kategori dulu
                </a>
                .
              </p>
            ) : (
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
            )}
          </div>

          {/* Deskripsi */}
          <div>
            <label className="block text-sm font-medium mb-1">Deskripsi</label>
            <textarea
              value={form.deskripsi}
              onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition"
              placeholder="Deskripsi singkat dokumen (opsional)"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => router.push('/org-documents')}
              className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving || uploading || !uploadedPath}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <Save size={16} />
              {saving ? 'Menyimpan...' : 'Simpan Dokumen'}
            </button>
          </div>
        </form>
      </div>
    </PermissionGuard>
  );
}
