'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import apiClient, { extractErrorMessage } from '@/lib/api-client';
import { PermissionGuard } from '@/components/auth/permission-guard';
import { useToast } from '@/components/ui/toast';
import PageHeader from '@/components/ui/page-header';
import PageContainer from '@/components/ui/page-container';
import { Save, ArrowLeft, Upload } from 'lucide-react';
import { RichTextEditor } from '@/components/ui/rich-text-editor';



export default function NewBeritaPage() {
  const router = useRouter();
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  // Form state
  const [judul, setJudul] = useState('');
  const [ringkasan, setRingkasan] = useState('');
  const [konten, setKonten] = useState('');
  const [slug, setSlug] = useState('');
  const [isVisible, setIsVisible] = useState(true);

  // Gambar opsional — diupload setelah berita dibuat (endpoint upload butuh id)
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    if (preview) URL.revokeObjectURL(preview);
    setFile(selected);
    setPreview(selected ? URL.createObjectURL(selected) : null);
  };

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleJudulChange = (value: string) => {
    setJudul(value);
    setSlug(generateSlug(value));
  };

  const handleSave = async () => {
    if (!judul.trim() || !ringkasan.trim() || !konten.trim() || !slug.trim()) {
      toast('error', 'Semua field wajib diisi');
      return;
    }

    setSaving(true);
    try {
      const res = await apiClient.post('/content/berita', {
        judul,
        ringkasan,
        konten,
        slug,
        isVisible,
      });
      const createdId: string | undefined = res.data?.data?.id;

      // Upload gambar terpilih ke berita yang baru dibuat. Kegagalan upload
      // tidak membatalkan berita — admin bisa menambah ulang gambar via edit.
      if (file && createdId) {
        setUploading(true);
        try {
          const formData = new FormData();
          formData.append('image', file);
          await apiClient.post(`/content/berita/${createdId}/image`, formData);
          toast('success', 'Berita berhasil dibuat dengan gambar');
        } catch (err) {
          toast('error', extractErrorMessage(
            err,
            'Berita dibuat, tetapi gambar gagal diupload — tambahkan lewat halaman Edit',
          ));
        } finally {
          setUploading(false);
        }
      } else {
        toast('success', 'Berita berhasil dibuat');
      }
      router.push('/content/berita');
    } catch (err) {
      toast('error', extractErrorMessage(err, 'Gagal membuat berita'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <PermissionGuard module="berita" action="edit">
      <PageContainer>
        <PageHeader title="Tambah Berita Baru">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft size={16} />
            Kembali
          </button>
        </PageHeader>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          {/* Status Toggle */}
          <div className="flex items-center justify-between mb-6 p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">Status Tampil</p>
              <p className="text-sm text-gray-500">
                {isVisible ? 'Berita akan ditampilkan di halaman public' : 'Berita akan tersembunyi dari halaman public'}
              </p>
            </div>
            <button
              onClick={() => setIsVisible(!isVisible)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isVisible ? 'bg-green-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isVisible ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Image (opsional, diupload setelah berita dibuat) */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Gambar</label>
            <div className="flex items-center gap-4">
              {preview && (
                <img
                  src={preview}
                  alt="Preview gambar berita"
                  className="w-32 h-32 object-cover rounded-lg border"
                />
              )}
              <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                <Upload size={16} />
                <span className="text-sm">{file ? 'Ganti Gambar' : 'Pilih Gambar'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
              {uploading && <span className="text-sm text-gray-500">Mengupload...</span>}
              <p className="text-sm text-gray-500">Opsional — gambar tampil di carousel landing.</p>
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Judul *</label>
              <input
                type="text"
                value={judul}
                onChange={(e) => handleJudulChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Judul berita"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Slug *</label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                placeholder="judul-berita"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ringkasan *</label>
              <textarea
                value={ringkasan}
                onChange={(e) => setRingkasan(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ringkasan singkat berita"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Konten (HTML) *</label>
              <RichTextEditor
                value={konten}
                onChange={setKonten}
                placeholder="Tulis konten berita di sini..."
                className="min-h-[200px]"
              />
              <p className="mt-2 text-sm text-gray-500">
                Format: Gunakan tag HTML seperti &lt;p&gt;, &lt;h2&gt;, &lt;ul&gt;, &lt;li&gt;, dll.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => router.back()}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Batal
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Save size={16} />
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </div>
      </PageContainer>
    </PermissionGuard>
  );
}
