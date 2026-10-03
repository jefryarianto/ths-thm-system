'use client';

import { useCallback, useEffect, useState } from 'react';
import { Newspaper, Clock, CheckCircle2, XCircle } from 'lucide-react';
import apiClient, { unwrap } from '@/lib/api-client';
import { PermissionGuard } from '@/components/auth/permission-guard';
import { useToast } from '@/components/ui/toast';
import PageHeader from '@/components/ui/page-header';
import PageContainer from '@/components/ui/page-container';

interface BeritaSubmission {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  completedAt?: string | null;
  berita: {
    id: string;
    judul: string;
    ringkasan: string;
    slug: string;
    isVisible: boolean;
  } | null;
  note?: string | null;
}

export default function BeritaSubmissionsPage() {
  const toast = useToast();
  const [items, setItems] = useState<BeritaSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/content/berita/mine');
      setItems(unwrap<BeritaSubmission[]>(res) || []);
    } catch {
      toast('error', 'Gagal memuat riwayat pengajuan berita');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const statusIcon = (status: string) => {
    if (status === 'approved') return <CheckCircle2 size={16} className="text-green-600" />;
    if (status === 'rejected') return <XCircle size={16} className="text-red-600" />;
    return <Clock size={16} className="text-amber-600" />;
  };

  const statusLabel = (status: string) => {
    if (status === 'approved') return 'Disetujui';
    if (status === 'rejected') return 'Ditolak';
    return 'Menunggu Persetujuan';
  };

  return (
    <PermissionGuard module="beritaSubmit" action="view">
      <PageContainer>
        <PageHeader title="Status Pengajuan Berita">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Riwayat berita yang Anda ajukan beserta status persetujuannya.
          </span>
        </PageHeader>

        {loading ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Memuat pengajuan...</p>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
            <Newspaper className="mx-auto mb-3 text-gray-400" size={36} />
            <p className="font-medium text-gray-900 dark:text-white">Belum ada pengajuan berita</p>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              Kirim berita pertama Anda melalui halaman Pengajuan Berita.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                      {item.berita?.judul || 'Berita tidak ditemukan'}
                    </h3>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                      {item.berita?.ringkasan}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {statusIcon(item.status)}
                    <span className="font-medium text-gray-700 dark:text-gray-200">
                      {statusLabel(item.status)}
                    </span>
                  </div>
                </div>
                {item.note ? (
                  <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/40 dark:text-red-200">
                    Catatan admin: {item.note}
                  </p>
                ) : null}
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Diajukan: {new Date(item.submittedAt).toLocaleString()}
                  {item.completedAt
                    ? ` · Selesai: ${new Date(item.completedAt).toLocaleString()}`
                    : ''}
                </p>
              </div>
            ))}
          </div>
        )}
      </PageContainer>
    </PermissionGuard>
  );
}
