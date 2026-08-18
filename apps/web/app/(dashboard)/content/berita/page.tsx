'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { PermissionGuard } from '@/components/auth/permission-guard';
import { useToast } from '@/components/ui/toast';
import PageHeader from '@/components/ui/page-header';
import PageContainer from '@/components/ui/page-container';
import { Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react';

interface Berita {
  id: string;
  judul: string;
  ringkasan: string;
  gambar?: string;
  tanggal: string;
  slug: string;
  isVisible: boolean;
}

export default function BeritaListPage() {
  const router = useRouter();
  const toast = useToast();
  const [data, setData] = useState<Berita[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/content/berita');
      setData(res.data.data || []);
    } catch {
      toast('error', 'Gagal memuat data berita');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus berita ini?')) return;
    setDeleting(id);
    try {
      await apiClient.delete(`/content/berita/${id}`);
      toast('success', 'Berita berhasil dihapus');
      fetchData();
    } catch {
      toast('error', 'Gagal menghapus berita');
    } finally {
      setDeleting(null);
    }
  };

  const handleToggleVisibility = async (berita: Berita) => {
    try {
      await apiClient.patch(`/content/berita/${berita.id}`, {
        isVisible: !berita.isVisible,
      });
      toast('success', `Berita ${berita.isVisible ? 'disembunyikan' : 'ditampilkan'}`);
      fetchData();
    } catch {
      toast('error', 'Gagal mengubah status');
    }
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

  return (
    <PermissionGuard module="settings" action="edit">
      <PageContainer>
        <PageHeader title="Berita & Artikel" onRefresh={fetchData}>
          <button
            onClick={() => router.push('/content/berita/new')}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
          >
            <Plus size={16} /> Tambah Berita
          </button>
        </PageHeader>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <p className="text-xl mb-2">Belum ada berita</p>
            <p>Klik &quot;Tambah Berita&quot; untuk membuat berita pertama</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Judul</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600 hidden md:table-cell">Ringkasan</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600 hidden lg:table-cell">Tanggal</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Status</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {data.map((berita) => (
                  <tr key={berita.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{berita.judul}</div>
                      <div className="text-xs text-gray-500 mt-1 md:hidden">{formatDate(berita.tanggal)}</div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p className="text-sm text-gray-600 line-clamp-2">{berita.ringkasan}</p>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-sm text-gray-500">{formatDate(berita.tanggal)}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggleVisibility(berita)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          berita.isVisible
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {berita.isVisible ? <Eye size={12} /> : <EyeOff size={12} />}
                        {berita.isVisible ? 'Tampil' : 'Tersembunyi'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => router.push(`/content/berita/${berita.id}`)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(berita.id)}
                          disabled={deleting === berita.id}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                          title="Hapus"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PageContainer>
    </PermissionGuard>
  );
}
