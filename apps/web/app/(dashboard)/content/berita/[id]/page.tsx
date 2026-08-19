'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { PermissionGuard } from '@/components/auth/permission-guard';
import { useToast } from '@/components/ui/toast';
import PageHeader from '@/components/ui/page-header';
import PageContainer from '@/components/ui/page-container';
import { Save, ArrowLeft, Upload } from 'lucide-react';

interface Berita {
  id: string;
  judul: string;
  ringkasan: string;
  konten: string;
  gambar?: string;
  tanggal: string;
  slug: string;
  isVisible: boolean;
}

export default function EditBeritaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const toast = useToast();
  const [berita, setBerita] = useState<Berita | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form state
  const [judul, setJudul] = useState('');
  const [ringkasan, setRingkasan] = useState('');
  const [konten, setKonten] = useState('');
  const [slug, setSlug] = useState('');
  const [isVisible, setIsVisible] = useState(true);
  const [gambar, setGambar] = useState<string | undefined>();

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const res = await apiClient.get(`/content/berita/${id}`);
      const data = res.data.data;
      setBerita(data);
      setJudul(data.judul);
      setRingkasan(data.ringkasan);
      setKonten(data.konten);
      setSlug(data.slug);
      setIsVisible(data.isVisible);
      setGambar(data.gambar);
    } catch {
      toast('error', 'Gagal memuat data berita');
      router.push('/content/berita');
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleJudulChange = (value: string) => {
    setJudul(value);
    // Auto-generate slug from judul
    if (!berita) {
      setSlug(generateSlug(value));
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      await apiClient.post(`/content/berita/${id}/image`, formData);
      toast('success', 'Gambar berhasil diupload');
      fetchData();
    } catch {
      toast('error', 'Gagal mengupload gambar');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!judul.trim() || !ringkasan.trim() || !konten.trim() || !slug.trim()) {
      toast('error', 'Semua field wajib diisi');
      return;
    }

    setSaving(true);
    try {
      await apiClient.patch(`/content/berita/${id}`, {
        judul,
        ringkasan,
        konten,
        slug,
        isVisible,
      });
      toast('success', 'Berita berhasil disimpan');
      router.push('/content/berita');
    } catch {
      toast('error', 'Gagal menyimpan berita');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PermissionGuard module="settings" action="edit">
      <PageContainer>
        <PageHeader title="Edit Berita" onRefresh={fetchData}>
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
                {isVisible ? 'Berita ditampilkan di halaman public' : 'Berita tersembunyi dari halaman public'}
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

          {/* Image Upload */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Gambar</label>
            <div className="flex items-center gap-4">
              {gambar && (
                <img
                  src={`/api/uploads/${gambar}`}
                  alt="Preview"
                  className="w-32 h-32 object-cover rounded-lg border"
                />
              )}
              <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                <Upload size={16} />
                <span className="text-sm">{gambar ? 'Ganti Gambar' : 'Upload Gambar'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
              {uploading && <span className="text-sm text-gray-500">Mengupload...</span>}
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
              <textarea
                value={konten}
                onChange={(e) => setKonten(e.target.value)}
                rows={15}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Konten berita dalam format HTML..."
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
