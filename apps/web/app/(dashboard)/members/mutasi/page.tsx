'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import { PermissionGuard } from '@/components/auth/permission-guard';
import PageContainer from '@/components/ui/page-container';
import PageHeader from '@/components/ui/page-header';
import { useToast } from '@/components/ui/toast';
import { StatusBadge } from '@/components/members/constants';
import { ArrowLeftRight, CheckCircle2, Loader2, XCircle } from 'lucide-react';

interface ApprovalStep {
  id: string;
  side: string;
  level: string;
  status: string;
  order: number;
  decidedBy?: string | null;
  decidedAt?: string | null;
  note?: string | null;
}

interface MutationRequest {
  id: string;
  anggotaId: string;
  fromRantingId: string;
  toRantingId: string;
  reason: string | null;
  scope: string;
  status: string;
  requestedBy: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectedBy: string | null;
  rejectedAt: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  anggota?: {
    id: string;
    namaLengkap: string;
    nomorAnggota: string;
    rantingId: string;
  };
  fromRanting?: { id: string; nama: string; wilayah?: { id: string; nama: string; distrik?: { id: string; nama: string } } };
  toRanting?: { id: string; nama: string; wilayah?: { id: string; nama: string; distrik?: { id: string; nama: string } } };
  approvals: ApprovalStep[];
  currentStep?: { side: string; level: string } | null;
  canApprove: boolean;
}

const LEVEL_LABELS: Record<string, string> = {
  ranting: 'Admin Ranting',
  wilayah: 'Admin Wilayah',
  distrik: 'Admin Distrik',
};

export default function MutasiPage() {
  const toast = useToast();
  const [tab, setTab] = useState<'pending' | 'all'>('pending');
  const [requests, setRequests] = useState<MutationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('/mutations', { params: { status: tab === 'pending' ? 'pending' : undefined } });
      setRequests(Array.isArray(data) ? data : []);
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const act = async (id: string, action: 'approve' | 'reject', note?: string) => {
    setActingId(id);
    try {
      const { data } = await apiClient.post(`/mutations/${id}/${action}`, { note });
      toast('success', action === 'approve' ? 'Tahap disetujui' : 'Permintaan ditolak');
      fetchList();
      return data;
    } catch (err) {
      const msg = (err as { message?: string })?.message || 'Aksi gagal, coba lagi';
      toast('error', msg);
      return null;
    } finally {
      setActingId(null);
    }
  };

  const pathFrom = (r: MutationRequest) =>
    [r.fromRanting?.nama, r.fromRanting?.wilayah?.nama, r.fromRanting?.wilayah?.distrik?.nama].filter(Boolean).join(' ? ');
  const pathTo = (r: MutationRequest) =>
    [r.toRanting?.nama, r.toRanting?.wilayah?.nama, r.toRanting?.wilayah?.distrik?.nama].filter(Boolean).join(' ? ');

  const visible = tab === 'pending' ? requests.filter((r) => r.status === 'pending') : requests;

  return (
    <PermissionGuard module="members" action="view">
      <PageContainer>
        <PageHeader title="Mutasi Anggota" onRefresh={fetchList}>
          <div className="flex gap-1">
            <button
              onClick={() => setTab('pending')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                tab === 'pending'
                  ? 'bg-blue-600 text-white'
                  : 'border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              Perlu Persetujuan
            </button>
            <button
              onClick={() => setTab('all')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                tab === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              Riwayat
            </button>
          </div>
        </PageHeader>

        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-28 rounded-xl animate-pulse bg-gray-100 dark:bg-gray-800" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="text-center py-16 text-gray-400 dark:text-gray-500 text-sm">
            Tidak ada permintaan mutasi
          </div>
        ) : (
          <div className="space-y-4">
            {visible.map((r) => (
              <div
                key={r.id}
                className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-white dark:bg-gray-800"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/members/${r.anggotaId}`}
                        className="font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400"
                      >
                        {r.anggota?.namaLengkap || 'Anggota'}
                      </Link>
                      <span className="text-xs font-mono text-gray-500">{r.anggota?.nomorAnggota}</span>
                      <StatusBadge status={r.status} />
                      {r.scope === 'nasional' && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
                          Antar Distrik
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 flex-wrap">
                      <span>{pathFrom(r) || r.fromRanting?.nama || '-'}</span>
                      <ArrowLeftRight size={14} className="shrink-0" />
                      <span>{pathTo(r) || r.toRanting?.nama || '-'}</span>
                    </div>
                    {r.reason && <p className="mt-1 text-xs text-gray-500 italic">&ldquo;{r.reason}&rdquo;</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-wide text-gray-400">
                      Diajukan {new Date(r.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                    {r.canApprove && r.status === 'pending' && (
                      <div className="mt-2 flex gap-2 justify-end">
                        <button
                          onClick={() => act(r.id, 'approve')}
                          disabled={actingId === r.id}
                          className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition disabled:opacity-50"
                        >
                          {actingId === r.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                          Setujui
                        </button>
                        <button
                          onClick={() => {
                            if (!window.confirm('Yakin menolak permintaan mutasi ini?')) return;
                            act(r.id, 'reject', window.prompt('Catatan penolakan (opsional):') || undefined);
                          }}
                          disabled={actingId === r.id}
                          className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 transition disabled:opacity-50"
                        >
                          <XCircle size={12} />
                          Tolak
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Rantai persetujuan */}
                <div className="mt-3 border-t border-gray-100 dark:border-gray-700 pt-3">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {r.approvals
                      .slice()
                      .sort((a, b) => a.order - b.order)
                      .map((s, i) => (
                        <span key={s.id} className="flex items-center gap-1.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                              s.status === 'approved'
                                ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                                : s.status === 'rejected'
                                  ? 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'
                                  : 'bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'
                            }`}
                          >
                            {s.side === 'asal' ? 'Asal' : 'Tujuan'} · {LEVEL_LABELS[s.level] || s.level} · {s.status}
                          </span>
                          {i < r.approvals.length - 1 && <span className="text-gray-400 text-xs">→</span>}
                        </span>
                      ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </PageContainer>
    </PermissionGuard>
  );
}