'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import PageContainer from '@/components/ui/page-container';
import PageHeader from '@/components/ui/page-header';
import { KtaStatusBadge } from '@/components/kta/KtaStatusBadge';
import KtaReviewPanel from '@/components/kta/KtaReviewPanel';
import type { KtaReviewApplication } from '@/components/kta/types';
import { formatRupiah } from '@/lib/format';

export default function KtaDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [app, setApp] = useState<KtaReviewApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(`/kta-applications/${params.id}`);
      setApp(res.data?.data as KtaReviewApplication);
    } catch {
      setError('Gagal memuat detail aplikasi');
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    if (params.id) fetchDetail();
  }, [params.id, fetchDetail]);

  if (loading) {
    return (
      <PageContainer>
        <PageHeader title="Detail KTA" />
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent" />
        </div>
      </PageContainer>
    );
  }

  if (error || !app) {
    return (
      <PageContainer>
        <PageHeader title="Detail KTA" onRefresh={fetchDetail} />
        <div className="text-center py-20 text-red-600">{error || 'Aplikasi tidak ditemukan'}</div>
      </PageContainer>
    );
  }

  const member = app.anggota;

  return (
    <PageContainer>
      <PageHeader title="Detail Aplikasi KTA" onRefresh={fetchDetail}>
        <button
          onClick={() => router.back()}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
        >
          Kembali
        </button>
      </PageHeader>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-border p-6 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{member.namaLengkap}</h1>
            <p className="text-sm text-muted">
              NRA: {member.nomorAnggota || '-'} • {member.ranting?.nama} → {member.ranting?.wilayah?.nama} →{' '}
              {member.ranting?.wilayah?.distrik?.nama}
            </p>
          </div>
          <KtaStatusBadge status={app.status} size="lg" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 text-sm">
          <div>
            <div className="text-muted">Diajukan Oleh</div>
            <div className="font-semibold capitalize">{app.submittedByRole?.replace('_', ' ') || '-'}</div>
          </div>
          <div>
            <div className="text-muted">Diajukan</div>
            <div className="font-semibold">
              {new Date(app.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
            </div>
          </div>
          <div>
            <div className="text-muted">Biaya</div>
            <div className="font-semibold">{app.biaya === null ? '-' : formatRupiah(app.biaya)}</div>
          </div>
          <div>
            <div className="text-muted">Status Bayar</div>
            <div className="font-semibold">{app.statusPembayaran || '-'}</div>
          </div>
        </div>

        {app.rekeningTujuan && (
          <div className="mt-4 text-sm">
            <span className="text-muted">Rekening tujuan: </span>
            <span className="font-semibold">{app.rekeningTujuan}</span>
          </div>
        )}
        {app.catatanAdmin && (
          <div className="mt-4 text-sm">
            <span className="text-muted">Catatan admin: </span>
            <span>{app.catatanAdmin}</span>
          </div>
        )}
      </div>

      <KtaReviewPanel application={app} />
    </PageContainer>
  );
}
