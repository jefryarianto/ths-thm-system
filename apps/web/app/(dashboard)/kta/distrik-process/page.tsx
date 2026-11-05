'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import { Check, X, CreditCard, Settings, RefreshCw } from 'lucide-react';
import PageContainer from '@/components/ui/page-container';
import PageHeader from '@/components/ui/page-header';
import DataTable from '@/components/ui/data-table';
import { useToast } from '@/components/ui/toast';
import { KtaStatusBadge } from '@/components/kta/KtaStatusBadge';
import { KTA_STATUS_LABELS } from '@/components/kta/constants';

interface KtaApplication {
  id: string;
  anggotaId: string;
  nomorAnggota: string | null;
  status: string;
  biaya: number | null;
  rekeningTujuan: string | null;
  statusPembayaran: string;
  diterbitkanAt: string | null;
  catatanAdmin: string | null;
  createdAt: string;
  updatedAt: string;
  anggota: {
    id: string;
    namaLengkap: string;
    nomorAnggota: string;
    ranting: { id: string; nama: string };
  };
}

export default function KtaDistrikProcessPage() {
  const toast = useToast();
  const [applications, setApplications] = useState<KtaApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/kta-applications/distrik-queue');
      setApplications((res.data?.data as KtaApplication[]) || []);
    } catch {
      setError('Gagal memuat antrian distrik');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const handleSetupFee = async (id: string) => {
    const biaya = window.prompt('Masukkan biaya (Rp):');
    if (!biaya || Number.isNaN(Number(biaya))) return;
    const rekening = window.prompt('Rekening tujuan pembayaran:');
    if (!rekening) return;
    const catatan = window.prompt('Catatan (opsional):') ?? '';
    try {
      await apiClient.post(`/kta-applications/${id}/setup-fee`, {
        biaya: Number(biaya),
        rekeningTujuan: rekening,
        catatan,
      });
      toast('success', 'Biaya & rekening berhasil diatur');
      fetchQueue();
    } catch {
      toast('error', 'Gagal mengatur biaya');
    }
  };

  const handleVerifyPayment = async (id: string) => {
    if (!window.confirm('Verifikasi pembayaran KTA ini?')) return;
    try {
      await apiClient.post(`/kta-applications/${id}/verify-payment`, { buktiPath: '' });
      toast('success', 'Pembayaran diverifikasi');
      fetchQueue();
    } catch {
      toast('error', 'Gagal verifikasi pembayaran');
    }
  };

  const handleGenerateCard = async (id: string) => {
    if (!window.confirm('Generate KTA untuk aplikasi ini?')) return;
    try {
      await apiClient.post(`/kta-applications/${id}/generate-card`, { reason: 'baru' });
      toast('success', 'KTA berhasil digenerate');
      fetchQueue();
    } catch {
      toast('error', 'Gagal generate KTA');
    }
  };

  return (
    <PageContainer>
      <PageHeader title="Proses KTA Distrik" onRefresh={fetchQueue} />

      {error && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm px-4 py-3 rounded-xl flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchQueue} className="underline hover:no-underline text-xs">
            Coba lagi
          </button>
        </div>
      )}

      <DataTable
        columns={[
          {
            key: 'anggota.namaLengkap',
            label: 'Nama Anggota',
            render: (app: KtaApplication) => (
              <Link href={`/kta/${app.id}`} className="font-medium hover:underline">
                {app.anggota.namaLengkap}
              </Link>
            ),
          },
          {
            key: 'anggota.nomorAnggota',
            label: 'NRA',
            render: (app: KtaApplication) => (
              <span className="font-mono text-xs text-gray-600 dark:text-gray-400">{app.anggota.nomorAnggota || '-'}</span>
            ),
          },
          { key: 'status', label: 'Status', render: (app: KtaApplication) => <KtaStatusBadge status={app.status} /> },
          {
            key: 'biaya',
            label: 'Biaya',
            render: (app: KtaApplication) =>
              app.biaya ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(app.biaya) : '-',
          },
          { key: 'rekeningTujuan', label: 'Rekening', render: (app: KtaApplication) => app.rekeningTujuan || '-' },
          {
            key: 'statusPembayaran',
            label: 'Status Bayar',
            render: (app: KtaApplication) => (
              <span
                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  app.statusPembayaran === 'LUNAS'
                    ? 'bg-green-100 text-green-700'
                    : app.statusPembayaran === 'MENUNGGU_VERIFIKASI'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {app.statusPembayaran || '-'}
              </span>
            ),
          },
        ]}
        data={applications}
        loading={loading}
        empty={{ icon: RefreshCw, message: 'Tidak ada aplikasi untuk diproses' }}
        page={1}
        totalPages={1}
        total={applications.length}
        actions={(app: KtaApplication) => (
          <div className="flex items-center gap-1">
            {app.status === 'APPROVED' && (
              <button
                onClick={() => handleSetupFee(app.id)}
                className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition"
                title="Atur Biaya & Rekening"
              >
                <Settings size={14} />
              </button>
            )}
            {app.status === 'PAYMENT_SETUP' && (
              <button
                onClick={() => handleSetupFee(app.id)}
                className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition"
                title="Ubah Biaya & Rekening"
              >
                <Settings size={14} />
              </button>
            )}
            {app.status === 'PAYMENT_PENDING' && (
              <button
                onClick={() => handleVerifyPayment(app.id)}
                className="p-1.5 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition"
                title="Verifikasi Pembayaran"
              >
                <Check size={14} />
              </button>
            )}
            {app.status === 'PAYMENT_VERIFIED' && (
              <button
                onClick={() => handleGenerateCard(app.id)}
                className="p-1.5 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition"
                title="Generate KTA"
              >
                <CreditCard size={14} />
              </button>
            )}
            {app.status === 'CARD_GENERATED' && (
              <Link href={`/kta/${app.id}`} title="Lihat KTA">
                <button className="p-1.5 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition" aria-label="Lihat KTA">
                  <CreditCard size={14} />
                </button>
              </Link>
            )}
            {(app.status === 'PAYMENT_SETUP' || app.status === 'PAYMENT_PENDING') && (
              <button
                onClick={() => {
                  if (!window.confirm('Tolak pembayaran KTA ini?')) return;
                  apiClient
                    .patch(`/kta-applications/${app.id}/reject`, { reason: 'Pembayaran ditolak admin' })
                    .then(() => {
                      toast('success', 'Aplikasi ditolak');
                      fetchQueue();
                    })
                    .catch(() => toast('error', 'Gagal menolak'));
                }}
                className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition"
                title="Tolak"
              >
                <X size={14} />
              </button>
            )}
          </div>
        )}
      />
      <p className="text-xs text-muted mt-2">
        Status: {KTA_STATUS_LABELS.APPROVED} → {KTA_STATUS_LABELS.PAYMENT_SETUP} → {KTA_STATUS_LABELS.PAYMENT_VERIFIED} →{' '}
        {KTA_STATUS_LABELS.CARD_GENERATED}
      </p>
    </PageContainer>
  );
}
