'use client';

import { PermissionGuard } from '@/components/auth/permission-guard';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import Breadcrumbs from '@/components/ui/breadcrumbs';
import {
  ArrowLeft, CheckCircle, XCircle, Clock, AlertTriangle, User, FileText,
  AlertCircle, RefreshCw, ShieldCheck, Send,
} from 'lucide-react';
import { useToast } from '@/components/ui/toast';

interface ApprovalLevel {
  id: string;
  requestId: string;
  approvalLevelId: string;
  status: string;
  decidedBy: string | null;
  decidedAt: string | null;
  note: string | null;
  approvalLevel: { id: string; name: string; order: number; roleName: string };
}

interface ApprovalDetail {
  id: string;
  requestType: string;
  itemId: string;
  status: string;
  submittedBy: string | null;
  createdAt: string;
  completedAt: string | null;
  levels: ApprovalLevel[];
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Menunggu', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400' },
  approved: { label: 'Disetujui', color: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400' },
  rejected: { label: 'Ditolak', color: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400' },
};

const levelStatusIcons: Record<string, React.ReactNode> = {
  pending: <Clock size={14} />,
  approved: <CheckCircle size={14} />,
  rejected: <XCircle size={14} />,
};

const levelStatusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
  approved: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400 border-green-200 dark:border-green-800',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400 border-red-200 dark:border-red-800',
};

const requestTypeLabels: Record<string, string> = {
  member_create: 'Pembuatan Anggota Baru',
  member_update: 'Perubahan Data Anggota',
  claim: 'Pengajuan Klaim',
  letter: 'Pengajuan Surat',
  certificate: 'Pembuatan Sertifikat',
};

export default function ApprovalDetailPage() {
  const toast = useToast();
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [approval, setApproval] = useState<ApprovalDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [note, setNote] = useState('');

  const fetchApproval = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data: res } = await apiClient.get(`/approvals/${id}`);
      setApproval(res.data);
      setError(null);
    } catch {
      setError('Gagal memuat data persetujuan');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchApproval(); }, [fetchApproval]);

  const handleAction = async (action: 'approve' | 'reject') => {
    if (!approval) return;
    setActionLoading(action);
    try {
      await apiClient.post(`/approvals/${approval.id}/${action}`, { note: note || undefined });
      await fetchApproval();
      setNote('');
    } catch {
      toast('error', `Gagal ${action === 'approve' ? 'menyetujui' : 'menolak'} pengajuan`);
    }
    setActionLoading(null);
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-pulse">
        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-36" />
        <div className="bg-white dark:bg-gray-800 rounded-2xl border p-6 space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32" />
        </div>
      </div>
    );
  }

  if (error || !approval) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center max-w-md">
          <AlertCircle size={40} className="mx-auto text-red-400 mb-3" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Pengajuan Tidak Ditemukan</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{error}</p>
          <button onClick={() => router.push('/approvals')} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition">
            ← Kembali ke Persetujuan
          </button>
        </div>
      </div>
    );
  }

  const reqStatus = statusConfig[approval.status] || statusConfig.pending;
  const isPending = approval.status === 'pending';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Breadcrumbs />
      <Link href="/approvals" className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition group">
        <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
        Kembali ke Persetujuan
      </Link>

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className={`h-2 ${approval.status === 'approved' ? 'bg-green-500' : approval.status === 'rejected' ? 'bg-red-500' : 'bg-yellow-500'}`} />
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center shadow-lg ${
                approval.status === 'approved' ? 'bg-gradient-to-br from-green-500 to-emerald-600' :
                approval.status === 'rejected' ? 'bg-gradient-to-br from-red-500 to-rose-600' :
                'bg-gradient-to-br from-yellow-500 to-amber-600'
              }`}>
                {approval.status === 'approved' ? <CheckCircle size={24} className="text-white" /> :
                 approval.status === 'rejected' ? <XCircle size={24} className="text-white" /> :
                 <Clock size={24} className="text-white" />}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">Detail Persetujuan</h1>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${reqStatus.color}`}>
                    {reqStatus.label}
                  </span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{requestTypeLabels[approval.requestType] || approval.requestType}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 font-mono">ID: {approval.id}</p>
              </div>
            </div>
            <button onClick={fetchApproval} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-400" title="Refresh">
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {isPending && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 space-y-4">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <ShieldCheck size={18} className="text-blue-500" />
            Tindakan
          </h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Catatan (opsional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Tambahkan catatan untuk keputusan ini..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => handleAction('approve')}
              disabled={actionLoading !== null}
              className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors shadow-sm flex-1 justify-center"
            >
              {actionLoading === 'approve' ? <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> : <CheckCircle size={16} />}
              Setujui
            </button>
            <button
              onClick={() => handleAction('reject')}
              disabled={actionLoading !== null}
              className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors shadow-sm flex-1 justify-center"
            >
              {actionLoading === 'reject' ? <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> : <XCircle size={16} />}
              Tolak
            </button>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
            <FileText size={18} className="text-blue-500" />
            Informasi Pengajuan
          </h3>
          <div className="space-y-3">
            <InfoRow icon={FileText} label="Tipe" value={requestTypeLabels[approval.requestType] || approval.requestType} />
            <InfoRow icon={User} label="Item ID" value={approval.itemId} />
            <InfoRow icon={Send} label="Diajukan Oleh" value={approval.submittedBy || '-'} />
            <InfoRow icon={Clock} label="Tanggal" value={new Date(approval.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })} />
            {approval.completedAt && (
              <InfoRow icon={Clock} label="Selesai" value={new Date(approval.completedAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })} />
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
            <ShieldCheck size={18} className="text-blue-500" />
            Level Persetujuan
          </h3>
          {approval.levels.length > 0 ? (
            <div className="space-y-3">
              {approval.levels.map((level, idx) => (
                <div key={level.id} className={`px-4 py-3 rounded-xl border ${levelStatusColors[level.status] || 'border-gray-200 dark:border-gray-700'} bg-opacity-50`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {levelStatusIcons[level.status]}
                      <span className="text-sm font-medium">{level.approvalLevel.name}</span>
                    </div>
                    <span className="text-[10px] uppercase tracking-wider opacity-70">{level.status}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-inherit opacity-70">
                    <span>Role: {level.approvalLevel.roleName}</span>
                    {level.decidedAt && <span>· {new Date(level.decidedAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })}</span>}
                  </div>
                  {level.note && (
                    <p className="mt-1 text-xs italic text-inherit opacity-60">Catatan: {level.note}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertTriangle size={28} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-400 dark:text-gray-500">Tidak ada level persetujuan</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
      <PermissionGuard module="approvals" action="view">
        <div className="flex items-start gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
              <Icon size={16} className="text-gray-400 dark:text-gray-500 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">{label}</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{value}</p>
              </div>
            </div>
      </PermissionGuard>
    );
}


