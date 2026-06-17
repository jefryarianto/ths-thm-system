'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Clock,
  Users,
  UserPlus,
  Award,
} from 'lucide-react';
import Modal from '@/components/ui/modal';
import {
  StatusBadge,
  InfoRow,
  DetailSkeleton,
  STATUS_LABELS,
  formatDate,
} from '@/components/candidates/constants';

// ─── Types ───

interface CandidateDetail {
  id: string;
  namaLengkap: string;
  jenisKelamin: 'L' | 'P';
  tempatLahir: string | null;
  tanggalLahir: string | null;
  alamat: string | null;
  noHp: string | null;
  email: string | null;
  status: string;
  rantingId: string;
  usulOlehUserId: string;
  ranting?: {
    id: string;
    nama: string;
    kodeRanting: string;
    wilayah?: { id: string; nama: string; distrik?: { id: string; nama: string } };
  };
  createdAt: string;
  updatedAt: string;
}

// ─── Page ───

export default function CandidateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [candidate, setCandidate] = useState<CandidateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const fetchCandidate = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data: res } = await apiClient.get(`/candidates/${id}`);
      setCandidate(res.data);
      setError(null);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      const status = (err as any)?.response?.status;
      if (status === 404) setError('Calon anggota tidak ditemukan');
      else if (status === 403) setError('Akses ditolak: di luar cakupan wilayah Anda');
      else setError('Gagal memuat data calon anggota');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCandidate();
  }, [fetchCandidate]);

  const handleApprove = async () => {
    if (!candidate) return;
    setActionLoading('approve');
    try {
      await apiClient.post(`/candidates/${candidate.id}/approve`);
      await fetchCandidate();
    } catch {
      /* ignore */
    }
    setActionLoading(null);
  };

  const handleReject = async () => {
    if (!candidate) return;
    setActionLoading('reject');
    try {
      await apiClient.post(`/candidates/${candidate.id}/reject`, { reason: rejectReason });
      await fetchCandidate();
    } catch {
      /* ignore */
    }
    setActionLoading(null);
    setShowRejectModal(false);
    setRejectReason('');
  };

  if (loading) return <DetailSkeleton />;

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-950 flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} className="text-red-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {error === 'Calon anggota tidak ditemukan' ? 'Tidak Ditemukan' : 'Gagal Memuat Data'}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{error}</p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => router.push('/candidates')}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              ← Kembali
            </button>
            <button
              onClick={fetchCandidate}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition"
            >
              Coba Lagi
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!candidate) return null;

  const initials = candidate.namaLengkap
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  const orgPath =
    [
      candidate.ranting?.wilayah?.distrik?.nama,
      candidate.ranting?.wilayah?.nama,
      candidate.ranting?.nama,
    ]
      .filter(Boolean)
      .join(' › ') || '-';
  return (
    <div className="space-y-6">
      {/* Back */}
      <Link
        href="/candidates"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition group"
      >
        <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
        Kembali ke Calon Anggota
      </Link>

      {/* Profile Header */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-purple-500 via-purple-600 to-indigo-600 relative">
          <button
            onClick={fetchCandidate}
            className="absolute top-3 right-3 p-2 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-sm transition text-white"
            title="Refresh"
          >
            <RefreshCw size={14} />
          </button>
        </div>
        <div className="px-6 pb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 -mt-12">
            <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg ring-4 ring-white dark:ring-gray-800">
              {initials}
            </div>
            <div className="flex-1 mt-2 sm:mt-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  {candidate.namaLengkap}
                </h1>
                <StatusBadge status={candidate.status} />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{orgPath}</p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 mt-4 sm:mt-0">
              {candidate.status === 'diusulkan' && (
                <>
                  <button
                    onClick={handleApprove}
                    disabled={actionLoading === 'approve'}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition disabled:opacity-50"
                  >
                    <CheckCircle2 size={14} />
                    {actionLoading === 'approve' ? 'Memproses...' : 'Setujui → Anggota'}
                  </button>
                  <button
                    onClick={() => setShowRejectModal(true)}
                    disabled={actionLoading === 'reject'}
                    className="flex items-center gap-1.5 px-3 py-2 border border-red-300 dark:border-red-600 text-red-700 dark:text-red-400 rounded-lg text-xs font-medium hover:bg-red-50 dark:hover:bg-red-950 transition disabled:opacity-50"
                  >
                    <XCircle size={14} />
                    Tolak
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Info */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
            <User size={18} className="text-purple-500" />
            Data Pribadi
          </h3>
          <div className="space-y-2">
            <InfoRow icon={User} label="Nama Lengkap" value={candidate.namaLengkap} />
            <InfoRow
              icon={User}
              label="Jenis Kelamin"
              value={candidate.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan'}
            />
            <InfoRow
              icon={Calendar}
              label="Tempat, Tgl Lahir"
              value={
                [
                  candidate.tempatLahir,
                  candidate.tanggalLahir ? formatDate(candidate.tanggalLahir) : null,
                ]
                  .filter(Boolean)
                  .join(', ') || null
              }
            />
            <InfoRow icon={MapPin} label="Alamat" value={candidate.alamat} />
          </div>
        </div>

        {/* Contact & Organization */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
              <Mail size={18} className="text-purple-500" />
              Kontak
            </h3>
            <div className="space-y-2">
              <InfoRow
                icon={Mail}
                label="Email"
                value={candidate.email}
                href={candidate.email ? `mailto:${candidate.email}` : undefined}
              />
              <InfoRow
                icon={Phone}
                label="No. HP"
                value={candidate.noHp}
                href={candidate.noHp ? `tel:${candidate.noHp}` : undefined}
              />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
              <Users size={18} className="text-purple-500" />
              Organisasi
            </h3>
            <div className="space-y-2">
              <InfoRow icon={Users} label="Jalur Organisasi" value={orgPath} />
              <InfoRow
                icon={Calendar}
                label="Tanggal Diusulkan"
                value={formatDate(candidate.createdAt)}
              />
              <InfoRow
                icon={Calendar}
                label="Terakhir Diperbarui"
                value={formatDate(candidate.updatedAt)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
          <Clock size={18} className="text-purple-500" />
          Riwayat Status
        </h3>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
              <UserPlus size={14} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Diusulkan</p>
              <p className="text-xs text-gray-400">{formatDate(candidate.createdAt)}</p>
            </div>
          </div>
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
          <div className="flex items-center gap-3">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                candidate.status === 'diusulkan'
                  ? 'bg-gray-100 dark:bg-gray-700'
                  : candidate.status === 'lulus'
                    ? 'bg-emerald-100 dark:bg-emerald-950'
                    : 'bg-purple-100 dark:bg-purple-950'
              }`}
            >
              {candidate.status === 'lulus' ? (
                <Award size={14} className="text-emerald-600" />
              ) : candidate.status === 'gagal' || candidate.status === 'dibatalkan' ? (
                <XCircle size={14} className="text-red-600" />
              ) : (
                <Clock size={14} className="text-gray-400" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {candidate.status === 'diusulkan'
                  ? 'Menunggu Proses'
                  : STATUS_LABELS[candidate.status]}
              </p>
              <p className="text-xs text-gray-400">
                {candidate.status !== 'diusulkan'
                  ? formatDate(candidate.updatedAt)
                  : 'Belum diproses'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      <Modal
        open={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        title="Tolak Calon Anggota"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
            <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-400">
              Anda akan menolak <strong>{candidate.namaLengkap}</strong> sebagai calon anggota.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Alasan Penolakan (opsional)
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Masukkan alasan penolakan..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-red-500 placeholder-gray-400"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setShowRejectModal(false)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              Batal
            </button>
            <button
              onClick={handleReject}
              disabled={actionLoading === 'reject'}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition disabled:opacity-50"
            >
              {actionLoading === 'reject' ? 'Memproses...' : 'Ya, Tolak'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
