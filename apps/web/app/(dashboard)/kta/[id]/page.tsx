'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import PageContainer from '@/components/ui/page-container';
import PageHeader from '@/components/ui/page-header';
import { KtaStatusBadge } from '@/components/kta/KtaStatusBadge';
import { getKtaActionLabel, getKtaLevelLabel } from '@/components/kta/constants';

interface KtaAppHistory {
  id: string;
  level: string;
  action: string;
  actorRole: string;
  catatan: string | null;
  isSkipped: boolean;
  skippedReason: string | null;
  createdAt: string;
}

interface KtaApplication {
  id: string;
  nomorAnggota: string | null;
  status: string;
  biaya: number | null;
  rekeningTujuan: string | null;
  statusPembayaran: string;
  catatanAdmin: string | null;
  createdAt: string;
  updatedAt: string;
  submittedByRole: string;
  anggota: {
    namaLengkap: string;
    nomorAnggota: string;
    ranting: { nama: string; wilayah: { nama: string; distrik: { nama: string } } };
  };
  histories: KtaAppHistory[];
}

export default function KtaDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [app, setApp] = useState<KtaApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(`/kta-applications/${params.id}`);
      setApp(res.data?.data as KtaApplication);
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
              NRA: {member.nomorAnggota || '-'} • {member.ranting.nama} → {member.ranting.wilayah?.nama} →{' '}
              {member.ranting.wilayah?.distrik?.nama}
            </p>
          </div>
          <KtaStatusBadge status={app.status} size="lg" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 text-sm">
          <div>
            <div className="text-muted">Diajukan Oleh</div>
            <div className="font-semibold capitalize">{app.submittedByRole.replace('_', ' ')}</div>
          </div>
          <div>
            <div className="text-muted">Diajukan</div>
            <div className="font-semibold">
              {new Date(app.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
            </div>
          </div>
          <div>
            <div className="text-muted">Biaya</div>
            <div className="font-semibold">
              {app.biaya
                ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(app.biaya)
                : '-'}
            </div>
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

      <h3 className="text-lg font-semibold mb-4">Riwayat Proses</h3>
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-border p-6">
        {app.histories.length === 0 ? (
          <p className="text-muted text-sm">Belum ada riwayat.</p>
        ) : (
          <ol className="relative border-l border-gray-200 dark:border-gray-700 ml-3 space-y-6">
            {app.histories.map((h) => (
              <li key={h.id} className="ml-6">
                <span className="absolute -left-[7px] mt-1.5 flex h-3 w-3 rounded-full ring-4 ring-white dark:ring-gray-800 bg-indigo-600" />
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 text-xs font-medium rounded-full">
                    {getKtaLevelLabel(h.level)}
                  </span>
                  <span className="text-sm font-medium">{getKtaActionLabel(h.action)}</span>
                  <span className="text-xs text-muted capitalize">oleh {h.actorRole.replace('_', ' ')}</span>
                  <span className="text-xs text-muted">
                    {new Date(h.createdAt).toLocaleDateString('id-ID', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                {h.catatan && <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{h.catatan}</p>}
                {h.isSkipped && (
                  <p className="mt-1 text-xs text-orange-600">Di-skip: {h.skippedReason || 'Auto-skip'}</p>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    </PageContainer>
  );
}
