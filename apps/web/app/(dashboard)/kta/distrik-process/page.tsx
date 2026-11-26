'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import { X, CreditCard, Settings, RefreshCw } from 'lucide-react';
import PageContainer from '@/components/ui/page-container';
import PageHeader from '@/components/ui/page-header';
import DataTable from '@/components/ui/data-table';
import Modal from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { KtaStatusBadge } from '@/components/kta/KtaStatusBadge';
import KtaReviewPanel from '@/components/kta/KtaReviewPanel';
import { KTA_STATUS_LABELS } from '@/components/kta/constants';
import type { KtaReviewApplication } from '@/components/kta/types';
import { formatRupiah } from '@/lib/format';

const PROOF_PATH_PREFIX = '/api/uploads/kta-proofs/';
const PROOF_EXTENSION_PATTERN = /\.(jpg|jpeg|png|webp|pdf)$/i;

function hasValidProof(path: string | null | undefined): boolean {
  if (!path) return false;
  const normalized = path.replace(/\\/g, '/');
  if (!normalized.startsWith(PROOF_PATH_PREFIX)) return false;
  const fileName = normalized.slice(PROOF_PATH_PREFIX.length);
  return fileName.startsWith('kta-proof-') && !fileName.includes('/') && PROOF_EXTENSION_PATTERN.test(fileName);
}

export default function KtaDistrikProcessPage() {
  const toast = useToast();
  const [applications, setApplications] = useState<KtaReviewApplication[]>([]);
  const [reviewApplication, setReviewApplication] = useState<KtaReviewApplication | null>(null);
  const [catatan, setCatatan] = useState('');
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/kta-applications/distrik-queue');
      setApplications((res.data?.data as KtaReviewApplication[]) || []);
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

  const openReview = (application: KtaReviewApplication) => {
    setCatatan('');
    setVerifyingId(null);
    setReviewApplication(application);
  };

  const handleVerifyPayment = async (note: string) => {
    if (!reviewApplication || !hasValidProof(reviewApplication.buktiBayarPath)) return;
    const verifyingApplicationId = reviewApplication.id;
    setVerifyingId(verifyingApplicationId);
    try {
      await apiClient.post(`/kta-applications/${verifyingApplicationId}/verify-payment`, {
        buktiPath: '',
        catatan: note,
      });
      toast('success', 'Pembayaran diverifikasi');
      setReviewApplication((current) => (current?.id === verifyingApplicationId ? null : current));
      await fetchQueue();
    } catch {
      toast('error', 'Gagal verifikasi pembayaran');
    } finally {
      setVerifyingId((current) => (current === verifyingApplicationId ? null : current));
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
            render: (app: KtaReviewApplication) => (
              <Link href={`/kta/${app.id}`} className="font-medium hover:underline">
                {app.anggota.namaLengkap}
              </Link>
            ),
          },
          {
            key: 'anggota.nomorAnggota',
            label: 'NRA',
            render: (app: KtaReviewApplication) => (
              <span className="font-mono text-xs text-gray-600 dark:text-gray-400">{app.anggota.nomorAnggota || '-'}</span>
            ),
          },
          { key: 'status', label: 'Status', render: (app: KtaReviewApplication) => <KtaStatusBadge status={app.status} /> },
          {
            key: 'biaya',
            label: 'Biaya',
            render: (app: KtaReviewApplication) => (app.biaya === null ? '-' : formatRupiah(app.biaya)),
          },
          { key: 'rekeningTujuan', label: 'Rekening', render: (app: KtaReviewApplication) => app.rekeningTujuan || '-' },
          {
            key: 'statusPembayaran',
            label: 'Status Bayar',
            render: (app: KtaReviewApplication) => (
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
        actions={(app: KtaReviewApplication) => (
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
                onClick={() => openReview(app)}
                className="px-2 py-1.5 text-xs font-medium text-green-700 hover:text-green-900 hover:bg-green-50 rounded-lg transition"
                title="Tinjau & Verifikasi"
              >
                Tinjau &amp; Verifikasi
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

      <Modal
        open={reviewApplication !== null}
        onClose={() => setReviewApplication(null)}
        title="Tinjau & Verifikasi"
        size="lg"
      >
        {reviewApplication && (
          <>
            <KtaReviewPanel
              application={reviewApplication}
              canVerify={hasValidProof(reviewApplication.buktiBayarPath)}
              catatan={catatan}
              onCatatanChange={setCatatan}
              onVerify={handleVerifyPayment}
              verifying={verifyingId === reviewApplication.id}
            />
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setReviewApplication(null)}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-border text-text hover:bg-surface-variant transition"
              >
                Batal
              </button>
            </div>
          </>
        )}
      </Modal>

      <p className="text-xs text-muted mt-2">
        Status: {KTA_STATUS_LABELS.APPROVED} → {KTA_STATUS_LABELS.PAYMENT_SETUP} → {KTA_STATUS_LABELS.PAYMENT_VERIFIED} →{' '}
        {KTA_STATUS_LABELS.CARD_GENERATED}
      </p>
    </PageContainer>
  );
}
