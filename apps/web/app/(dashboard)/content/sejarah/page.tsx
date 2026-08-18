'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import apiClient, { unwrap } from '@/lib/api-client';
import { PermissionGuard } from '@/components/auth/permission-guard';
import { useToast } from '@/components/ui/toast';
import PageHeader from '@/components/ui/page-header';
import PageContainer from '@/components/ui/page-container';
import { Save, Eye, EyeOff, ArrowLeft } from 'lucide-react';

interface Sejarah {
  id: string;
  konten: string;
  isVisible: boolean;
}

export default function SejarahPage() {
  const router = useRouter();
  const toast = useToast();
  const [data, setData] = useState<Sejarah | null>(null);
  const [konten, setKonten] = useState('');
  const [isVisible, setIsVisible] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await apiClient.get('/settings/sejarah');
      const sejarah = unwrap<Sejarah>(res);
      setData(sejarah);
      setKonten(sejarah.konten || '');
      setIsVisible(sejarah.isVisible);
    } catch {
      toast.error('Gagal memuat data sejarah');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.patch('/settings/sejarah', { konten, isVisible });
      toast.success('Konten sejarah berhasil disimpan');
    } catch {
      toast.error('Gagal menyimpan konten sejarah');
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
        <PageHeader title="Edit Sejarah" onRefresh={fetchData}>
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
            <div className="flex items-center gap-3">
              {isVisible ? (
                <Eye size={20} className="text-green-600" />
              ) : (
                <EyeOff size={20} className="text-gray-400" />
              )}
              <div>
                <p className="font-medium text-gray-900">Status Tampil</p>
                <p className="text-sm text-gray-500">
                  {isVisible ? 'Konten ditampilkan di halaman public' : 'Konten tersembunyi dari halaman public'}
                </p>
              </div>
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

          {/* Content Editor */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Konten Sejarah (HTML)
            </label>
            <textarea
              value={konten}
              onChange={(e) => setKonten(e.target.value)}
              className="w-full h-96 p-4 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Masukkan konten sejarah dalam format HTML..."
            />
            <p className="mt-2 text-sm text-gray-500">
              Format: Gunakan tag HTML seperti &lt;p&gt;, &lt;h2&gt;, &lt;ul&gt;, &lt;li&gt;, dll.
            </p>
          </div>

          {/* Preview */}
          {konten && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Preview</label>
              <div
                className="prose prose-blue max-w-none p-4 border border-gray-200 rounded-lg bg-gray-50"
                dangerouslySetInnerHTML={{ __html: konten }}
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
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
