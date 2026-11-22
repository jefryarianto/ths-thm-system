'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AlertCircle, CheckCircle, ChevronRight, Clock } from 'lucide-react';
import { PublicLayout } from '@/components';
import { SmallLogoSpinner } from '@/components/ui/logo-spinner';
import { STATUS_COLORS, STAGE_COLORS, STAGE_LABELS } from '@/components/claims/constants';

const PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL || '';

const ACTION_LABELS: Record<string, string> = {
  APPROVED: 'Disetujui',
  REJECTED: 'Ditolak',
  SKIPPED: 'Dilewati',
  CREATED: 'Diajukan',
};

interface ApprovalHistory {
  id: string;
  stage: string;
  action: string;
  actorRole?: string;
  catatan?: string | null;
  createdAt: string;
}

interface TrackingData {
  id: string;
  namaLengkap: string;
  status: string;
  currentStage: string;
  createdAt: string;
  updatedAt: string;
  ranting?: { nama: string } | null;
  approvalHistories?: ApprovalHistory[];
}

const formatDate = (value: string) =>
  new Date(value).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export default function ClaimTrackingPage() {
  const params = useParams<{ token: string }>();
  const token = String(params.token || '');
  const [data, setData] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const fetchTracking = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`${PUBLIC_API_URL}/api/public/claims/${encodeURIComponent(token)}`);
        const payload = await res.json();
        if (!res.ok) {
          throw new Error(payload?.message || 'Data klaim tidak ditemukan');
        }
        if (active) setData(payload?.data || null);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Gagal memuat data klaim');
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchTracking();
    return () => {
      active = false;
    };
  }, [token]);

  return (
    <PublicLayout>
      <div className="bg-gradient-to-r from-navy-700 to-navy-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-white/60 text-sm mb-2">
            <Link href="/" className="hover:text-white transition-colors">
              Beranda
            </Link>
            <ChevronRight size={14} />
            <Link href="/klaim" className="hover:text-white transition-colors">
              Klaim
            </Link>
            <ChevronRight size={14} />
            <span className="text-gold-400">Lacak Status</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white">Lacak Status Klaim</h1>
          <p className="text-white/70 mt-3 max-w-2xl text-base">
            Pantau perkembangan pengajuan klaim keanggotaan Anda secara real-time.
          </p>
          <div className="w-16 h-1 bg-gold-400 mt-4 rounded-full" />
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {loading && (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-600 dark:text-gray-400">
            <SmallLogoSpinner size={20} /> Memuat status klaim...
          </div>
        )}

        {!loading && error && (
          <div
            role="alert"
            className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2"
          >
            <AlertCircle size={18} className="text-red-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-700 dark:text-red-400">{error}</p>
              <Link href="/klaim" className="mt-2 inline-block text-sm text-navy-600 hover:underline">
                Ajukan klaim baru
              </Link>
            </div>
          </div>
        )}

        {!loading && !error && data && (
          <div className="space-y-6">
            <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Nomor Klaim
                  </p>
                  <p className="mt-1 font-mono text-sm text-gray-900 dark:text-white">{data.id}</p>
                  <h2 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
                    {data.namaLengkap}
                  </h2>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Ranting {data.ranting?.nama || '-'} · Diajukan {formatDate(data.createdAt)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[data.status] || ''}`}
                  >
                    {data.status}
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${STAGE_COLORS[data.currentStage] || ''}`}
                  >
                    {STAGE_LABELS[data.currentStage] || data.currentStage}
                  </span>
                </div>
              </div>
            </section>

            <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-5">
                Riwayat Persetujuan
              </h2>
              <ol className="relative border-l border-gray-200 dark:border-gray-700 ml-2">
                {(data.approvalHistories || []).map((item) => (
                  <li key={item.id} className="mb-6 ml-6 last:mb-0">
                    <span className="absolute -left-2 flex h-4 w-4 items-center justify-center rounded-full bg-navy-600 ring-4 ring-white dark:ring-gray-800">
                      {item.action === 'REJECTED' ? (
                        <AlertCircle size={10} className="text-white" />
                      ) : (
                        <CheckCircle size={10} className="text-white" />
                      )}
                    </span>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {STAGE_LABELS[item.stage.toLowerCase()] || item.stage} ·{' '}
                        {ACTION_LABELS[item.action] || item.action}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(item.createdAt)}
                      </p>
                    </div>
                    {item.actorRole && (
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Oleh {item.actorRole}
                      </p>
                    )}
                    {item.catatan && (
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{item.catatan}</p>
                    )}
                  </li>
                ))}
                {!data.approvalHistories?.length && (
                  <li className="ml-6 text-sm text-gray-500 dark:text-gray-400">
                    <Clock size={14} className="mr-1 inline" /> Belum ada riwayat persetujuan.
                  </li>
                )}
              </ol>
            </section>

            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              Butuh bantuan?{' '}
              <Link href="/klaim" className="text-navy-600 dark:text-navy-400 hover:underline">
                Informasi pengajuan klaim
              </Link>
            </p>
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
