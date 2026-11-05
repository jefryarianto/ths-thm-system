'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import { Download, Check, AlertCircle, CreditCard, Users, type LucideIcon } from 'lucide-react';
import PageContainer from '@/components/ui/page-container';
import PageHeader from '@/components/ui/page-header';
import DataTable from '@/components/ui/data-table';
import { useToast } from '@/components/ui/toast';
import { KtaStatusBadge } from '@/components/kta/KtaStatusBadge';

interface KtaBatch {
  id: string;
  name: string | null;
  submittedByRole: string;
  scopeLevel: string;
  totalSubmitted: number;
  totalApproved: number;
  totalRejected: number;
  totalGenerated: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  applications: KtaApplication[];
}

interface KtaApplication {
  id: string;
  nomorAnggota: string | null;
  status: string;
  diterbitkanAt: string | null;
  createdAt: string;
  anggota: { id: string; namaLengkap: string; nomorAnggota: string };
}

export default function KtaBatchDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const batchId = params.id;

  const [batch, setBatch] = useState<KtaBatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBatch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(`/kta-applications/batches/${batchId}`);
      setBatch(res.data?.data as KtaBatch);
    } catch {
      setError('Gagal memuat detail batch');
    } finally {
      setLoading(false);
    }
  }, [batchId]);

  useEffect(() => {
    if (batchId) fetchBatch();
  }, [batchId, fetchBatch]);

  const handleExport = async (format: 'csv' | 'excel' | 'pdf') => {
    try {
      const res = await apiClient.get(`/kta-applications/batches/${batchId}/export`, {
        params: { format },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data as BlobPart]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `batch-${batchId}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast('success', `Berhasil export ${format.toUpperCase()}`);
    } catch {
      toast('error', `Gagal export ${format.toUpperCase()}`);
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <PageHeader title="Detail Batch KTA" />
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent" />
        </div>
      </PageContainer>
    );
  }

  if (error || !batch) {
    return (
      <PageContainer>
        <PageHeader title="Detail Batch KTA" onRefresh={fetchBatch} />
        <div className="text-center py-20 text-red-600">{error || 'Batch tidak ditemukan'}</div>
      </PageContainer>
    );
  }

  const progress = batch.totalSubmitted > 0 ? (batch.totalApproved / batch.totalSubmitted) * 100 : 0;

  return (
    <PageContainer>
      <PageHeader title="Detail Batch KTA" onRefresh={fetchBatch}>
        <div className="flex items-center gap-2">
          {(['csv', 'excel', 'pdf'] as const).map((fmt) => (
            <button
              key={fmt}
              onClick={() => handleExport(fmt)}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition uppercase"
            >
              <Download size={14} /> {fmt}
            </button>
          ))}
          <button
            onClick={() => router.push('/kta/queue')}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            Kembali
          </button>
        </div>
      </PageHeader>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-border p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                batch.status === 'COMPLETED'
                  ? 'bg-green-100 text-green-700'
                  : batch.status === 'IN_PROGRESS'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-orange-100 text-orange-700'
              }`}
            >
              {batch.status === 'COMPLETED' ? 'Selesai' : batch.status === 'IN_PROGRESS' ? 'Berlangsung' : 'Sebagian'}
            </span>
            <h1 className="text-2xl font-bold mt-2">{batch.name || 'Batch KTA'}</h1>
            <p className="text-sm text-muted mt-1">
              Dibuat oleh <span className="capitalize">{batch.submittedByRole.replace('_', ' ')}</span> •{' '}
              {new Date(batch.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold text-indigo-600">{progress.toFixed(1)}%</div>
            <div className="text-sm text-muted">Progress</div>
          </div>
        </div>

        <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-6">
          <div className="h-full bg-indigo-600 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total" value={batch.totalSubmitted} color="blue" Icon={Users} />
          <StatCard label="Disetujui" value={batch.totalApproved} color="green" Icon={Check} />
          <StatCard label="Ditolak" value={batch.totalRejected} color="red" Icon={AlertCircle} />
          <StatCard label="Digenerate" value={batch.totalGenerated} color="purple" Icon={CreditCard} />
        </div>
      </div>

      <h3 className="text-lg font-semibold mb-4">Daftar Aplikasi ({batch.applications?.length || 0})</h3>
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
            key: 'createdAt',
            label: 'Diajukan',
            render: (app: KtaApplication) => (
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {new Date(app.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            ),
          },
          {
            key: 'diterbitkanAt',
            label: 'Digenerate',
            render: (app: KtaApplication) => (
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {app.diterbitkanAt
                  ? new Date(app.diterbitkanAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
                  : '-'}
              </span>
            ),
          },
        ]}
        data={batch.applications || []}
        loading={loading}
        empty={{ icon: Users, message: 'Belum ada aplikasi di batch ini' }}
        page={1}
        totalPages={1}
        total={batch.applications?.length || 0}
      />
    </PageContainer>
  );
}

function StatCard({
  label,
  value,
  color,
  Icon,
}: {
  label: string;
  value: number;
  color: string;
  Icon: LucideIcon;
}) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-green-100 text-green-700',
    red: 'bg-red-100 text-red-700',
    purple: 'bg-purple-100 text-purple-700',
  };
  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-border">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted">{label}</span>
        <span className={`p-2 rounded-lg ${colorMap[color] || 'bg-gray-100 text-gray-700'}`}>
          <Icon size={20} />
        </span>
      </div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </div>
  );
}
