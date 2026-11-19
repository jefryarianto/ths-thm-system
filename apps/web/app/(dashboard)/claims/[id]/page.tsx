'use client';

import { PermissionGuard } from '@/components/auth/permission-guard';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import Breadcrumbs from '@/components/ui/breadcrumbs';
import {
  ArrowLeft,
  User,
  FileText,
  Calendar,
  CheckCircle2,
  XCircle,
  RefreshCw,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Activity,
} from 'lucide-react';
import { formatDate } from '@/components/members/constants';
import { useToast } from '@/components/ui/toast';

interface ClaimDetail {
  id: string;
  tipe: string;
  status: string;
  catatan: string | null;
  alasanPenolakan: string | null;
  namaLengkap?: string | null;
  jenisKelamin?: string | null;
  tempatLahir?: string | null;
  tanggalLahir?: string | null;
  tempatDadar?: string | null;
  tahunDadar?: string | null;
  alamat?: string | null;
  noHp?: string | null;
  email?: string | null;
  rantingId?: string | null;
  ranting?: {
    id: string;
    nama: string;
  } | null;
  buktiKeanggotaan?: Array<{
    id: string;
    tipe: string;
    fileName: string;
    filePath: string;
    fileSize?: number;
    mimeType?: string;
  }>;
  dokumenPendukung?: Array<{
    id: string;
    fileName: string;
    filePath: string;
    fileSize?: number;
    mimeType?: string;
    description?: string | null;
  }>;
  currentStage?: string;
  ktaApplicationId?: string | null;
  approvalHistories?: Array<{
    id: string;
    stage: string;
    action: string;
    actorRole: string | null;
    catatan?: string | null;
    createdAt: string;
  }>;
  ktaApplication?: {
    id: string;
    status: string;
    biaya?: number | string | null;
    rekeningTujuan?: string | null;
    statusPembayaran?: string | null;
    diterbitkanAt?: string | null;
  } | null;
  anggotaId: string | null;
  anggota: {
    id: string;
    nomorAnggota: string;
    namaLengkap: string;
    email: string | null;
    noHp: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
}

const CLAIM_TIPE_LABELS: Record<string, string> = {
  keanggotaan: 'Keanggotaan',
  dokumen: 'Dokumen',
};

const CLAIM_STATUS_STYLES: Record<string, string> = {
  pending:
    'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
  processed:
    'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  approved:
    'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
  rejected:
    'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
};

const CLAIM_STATUS_LABELS: Record<string, string> = {
  pending: 'Menunggu',
  processed: 'Diproses',
  approved: 'Disetujui',
  rejected: 'Ditolak',
};

export default function ClaimDetailPage() {
  const toast = useToast();
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [claim, setClaim] = useState<ClaimDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [currentRole, setCurrentRole] = useState<string | null>(null);

  useEffect(() => {
    try {
      const token = localStorage.getItem('accessToken');
      const payload = token?.split('.')[1];
      if (!payload) return;
      const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
      const decoded = JSON.parse(atob(normalized)) as { role?: string };
      setCurrentRole(decoded.role || null);
    } catch {
      setCurrentRole(null);
    }
  }, []);

  const fetchClaim = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data: res } = await apiClient.get(`/claims/${id}`);
      setClaim(res.data);
      setError(null);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) setError('Klaim tidak ditemukan');
      else setError('Gagal memuat data klaim');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchClaim();
  }, [fetchClaim]);

  const expectedStageRole: Record<string, string> = {
    ranting: 'admin_ranting',
    wilayah: 'admin_wilayah',
    distrik: 'admin_distrik',
    nasional: 'admin_nasional',
  };
  const canActOnStage = currentRole === 'superadmin' || currentRole === expectedStageRole[claim?.currentStage || ''];
  const currentStageLabel: Record<string, string> = {
    ranting: 'Menunggu verifikasi Admin Ranting',
    wilayah: 'Menunggu verifikasi Admin Wilayah',
    distrik: 'Menunggu verifikasi Admin Distrik',
    nasional: 'Menunggu persetujuan Admin Nasional',
    kta_processing: 'Klaim disetujui — proses KTA di Admin Distrik',
  };

  const handleAction = async (action: string) => {
    if (!claim) return;
    setActionLoading(action);
    try {
      if (action === 'reject') {
        await apiClient.post(`/claims/${claim.id}/reject`, { reason: rejectReason || undefined });
      } else if (action === 'approve') {
        await apiClient.post(`/claims/${claim.id}/approve`, {});
      } else if (action === 'process') {
        await apiClient.post(`/claims/${claim.id}/process`, {});
      }
      setShowRejectInput(false);
      setRejectReason('');
      await fetchClaim();
    } catch (err: unknown) {
      const serverMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast('error', serverMessage || 'Gagal memproses klaim');
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

  if (error || !claim) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center max-w-md">
          <AlertCircle size={40} className="mx-auto text-red-400 mb-3" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {error === 'Klaim tidak ditemukan' ? 'Klaim Tidak Ditemukan' : 'Gagal Memuat Data'}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => router.push('/claims')}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            ← Kembali ke Klaim
          </button>
        </div>
      </div>
    );
  }

  return (
    <PermissionGuard module="claims" action="view">
      <Breadcrumbs suffix={{ href: '#', label: claim?.anggota?.namaLengkap || 'Detail' }} />
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Back */}
        <Link
          href="/claims"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
          Kembali ke Klaim
        </Link>

        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="h-8 bg-gray-100 dark:bg-gray-700 relative">
            <button
              onClick={fetchClaim}
              className="absolute top-3 right-3 p-2 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-sm transition text-white"
              title="Refresh"
            >
              <RefreshCw size={14} />
            </button>
          </div>
          <div className="px-6 pb-6">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              <div className="w-14 h-14 rounded-xl bg-white dark:bg-gray-800 flex items-center justify-center shadow-lg ring-4 ring-white dark:ring-gray-800">
                <FileText size={22} className="text-orange-600" />
              </div>
              <div className="flex-1 mt-2 sm:mt-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                    {CLAIM_TIPE_LABELS[claim.tipe] || claim.tipe}
                  </h1>
                  <span
                    className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${CLAIM_STATUS_STYLES[claim.status] || ''}`}
                  >
                    {CLAIM_STATUS_LABELS[claim.status] || claim.status}
                  </span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Diajukan {formatDate(claim.createdAt)}
                </p>
                {claim.tipe === 'keanggotaan' && claim.currentStage && (
                  <p className="mt-2 text-sm font-medium text-blue-700 dark:text-blue-300">
                    {currentStageLabel[claim.currentStage] || claim.currentStage}
                  </p>
                )}
              </div>
              {/* Actions */}
              <div className="flex items-center gap-2 mt-4 sm:mt-0">
                {claim.tipe === 'keanggotaan' && claim.status === 'pending' && canActOnStage && (
                  <>
                    <button
                      onClick={() => handleAction('approve')}
                      disabled={actionLoading === 'approve'}
                      className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition disabled:opacity-50"
                    >
                      <ThumbsUp size={14} />
                      {actionLoading === 'approve' ? 'Menyetujui...' : `Verifikasi & Eskalasi`}
                    </button>
                    <button
                      onClick={() => setShowRejectInput(true)}
                      disabled={actionLoading === 'reject'}
                      className="flex items-center gap-1.5 px-3 py-2 border border-red-300 dark:border-red-600 text-red-700 dark:text-red-400 rounded-lg text-xs font-medium hover:bg-red-50 dark:hover:bg-red-950 transition"
                    >
                      <ThumbsDown size={14} />
                      Tolak
                    </button>
                  </>
                )}
                {claim.tipe !== 'keanggotaan' && claim.status === 'pending' && (
                  <>
                    <button onClick={() => handleAction('process')} disabled={actionLoading === 'process'} className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition disabled:opacity-50">
                      <Activity size={14} />{actionLoading === 'process' ? 'Memproses...' : 'Proses'}
                    </button>
                    <button onClick={() => handleAction('approve')} disabled={actionLoading === 'approve'} className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition disabled:opacity-50"><ThumbsUp size={14} />Setujui</button>
                    <button onClick={() => setShowRejectInput(true)} disabled={actionLoading === 'reject'} className="flex items-center gap-1.5 px-3 py-2 border border-red-300 dark:border-red-600 text-red-700 dark:text-red-400 rounded-lg text-xs font-medium hover:bg-red-50 dark:hover:bg-red-950 transition"><ThumbsDown size={14} />Tolak</button>
                  </>
                )}
                {claim.tipe !== 'keanggotaan' && claim.status === 'diproses' && (
                  <button onClick={() => handleAction('approve')} disabled={actionLoading === 'approve'} className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition disabled:opacity-50"><CheckCircle2 size={14} />Setujui</button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Reject reason input */}
        {showRejectInput && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-red-200 dark:border-red-800 shadow-sm p-4 space-y-3">
            <p className="text-sm font-medium text-red-700 dark:text-red-400">Alasan Penolakan</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={2}
              placeholder="Masukkan alasan penolakan..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-red-500"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowRejectInput(false);
                  setRejectReason('');
                }}
                className="px-3 py-1.5 border rounded-lg text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                Batal
              </button>
              <button
                onClick={() => handleAction('reject')}
                disabled={actionLoading === 'reject'}
                className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 transition disabled:opacity-50"
              >
                {actionLoading === 'reject' ? 'Memproses...' : 'Konfirmasi Tolak'}
              </button>
            </div>
          </div>
        )}

        {/* Detail */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
              <FileText size={18} className="text-blue-500" />
              Informasi Klaim
            </h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <FileText size={16} className="text-gray-400 dark:text-gray-500 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Tipe</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {CLAIM_TIPE_LABELS[claim.tipe] || claim.tipe}
                  </p>
                </div>
              </div>
              {claim.catatan && (
                <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                  <MessageSquare size={16} className="text-gray-400 dark:text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Catatan</p>
                    <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                      {claim.catatan}
                    </p>
                  </div>
                </div>
              )}
              {claim.alasanPenolakan && (
                <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-950 rounded-xl border border-red-200 dark:border-red-800">
                  <XCircle size={16} className="text-red-500 mt-0.5" />
                  <div>
                    <p className="text-xs text-red-600 uppercase font-medium">Alasan Ditolak</p>
                    <p className="text-sm text-red-700 dark:text-red-400">
                      {claim.alasanPenolakan}
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <Calendar size={16} className="text-gray-400 dark:text-gray-500 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Timeline</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Diajukan: {formatDate(claim.createdAt)}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Terakhir diperbarui: {formatDate(claim.updatedAt)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
              <User size={18} className="text-blue-500" />
              {claim.tipe === 'keanggotaan' ? 'Data Pemohon Klaim' : 'Data Anggota Terkait'}
            </h3>
            <div className="space-y-3">
              {claim.tipe === 'keanggotaan' && (claim.namaLengkap || claim.email || claim.noHp || claim.ranting) ? (
                <>
                  <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                    <User size={16} className="text-gray-400 dark:text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Nama Lengkap</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {claim.namaLengkap || '-'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                      <User size={16} className="text-gray-400 dark:text-gray-500 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Jenis Kelamin</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {claim.jenisKelamin === 'L' ? 'Laki-laki' : claim.jenisKelamin === 'P' ? 'Perempuan' : '-'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                      <Calendar size={16} className="text-gray-400 dark:text-gray-500 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Kelahiran</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {[claim.tempatLahir, claim.tanggalLahir ? formatDate(claim.tanggalLahir) : null]
                            .filter(Boolean)
                            .join(', ') || '-'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {(claim.tempatDadar || claim.tahunDadar) && (
                    <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                      <Calendar size={16} className="text-gray-400 dark:text-gray-500 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Pendadaran (Dadar)</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {[claim.tempatDadar, claim.tahunDadar].filter(Boolean).join(' • ')}
                        </p>
                      </div>
                    </div>
                  )}

                  {claim.ranting && (
                    <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                      <Activity size={16} className="text-gray-400 dark:text-gray-500 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Ranting Asal</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{claim.ranting.nama}</p>
                      </div>
                    </div>
                  )}

                  {claim.noHp && (
                    <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                      <Activity size={16} className="text-gray-400 dark:text-gray-500 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">No. HP</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{claim.noHp}</p>
                      </div>
                    </div>
                  )}

                  {claim.email && (
                    <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                      <MessageSquare size={16} className="text-gray-400 dark:text-gray-500 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Email</p>
                        <p className="text-sm text-gray-900 dark:text-white">{claim.email}</p>
                      </div>
                    </div>
                  )}

                  {claim.alamat && (
                    <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                      <FileText size={16} className="text-gray-400 dark:text-gray-500 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Alamat</p>
                        <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{claim.alamat}</p>
                      </div>
                    </div>
                  )}

                  {claim.anggota && (
                    <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-950/40 rounded-xl border border-green-200 dark:border-green-800">
                      <CheckCircle2 size={16} className="text-green-600 mt-0.5" />
                      <div>
                        <p className="text-xs text-green-700 dark:text-green-400 uppercase font-semibold">Tautan Profil Anggota</p>
                        <Link
                          href={`/members/${claim.anggota.id}`}
                          className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {claim.anggota.namaLengkap} ({claim.anggota.nomorAnggota})
                        </Link>
                      </div>
                    </div>
                  )}
                </>
              ) : claim.anggota ? (
                <>
                  <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                    <User size={16} className="text-gray-400 dark:text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Nama</p>
                      <Link
                        href={`/members/${claim.anggota.id}`}
                        className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {claim.anggota.namaLengkap}
                      </Link>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                    <Calendar size={16} className="text-gray-400 dark:text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">No. Anggota</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white font-mono">
                        {claim.anggota.nomorAnggota}
                      </p>
                    </div>
                  </div>
                  {claim.anggota.email && (
                    <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                      <MessageSquare size={16} className="text-gray-400 dark:text-gray-500 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Email</p>
                        <p className="text-sm text-gray-900 dark:text-white">{claim.anggota.email}</p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="p-3 text-sm text-gray-500 dark:text-gray-400">
                  <em>Tidak ada data pemohon atau anggota terkait</em>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dokumen Bukti & Pendukung */}
        {((claim.buktiKeanggotaan && claim.buktiKeanggotaan.length > 0) ||
          (claim.dokumenPendukung && claim.dokumenPendukung.length > 0)) && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
              <FileText size={18} className="text-orange-500" />
              Berkas Bukti & Dokumen Pendukung
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {claim.buktiKeanggotaan && claim.buktiKeanggotaan.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                    Bukti Keanggotaan
                  </p>
                  {claim.buktiKeanggotaan.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase text-orange-600 dark:text-orange-400">
                          {doc.tipe}
                        </p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {doc.fileName}
                        </p>
                      </div>
                      <a
                        href={`/api/claims/${claim.id}/files/${doc.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline shrink-0"
                      >
                        Lihat / Unduh
                      </a>
                    </div>
                  ))}
                </div>
              )}

              {claim.dokumenPendukung && claim.dokumenPendukung.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                    Dokumen Pendukung
                  </p>
                  {claim.dokumenPendukung.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {doc.fileName}
                        </p>
                        {doc.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {doc.description}
                          </p>
                        )}
                      </div>
                      <a
                        href={`/api/claims/${claim.id}/files/${doc.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline shrink-0"
                      >
                        Lihat / Unduh
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </PermissionGuard>
  );
}
