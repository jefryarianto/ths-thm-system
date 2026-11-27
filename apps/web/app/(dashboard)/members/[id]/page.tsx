'use client';

import { PermissionGuard } from '@/components/auth/permission-guard';
import { KtaCard } from '@/components/kta/KtaCard';
import type { Tingkatan } from '@/components/kta/types';
import { getLevelVisual } from '@/lib/card-design';
import { previewDigitalCardImage } from '@/lib/kta/preview';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import { formatPeriode, formatTempatTanggalLahir } from '@/lib/format';
import ProfileHeader from '@/components/ui/profile-header';
import Breadcrumbs from '@/components/ui/breadcrumbs';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield,
  CheckCircle2,
  UserX,
  FileText,
  CreditCard,
  Award,
  AlertCircle,
  ExternalLink,
  Trash2,
  BadgeCheck,
  Users,
  IdCard,
  Download,
  Image,
  Printer,
  Pencil,
  AlertTriangle,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  History,
  Lock,
  Unlock,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import Modal from '@/components/ui/modal';
import EditMemberModal from '@/components/members/EditMemberModal';
import {
  StatusBadge,
  InfoRow,
  DetailStats,
  DetailSkeleton,
  DUES_STATUS_STYLES,
  FLAT_STATUS_LABELS,
  formatDate,
  formatRupiah,
  toProperCase,
} from '@/components/members/constants';
import { useToast } from '@/components/ui/toast';
import { logError } from '@/lib/error-logger';
import { LogoSpinner } from '@/components/ui/logo-spinner';
import { MemberAvatar } from '@/components/ui/member-avatar';

// ─── Types ───

/** ISO (`YYYY-MM-DD…`) atau `YYYY-MM` → `YYYY-MM` (format EXP di KtaCard). */
function toYearMonth(value?: string | null): string | undefined {
  const match = value?.match(/^(\d{4})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}` : undefined;
}

interface MemberDetail {
  id: string;
  nomorAnggota: string;
  namaLengkap: string;
  jenisKelamin: 'L' | 'P';
  tempatLahir: string | null;
  tanggalLahir: string | null;
  tempatDadar: string | null;
  tahunDadar: string | null;
  pelantikan?: string | null;
  alamat: string | null;
  noHp: string | null;
  email: string | null;
  fotoPath: string | null;
  tanggalBerlakuSampai: string | null;
  pekerjaan?: string | null;
  statusKeanggotaan: string;
  tingkat: string | null;
  statusData: string;
  statusValidasi: string;
  missingFields: string[] | null;
  rantingId: string;
  ranting?: {
    id: string;
    nama: string;
    kodeRanting: string;
    lokasiLatihan: string | null;
    wilayah?: {
      id: string;
      nama: string;
      distrik?: { id: string; nama: string; alamat?: string | null };
    };
  };
  dokumen: DocumentItem[];
  iuran: DuesItem[];
  createdAt: string;
  updatedAt: string;
}

interface DocumentItem {
  id: string;
  tipe: string;
  nomorDokumen: string;
  status: string;
  verificationUrl?: string | null;
  filePath?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Label tipe dokumen - sesuai enum TipeDokumen di Prisma. */
const DOKUMEN_TIPE_LABEL: Record<string, string> = {
  kartu_anggota: 'Kartu Anggota (KTA)',
  sertifikat_pendadaran: 'Sertifikat Pendadaran',
  sertifikat_pelatihan: 'Sertifikat Pelatihan',
  piagam_prestasi: 'Piagam Prestasi',
};

/** Label & warna badge untuk status dokumen (enum StatusDokumen). */
const DOKUMEN_STATUS_META: Record<string, { label: string; className: string }> = {
  generated: {
    label: 'Ter-generate',
    className: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400',
  },
  downloaded: {
    label: 'Diunduh',
    className: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400',
  },
  revoked: {
    label: 'Dicabut',
    className: 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400',
  },
};

function docStatusMeta(status: string) {
  return DOKUMEN_STATUS_META[status] || { label: status, className: '' };
}

function formatDateTime(iso?: string | null) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Ambil token verifikasi dari verificationUrl (/verify/<token> atau /api/documents/verify/<token>). */
function docVerificationToken(verificationUrl?: string | null): string | null {
  if (!verificationUrl) return null;
  const m = verificationUrl.match(/\/verify\/([^/?#]+)/);
  return m ? m[1] : null;
}

interface DuesItem {
  id: string;
  periode: string;
  jumlah: number;
  status: string;
  tanggalBayar: string | null;
  createdAt: string;
}

// ─── Page Component ───

/** Tumpukan strip tingkatan (simbol balok) — dipakai di badge header & InfoRow,.
 * Konsisten dengan desain kartu (pakai `color` dari getLevelVisual/LEVELS). */
function LevelStrips({
  count,
  color,
  title,
  className = '',
}: {
  count: number;
  color: string;
  title?: string;
  className?: string;
}) {
  if (count <= 0) return null;
  return (
    <span
      title={title}
      aria-hidden
      className={`inline-flex flex-col items-center gap-[2px] rounded-[3px] ${className}`}
      style={{
        width: 18,
        padding: '2px 3px',
        backgroundColor: `${color}1f`,
        border: `1px solid ${color}4d`,
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} style={{ width: 12, height: 3, borderRadius: 1, backgroundColor: color }} />
      ))}
    </span>
  );
}
export default function MemberDetailPage() {
  const toast = useToast();
  const params = useParams();
  const auth = useAuth();
  const router = useRouter();
  const id = params?.id as string;

  const [member, setMember] = useState<MemberDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get('tab') as 'info' | 'documents' | 'dues' | 'card' | null;
  const [activeTab, setActiveTab] = useState<'info' | 'documents' | 'dues' | 'card'>(
    tabFromUrl || 'info',
  );
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showResetKtaModal, setShowResetKtaModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [cardData, setCardData] = useState<{
    qrCode: string;
    fotoDataUrl?: string | null;
    tanggalBerlakuSampai?: string | null;
    tanggalPelantikan?: string | null;
    pekerjaan?: string | null;
    verificationUrl?: string | null;
    signerName?: string;
    signerTitle?: string;
    signers?: Array<{ signerName?: string; signerTitle?: string }>;
    signatureImage?: string | null;
    stampImage?: string | null;
    levelVisual?: { stripCount: number; color: string; label?: string } | null;
    template?: {
      frontImage?: string | null;
      backImage?: string | null;
      overlayConfig?: Record<string, unknown>;
    } | null;
  } | null>(null);
  const [cardLoading, setCardLoading] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const [cardSecurity, setCardSecurity] = useState<{
    dokumen: { id: string; nomorDokumen: string; status: string };
    qr: { isValid: boolean; scanCount: number; scannedAt: string | null; createdAt: string };
    scanLimit: number;
    scanLeft: number;
    scanLog: Array<{
      id: string;
      scannedAt: string;
      ipAddress: string | null;
      userAgent: string | null;
    }>;
  } | null>(null);
  const [cardIssuances, setCardIssuances] = useState<Array<{
    id: string;
    source: 'digital' | 'printed';
    reason: string | null;
    edisi: number;
    isValid: boolean;
    scanCount: number;
    scannedAt: string | null;
    verificationUrl: string | null;
    createdAt: string;
  }> | null>(null);

  const fetchMember = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data: res } = await apiClient.get(`/members/${id}`);
      setMember(res.data);
      setError(null);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      // apiClient menormalkan semua error menjadi { status, message, data }
      // (tanpa `.response`). Baca `status`/`message` langsung agar penyebab
      // sebenarnya (403/404/5xx) tidak tertutup pesan generik.
      const status = err?.status ?? err?.response?.status;
      const apiMessage = err?.message ?? err?.response?.data?.message;
      if (status === 404) setError('Anggota tidak ditemukan');
      else if (status === 403) setError('Akses ditolak: di luar cakupan wilayah Anda');
      else if (status === 401) setError('Sesi Anda berakhir. Silakan masuk kembali.');
      else if (status === 0)
        setError('Tidak dapat terhubung ke server. Periksa koneksi lalu coba lagi.');
      else if (apiMessage && apiMessage !== 'Gagal memuat data anggota') setError(apiMessage);
      else setError('Gagal memuat data anggota');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchMember();
  }, [fetchMember]);

  // Fetch digital card data when card tab is active
  const fetchCardData = useCallback(async () => {
    if (!member) return;
    setCardLoading(true);
    setCardError(null);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(
        `${window.location.origin}/api/members/${member.id}/digital-card`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = await response.json();
      if (response.ok && data.success) {
        setCardData({
          qrCode: data.data.qrCode,
          fotoDataUrl: data.data.fotoDataUrl || null,
          tanggalBerlakuSampai: data.data.member?.tanggalBerlakuSampai || null,
          tanggalPelantikan: data.data.member?.tanggalPelantikan || data.data.member?.pelantikan || null,
          pekerjaan: data.data.member?.pekerjaan || null,
          verificationUrl: data.data.card?.verificationUrl || null,
          signerName: data.data.card?.signerName,
          signerTitle: data.data.card?.signerTitle,
          signers: data.data.card?.signers || undefined,
          signatureImage: data.data.signatureImage || null,
          stampImage: data.data.stampImage || null,
          levelVisual: data.data.levelVisual || null,
          template: data.data.template || null,
        });
        setCardError(null);
      } else {
        setCardData(null);
        setCardError(
          response.status === 403
            ? 'Kartu tidak dapat diakses untuk anggota ini: berada di luar cakupan data Anda.'
            : (data?.message as string) || 'Gagal memuat data kartu.',
        );
      }
    } catch (err) {
      // Jaringan/parse error
      setCardData(null);
      setCardError('Gagal memuat data kartu. Periksa koneksi lalu coba lagi.');
    } finally {
      setCardLoading(false);
    }
  }, [member]);

  // Status keamanan QR & riwayat pemindaian (panel di tab Kartu Digital)
  const fetchCardSecurity = useCallback(async () => {
    if (!member) return;
    try {
      const { data: res } = await apiClient.get(`/members/${member.id}/digital-card/security`);
      setCardSecurity(res?.data ?? null);
    } catch {
      setCardSecurity(null);
    }
  }, [member]);

  useEffect(() => {
    if (activeTab === 'card' && member) {
      fetchCardSecurity();
    }
  }, [activeTab, member, fetchCardSecurity]);

  // Riwayat penerbitan kartu (digital & fisik)
  const fetchCardIssuances = useCallback(async () => {
    if (!member) return;
    try {
      const { data: res } = await apiClient.get(`/members/${member.id}/digital-card/issuances`);
      setCardIssuances(res?.data?.issuances ?? []);
    } catch {
      setCardIssuances(null);
    }
  }, [member]);

  useEffect(() => {
    if (activeTab === 'card' && member) {
      fetchCardIssuances();
    }
  }, [activeTab, member, fetchCardIssuances]);

  /** Terbitkan kartu fisik — alasan hilang/rusak akan mencabut kartu fisik lama. */
  const issuePrintedCard = async (reason: string | null = null) => {
    if (!member) return;
    setActionLoading('card-print');
    try {
      const { data: res } = await apiClient.post(`/members/${member.id}/digital-card/printed`, {
        reason,
      });
      toast('success', 'Kartu fisik diterbitkan');
      await Promise.all([fetchCardIssuances(), fetchCardSecurity(), fetchCardData()]);
      if (res?.data?.pdfUrl) {
        window.open(`${window.location.origin}${res.data.pdfUrl}`, '_blank');
      }
    } catch {
      toast('error', 'Gagal menerbitkan kartu fisik');
    }
    setActionLoading(null);
  };

  /** Cabut / aktifkan kembali kartu digital (per-penerbitan). */
  const toggleCardActive = async (activate: boolean) => {
    if (!member) return;
    setActionLoading(activate ? 'card-activate' : 'card-revoke');
    try {
      await apiClient.patch(
        `/members/${member.id}/digital-card/${activate ? 'activate' : 'revoke'}`,
        {},
      );
      toast(
        'success',
        activate ? 'Kartu diaktifkan kembali' : 'Kartu dicabut — QR tidak lagi berlaku',
      );
      await Promise.all([fetchCardSecurity(), fetchCardData()]);
    } catch {
      toast('error', 'Gagal memperbarui status kartu');
    }
    setActionLoading(null);
  };

  useEffect(() => {
    if (activeTab === 'card' && member) {
      fetchCardData();
    }
  }, [activeTab, member, fetchCardData]);

  const handleAction = async (action: string) => {
    if (!member) return;
    setActionLoading(action);
    try {
      let endpoint = '';
      if (action === 'suspend' || action === 'reactivate') {
        endpoint = `/members/${member.id}/${action}`;
        await apiClient.patch(endpoint, {});
      } else {
        endpoint = `/members/${member.id}/${action}`;
        await apiClient.post(endpoint, {});
      }
      await fetchMember();
    } catch (err) {
      const apiError = (err as { response?: { data?: { message?: string } } })?.response?.data
        ?.message;
      toast(
        'error',
        apiError ||
          `Gagal ${action === 'suspend' ? 'menonaktifkan' : action === 'reactivate' ? 'mengaktifkan kembali' : 'memproses'} anggota`,
      );
    }
    setActionLoading(null);
  };

  const handleResendCredentials = async () => {
    if (!member) return;
    setActionLoading('resend');
    try {
      await apiClient.post(`/members/${member.id}/resend-credentials`, {});
      toast('success', 'Credential berhasil dikirim ulang');
      await fetchMember();
    } catch (err) {
      const apiError = (err as { message?: string })?.message || 'Gagal mengirim ulang credential';
      toast('error', apiError);
    }
    setActionLoading(null);
  };

  /** Download file KTA (PDF 2 sisi / PNG 2 sisi) langsung dari API. */
  const downloadKTA = async (memberId: string, format: 'pdf' | 'image') => {
    try {
      const token = localStorage.getItem('accessToken');
      const endpoint =
        format === 'pdf'
          ? `${window.location.origin}/api/members/${memberId}/digital-card/pdf`
          : // PNG digital diberi watermark anti-fotokopi (nama + nomor anggota).
            `${window.location.origin}/api/members/${memberId}/digital-card/image?watermark=1`;
      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        toast('error', 'Gagal membuat file KTA. Coba lagi.');
        return;
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download =
        format === 'pdf'
          ? `KTA-${member?.nomorAnggota || memberId}.pdf`
          : `KTA-${member?.nomorAnggota || memberId}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast('success', format === 'pdf' ? 'PDF KTA berhasil diunduh' : 'PNG KTA berhasil diunduh');
    } catch (err) {
      logError(err, { module: 'Members', action: 'download-kta' });
      toast('error', 'Gagal mengunduh KTA. Silakan coba lagi.');
    }
  };

  const previewKTA = async (memberId: string) => {
    try {
      await previewDigitalCardImage(memberId);
    } catch (err) {
      logError(err, { module: 'Members', action: 'preview-kta' });
      toast('error', 'Gagal memuat KTA. Silakan coba lagi.');
    }
  };

  /** Download file dokumen tersimpan (sertifikat/piagam) dari /documents/:id/file. */
  const downloadDocumentFile = async (docId: string, filename: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${window.location.origin}/api/documents/${docId}/file`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        toast('error', 'File dokumen belum tersedia. Generate ulang dokumen.');
        return;
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast('success', 'File dokumen berhasil diunduh');
    } catch {
      toast('error', 'Gagal mengunduh dokumen. Silakan coba lagi.');
    }
  };

  const handleDelete = async () => {
    if (!member) return;
    setActionLoading('delete');
    try {
      await apiClient.delete(`/members/${member.id}`);
    } catch (err) {
      const apiError = (err as { response?: { data?: { message?: string } } })?.response?.data
        ?.message;
      toast('error', apiError || 'Gagal menghapus anggota');
      setActionLoading(null);
      setShowDeleteModal(false);
      return;
    }
    router.push('/members');
  };

  const handleResetKta = async () => {
    if (!member) return;
    setActionLoading('reset-kta');
    try {
      const { data } = await apiClient.post(`/kta-applications/members/${member.id}/reset`);
      const res = data?.data ?? data;
      toast(
        'success',
        res?.deletedApplications
          ? `KTA direset: ${res.deletedApplications} pengajuan dihapus, ${res.revokedDocuments} kartu dicabut`
          : 'Tidak ada data KTA untuk direset',
      );
      setShowResetKtaModal(false);
      await fetchMember();
    } catch (err) {
      const apiError = (err as { response?: { data?: { message?: string } } })?.response?.data
        ?.message;
      toast('error', apiError || 'Gagal mereset KTA');
    } finally {
      setActionLoading(null);
    }
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
            {error === 'Anggota tidak ditemukan' ? 'Anggota Tidak Ditemukan' : 'Gagal Memuat Data'}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {error === 'Anggota tidak ditemukan'
              ? 'Anggota yang Anda cari mungkin telah dihapus atau tidak tersedia.'
              : error}
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => router.push('/members')}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              ← Kembali
            </button>
            <button
              onClick={fetchMember}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition"
            >
              Coba Lagi
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!member) return null;

  const iuranList = member.iuran ?? [];
  const dokumenList = member.dokumen ?? [];
  const totalPaid = iuranList
    .filter((d: DuesItem) => d.status === 'lunas')
    .reduce((sum: number, d: DuesItem) => sum + Number(d.jumlah), 0);

  const totalDues = iuranList.length;
  const paidDues = iuranList.filter((d: DuesItem) => d.status === 'lunas').length;

  const orgPath =
    [member.ranting?.wilayah?.distrik?.nama, member.ranting?.wilayah?.nama, member.ranting?.nama]
      .filter(Boolean)
      .join(' → ') || '-';

  const levelVisual = getLevelVisual(member.tingkat, cardData?.levelVisual || null);

  return (
    <PermissionGuard module="members" action="view">
      <Breadcrumbs suffix={{ href: '#', label: toProperCase(member?.namaLengkap || 'Detail') }} />
      <div className="space-y-6">
        {/* ── Back Button ── */}
        <Link
          href="/members"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
          Kembali ke Daftar Anggota
        </Link>

        {/* ── Profile Header ── */}
        <ProfileHeader
          name={toProperCase(member.namaLengkap)}
          subtitle={orgPath}
          meta={member.nomorAnggota}
          hideGradient
          avatar={{
            src: member.fotoPath ? `/api/uploads/${member.fotoPath}` : null,
            fallbackNode: <MemberAvatar name={member.namaLengkap} className="w-full h-full text-xl" />,
            onUpload: async (file) => {
              try {
                const token = localStorage.getItem('accessToken');
                const formData = new FormData();
                formData.append('photo', file);
                const res = await fetch(`/api/upload/member-photo/${member.id}`, {
                  method: 'POST',
                  headers: { Authorization: `Bearer ${token}` },
                  body: formData,
                });
                const data = await res.json();
                if (data.success) await fetchMember();
                else toast('error', data.message || 'Gagal upload foto');
              } catch {
                toast('error', 'Gagal upload foto. Silakan coba lagi.');
              }
            },
          }}
          badges={[
            <StatusBadge key="keanggotaan" status={member.statusKeanggotaan} bordered />,
            <StatusBadge key="validasi" status={member.statusValidasi} bordered />,
            <StatusBadge key="data" status={member.statusData} bordered />,
            ...(member.tingkat
              ? [
                  <span
                    key="tingkat"
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-400"
                  >
                    <Award size={12} />
                    {member.tingkat}
                    {levelVisual.stripCount > 0 && (
                      <LevelStrips
                        count={levelVisual.stripCount}
                        color={levelVisual.color}
                        title={`${levelVisual.label} · ${levelVisual.stripCount} strip`}
                      />
                    )}
                  </span>,
                ]
              : []),
          ]}
          onRefresh={fetchMember}
          actions={
            <>
              {member.statusValidasi === 'pending' && (
                <button
                  onClick={() => handleAction('approve')}
                  disabled={actionLoading === 'approve'}
                  className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition disabled:opacity-50"
                >
                  <CheckCircle2 size={14} />
                  {actionLoading === 'approve' ? 'Memproses...' : 'Setujui'}
                </button>
              )}
              {member.statusKeanggotaan === 'aktif' ? (
                <button
                  onClick={() => handleAction('suspend')}
                  disabled={actionLoading === 'suspend'}
                  className="flex items-center gap-1.5 px-3 py-2 border border-yellow-300 dark:border-yellow-600 text-yellow-700 dark:text-yellow-400 rounded-lg text-xs font-medium hover:bg-yellow-50 dark:hover:bg-yellow-950 transition disabled:opacity-50"
                >
                  <UserX size={14} />
                  {actionLoading === 'suspend' ? 'Memproses...' : 'Nonaktifkan'}
                </button>
              ) : member.statusKeanggotaan === 'nonaktif' ? (
                <button
                  onClick={() => handleAction('reactivate')}
                  disabled={actionLoading === 'reactivate'}
                  className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition disabled:opacity-50"
                >
                  <Shield size={14} />
                  {actionLoading === 'reactivate' ? 'Memproses...' : 'Aktifkan'}
                </button>
              ) : null}
              {member.statusValidasi === 'rejected' && (
                <button
                  onClick={() => handleAction('approve')}
                  disabled={actionLoading === 'approve'}
                  className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition disabled:opacity-50"
                >
                  <BadgeCheck size={14} />
                  Setujui
                </button>
              )}
              <button
                onClick={() => setShowEditModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition"
              >
                <Pencil size={14} />
                Edit
              </button>
              {(auth.role === 'superadmin' || auth.role === 'admin_nasional') &&
              member.nomorAnggota ? (
                <button
                  onClick={() => setShowResetKtaModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 border border-red-300 dark:border-red-600 text-red-700 dark:text-red-400 rounded-lg text-xs font-medium hover:bg-red-50 dark:hover:bg-red-950 transition"
                >
                  <RotateCcw size={14} />
                  Reset KTA
                </button>
              ) : null}
              <button
                onClick={handleResendCredentials}
                disabled={actionLoading === 'resend'}
                className="flex items-center gap-1.5 px-3 py-2 border border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-400 rounded-lg text-xs font-medium hover:bg-blue-50 dark:hover:bg-blue-950 transition disabled:opacity-50"
              >
                <Mail size={14} />
                {actionLoading === 'resend' ? 'Mengirim...' : 'Kirim Ulang Credential'}
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 transition text-gray-400 hover:text-red-500"
                title="Hapus anggota"
              >
                <Trash2 size={16} />
              </button>
            </>
          }
        />

        {/* ── Summary Cards ── */}
        <DetailStats
          createdAt={member.createdAt}
          dokumenCount={dokumenList.length}
          paidDues={paidDues}
          totalDues={totalDues}
          rantingNama={member.ranting?.nama || '-'}
        />

        {/* ── Tabs ── */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-6">
            {[
              { key: 'info', label: 'Informasi Pribadi', icon: User },
              { key: 'documents', label: `Dokumen (${dokumenList.length})`, icon: FileText },
              { key: 'dues', label: `Riwayat Iuran (${totalDues})`, icon: CreditCard },
              { key: 'card', label: `Kartu Digital`, icon: IdCard },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as typeof activeTab)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition ${
                    isActive
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Tab: Info Pribadi ── */}
        {activeTab === 'info' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Personal Info */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                <User size={18} className="text-blue-500" />
                Data Pribadi
              </h3>
              <div className="space-y-2">
                <InfoRow
                  icon={User}
                  label="Nama Lengkap"
                  value={toProperCase(member.namaLengkap)}
                />
                <InfoRow
                  icon={User}
                  label="Jenis Kelamin"
                  value={member.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan'}
                />
                <InfoRow
                  icon={Calendar}
                  label="Tempat, Tgl Lahir"
                  value={
                    [
                      member.tempatLahir,
                      member.tanggalLahir ? formatDate(member.tanggalLahir) : null,
                    ]
                      .filter(Boolean)
                      .join(', ') || null
                  }
                />
                <InfoRow
                  icon={Calendar}
                  label="Tempat - Tahun Dadar"
                  value={
                    [member.tempatDadar, member.tahunDadar].filter(Boolean).join(' - ') || null
                  }
                />
                <InfoRow icon={MapPin} label="Alamat" value={member.alamat} />
              </div>
            </div>

            {/* Contact & Organization */}
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                  <Mail size={18} className="text-blue-500" />
                  Kontak
                </h3>
                <div className="space-y-2">
                  <InfoRow
                    icon={Mail}
                    label="Email"
                    value={member.email}
                    href={member.email ? `mailto:${member.email}` : undefined}
                  />
                  <InfoRow
                    icon={Phone}
                    label="No. HP"
                    value={member.noHp}
                    href={member.noHp ? `tel:${member.noHp}` : undefined}
                  />
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                  <Users size={18} className="text-blue-500" />
                  Organisasi
                </h3>
                <div className="space-y-2">
                  <InfoRow icon={Users} label="Jalur Organisasi" value={orgPath} />
                  <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                    <div className="p-2 rounded-lg bg-white dark:bg-gray-700 shadow-sm">
                      <Award size={16} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Tingkatan
                      </p>
                      {member.tingkat ? (
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {member.tingkat}
                          </span>
                          {levelVisual.stripCount > 0 && (
                            <LevelStrips
                              count={levelVisual.stripCount}
                              color={levelVisual.color}
                              title={`${levelVisual.label} · ${levelVisual.stripCount} strip`}
                            />
                          )}
                        </div>
                      ) : (
                        <p className="text-sm font-medium text-gray-400 dark:text-gray-500 italic mt-0.5">
                          Tidak ada data
                        </p>
                      )}
                    </div>
                  </div>
                  <InfoRow
                    icon={Calendar}
                    label="Terakhir Diperbarui"
                    value={formatDate(member.updatedAt)}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab: Dokumen ── */}
        {activeTab === 'documents' && (
          <div className="space-y-4">
            {/* Ringkasan per tipe dokumen */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(
                [
                  'kartu_anggota',
                  'sertifikat_pendadaran',
                  'sertifikat_pelatihan',
                  'piagam_prestasi',
                ] as const
              ).map((t) => {
                const count = dokumenList.filter((d: DocumentItem) => d.tipe === t).length;
                return (
                  <div
                    key={t}
                    className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4"
                  >
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {DOKUMEN_TIPE_LABEL[t]}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{count}</p>
                  </div>
                );
              })}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <FileText size={18} className="text-blue-500" />
                  Daftar Dokumen
                </h3>
                <span className="text-xs text-gray-400">{dokumenList.length} dokumen</span>
              </div>
              {dokumenList.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                        <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400">
                          Tipe Dokumen
                        </th>
                        <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400">
                          No. Dokumen
                        </th>
                        <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400">
                          Status
                        </th>
                        <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400 hidden md:table-cell">
                          Dibuat
                        </th>
                        <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400 hidden lg:table-cell">
                          Diperbarui
                        </th>
                        <th className="text-right px-5 py-3 font-medium text-gray-500 dark:text-gray-400">
                          Aksi
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {member.dokumen.map((doc) => {
                        const statusMeta = docStatusMeta(doc.status);
                        const verifyToken = docVerificationToken(doc.verificationUrl);
                        const filePath = doc.filePath;
                        return (
                          <tr
                            key={doc.id}
                            className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition"
                          >
                            <td className="px-5 py-3">
                              <span className="font-medium text-gray-900 dark:text-white">
                                {DOKUMEN_TIPE_LABEL[doc.tipe] || doc.tipe || '-'}
                              </span>
                            </td>
                            <td className="px-5 py-3">
                              <span className="font-mono text-xs text-blue-700 dark:text-blue-400">
                                {doc.nomorDokumen || '-'}
                              </span>
                            </td>
                            <td className="px-5 py-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusMeta.className || 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}
                              >
                                {statusMeta.label}
                              </span>
                            </td>
                            <td className="px-5 py-3 hidden md:table-cell text-xs text-gray-500">
                              {formatDate(doc.createdAt)}
                            </td>
                            <td className="px-5 py-3 hidden lg:table-cell text-xs text-gray-500">
                              {doc.updatedAt ? formatDate(doc.updatedAt) : '-'}
                            </td>
                            <td className="px-5 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {doc.tipe === 'kartu_anggota' && (
                                  <>
                                    <button
                                      onClick={() => downloadKTA(member!.id, 'pdf')}
                                      className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950 transition"
                                      title="Download PDF KTA"
                                    >
                                      <Download size={14} className="text-red-500" />
                                    </button>
                                    <button
                                      onClick={() => downloadKTA(member!.id, 'image')}
                                      className="p-1.5 rounded hover:bg-green-50 dark:hover:bg-green-950 transition"
                                      title="Download PNG KTA"
                                    >
                                      <Image size={14} className="text-green-600" />
                                    </button>
                                  </>
                                )}
                                {doc.tipe !== 'kartu_anggota' && filePath && (
                                  <button
                                    onClick={() =>
                                      downloadDocumentFile(
                                        doc.id,
                                        `${doc.nomorDokumen || 'dokumen'}${
                                          filePath.toLowerCase().endsWith('.png') ? '.png' : '.pdf'
                                        }`,
                                      )
                                    }
                                    className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950 transition"
                                    title="Download File"
                                  >
                                    <Download size={14} className="text-red-500" />
                                  </button>
                                )}
                                {verifyToken && (
                                  <Link
                                    href={`/verify/${verifyToken}`}
                                    target="_blank"
                                    className="p-1.5 rounded hover:bg-blue-50 dark:hover:bg-blue-950 transition"
                                    title="Verifikasi Dokumen"
                                  >
                                    <BadgeCheck size={14} className="text-blue-600" />
                                  </Link>
                                )}
                                <Link
                                  href={`/documents/${doc.id}`}
                                  className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                                  title="Lihat Detail"
                                >
                                  <ExternalLink size={14} className="text-gray-400" />
                                </Link>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-10">
                  <FileText size={36} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">Belum ada dokumen</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Dokumen akan muncul setelah di-generate
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Tab: Kartu Digital ── */}
        {activeTab === 'card' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <IdCard size={20} className="text-blue-500" />
                Kartu Anggota Digital (KTA)
              </h3>
              <button
                onClick={fetchCardData}
                disabled={cardLoading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition disabled:opacity-50"
              >
                <RefreshCw size={16} className={cardLoading ? 'animate-spin' : ''} />
                {cardLoading ? 'Memuat...' : 'Refresh'}
              </button>
            </div>

            {/* Loading State */}
            {cardLoading && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8">
                <div className="flex flex-col items-center justify-center gap-4">
                  <LogoSpinner size={56} message="Memuat data kartu anggota..." />
                </div>
              </div>
            )}

            {/* Error banner - data kartu gagal dimuat (jgn diam-diam tampilkan placeholder) */}
            {cardError && (
              <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-2xl p-4 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={20} className="text-red-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-red-800 dark:text-red-200">
                      {cardError}
                    </p>
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      Pratinjau di bawah menampilkan desain generik dan bukan cap/isi kartu
                      sebenarnya.
                    </p>
                  </div>
                </div>
                <button
                  onClick={fetchCardData}
                  disabled={cardLoading}
                  className="shrink-0 flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 transition disabled:opacity-50"
                >
                  <RefreshCw size={14} className={cardLoading ? 'animate-spin' : ''} />
                  Coba lagi
                </button>
              </div>
            )}

            {/* Card Previews - KtaCard (Paket E-Card Spec) */}
            <div className={"grid grid-cols-1 lg:grid-cols-2 gap-6 items-start " + (cardLoading ? 'hidden' : '')}>
              <div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Sisi Depan
                </h4>
                <KtaCard
                  side="depan"
                  anggota={{
                      nama: member.namaLengkap,
                      jenisKelamin: member.jenisKelamin as 'L' | 'P',
                      nomor: member.nomorAnggota,
                      ranting: member.ranting?.nama || '',
                      distrik: member.ranting?.wilayah?.distrik?.nama ?? undefined,
                      tempatDadar: member.tempatDadar || '',
                      tahunDadar: member.tahunDadar || '',
                      tingkatan: (member.tingkat?.toLowerCase() || 'pratama') as Tingkatan,
                      berlakuSampai: toYearMonth(
                        cardData?.tanggalBerlakuSampai ?? member.tanggalBerlakuSampai,
                      ),
                      fotoUrl: cardData?.fotoDataUrl || undefined,
                      qrImageUrl: cardData?.qrCode || undefined,
                      verifyUrl: cardData?.verificationUrl || undefined,
                      tempatTanggalLahir: formatTempatTanggalLahir(member.tempatLahir, member.tanggalLahir),
                      pekerjaan: cardData?.pekerjaan ?? member.pekerjaan ?? '',
                      status: member.statusKeanggotaan || 'AKTIF',
                      alamat: member.alamat || '',
                      koordinator: cardData?.signerName || 'Koordinator Distrik',
                      koordinatorJabatan: cardData?.signerTitle || undefined,
                      tandaTanganUrl: cardData?.signatureImage ? "/api/uploads/" + encodeURIComponent(cardData.signatureImage) : undefined,
                      stempelUrl: cardData?.stampImage ? "/api/uploads/" + encodeURIComponent(cardData.stampImage) : undefined,
                      tanggalPelantikan: cardData?.tanggalPelantikan ?? member.pelantikan ?? (member.tempatDadar && member.tahunDadar ? `${member.tempatDadar}, ${member.tahunDadar}` : member.tahunDadar ?? ''),
                  }}
                />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Sisi Belakang
                </h4>
                <KtaCard
                  side="belakang"
                  anggota={{
                      nama: member.namaLengkap,
                      jenisKelamin: member.jenisKelamin as 'L' | 'P',
                      nomor: member.nomorAnggota,
                      ranting: member.ranting?.nama || '',
                      distrik: member.ranting?.wilayah?.distrik?.nama ?? undefined,
                      tempatDadar: member.tempatDadar || '',
                      tahunDadar: member.tahunDadar || '',
                      tingkatan: (member.tingkat?.toLowerCase() || 'pratama') as Tingkatan,
                      berlakuSampai: toYearMonth(
                        cardData?.tanggalBerlakuSampai ?? member.tanggalBerlakuSampai,
                      ),
                      fotoUrl: cardData?.fotoDataUrl || undefined,
                      qrImageUrl: cardData?.qrCode || undefined,
                      verifyUrl: cardData?.verificationUrl || undefined,
                      tempatTanggalLahir: formatTempatTanggalLahir(member.tempatLahir, member.tanggalLahir),
                      pekerjaan: cardData?.pekerjaan ?? member.pekerjaan ?? '',
                      status: member.statusKeanggotaan || 'AKTIF',
                      alamat: member.alamat || '',
                      koordinator: cardData?.signerName || 'Koordinator Distrik',
                      koordinatorJabatan: cardData?.signerTitle || undefined,
                      tandaTanganUrl: cardData?.signatureImage ? "/api/uploads/" + encodeURIComponent(cardData.signatureImage) : undefined,
                      stempelUrl: cardData?.stampImage ? "/api/uploads/" + encodeURIComponent(cardData.stampImage) : undefined,
                      tanggalPelantikan: cardData?.tanggalPelantikan ?? member.pelantikan ?? (member.tempatDadar && member.tahunDadar ? `${member.tempatDadar}, ${member.tahunDadar}` : member.tahunDadar ?? ''),
                  }}
                />
              </div>
            </div>
            {/* Download Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Download size={18} className="text-blue-500" />
                Unduh & Cetak Kartu
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button
                  onClick={() => downloadKTA(member.id, 'pdf')}
                  className="flex items-center justify-center gap-3 px-6 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium shadow-lg hover:shadow-xl"
                >
                  <Download size={20} />
                  Download PDF - 2 Sisi
                </button>
                <button
                  onClick={() => downloadKTA(member.id, 'image')}
                  className="flex items-center justify-center gap-3 px-6 py-4 bg-green-600 text-white rounded-xl hover:bg-green-700 transition font-medium shadow-lg hover:shadow-xl"
                >
                  <Image size={20} />
                  Download PNG - 2 Sisi
                </button>
                <button
                  onClick={() => previewKTA(member.id)}
                  className="flex items-center justify-center gap-3 px-6 py-4 bg-slate-700 text-white rounded-xl hover:bg-slate-800 transition font-medium shadow-lg hover:shadow-xl"
                >
                  <Printer size={20} />
                  Preview & Cetak (HTML)
                </button>
              </div>
            </div>

            {/* Keamanan QR & Riwayat Pemindaian */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <ShieldAlert size={18} className="text-amber-500" />
                  Keamanan QR &amp; Riwayat Pemindaian
                </h4>
                <button
                  onClick={fetchCardSecurity}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 bg-gray-50 dark:bg-gray-900 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg transition"
                >
                  <RefreshCw size={13} />
                  Muat Ulang
                </button>
              </div>

              {cardSecurity ? (
                <>
                  {/* Status QR + aksi cabut/aktifkan */}
                  <div
                    className={`flex items-center justify-between flex-wrap gap-4 p-4 rounded-2xl border ${
                      cardSecurity.qr.isValid
                        ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800'
                        : 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {cardSecurity.qr.isValid ? (
                        <ShieldCheck
                          size={26}
                          className="text-emerald-600 dark:text-emerald-400 shrink-0"
                        />
                      ) : (
                        <Lock size={26} className="text-red-500 shrink-0" />
                      )}
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Status QR</p>
                        <p
                          className={`text-sm font-bold ${cardSecurity.qr.isValid ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}
                        >
                          {cardSecurity.qr.isValid
                            ? 'AKTIF — QR dapat diverifikasi'
                            : 'DICABUT — QR tidak berlaku'}
                        </p>
                        {cardSecurity.dokumen.status === 'revoked' && !cardSecurity.qr.isValid && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            Dokumen {cardSecurity.dokumen.nomorDokumen} telah dicabut
                          </p>
                        )}
                      </div>
                    </div>
                    {cardSecurity.qr.isValid ? (
                      <button
                        onClick={() => {
                          if (
                            window.confirm(
                              'Cabut kartu ini? QR pada kartu tidak akan berlaku lagi.',
                            )
                          ) {
                            toggleCardActive(false);
                          }
                        }}
                        disabled={actionLoading === 'card-revoke'}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition disabled:opacity-50"
                      >
                        <Lock size={14} />
                        {actionLoading === 'card-revoke' ? 'Mencabut...' : 'Cabut Kartu'}
                      </button>
                    ) : (
                      <button
                        onClick={() => toggleCardActive(true)}
                        disabled={actionLoading === 'card-activate'}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition disabled:opacity-50"
                      >
                        <Unlock size={14} />
                        {actionLoading === 'card-activate' ? 'Mengaktifkan...' : 'Aktifkan Kembali'}
                      </button>
                    )}
                  </div>

                  {/* Statistik scan */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3">
                      <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase">
                        Pemindaian
                      </p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {cardSecurity.qr.scanCount}x
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3">
                      <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase">
                        Sisa Scan
                      </p>
                      <p
                        className={`text-lg font-bold ${cardSecurity.scanLeft <= 5 ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}
                      >
                        {cardSecurity.scanLeft}
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3">
                      <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase">
                        Terakhir Dipindai
                      </p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {formatDateTime(cardSecurity.qr.scannedAt)}
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3">
                      <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase">
                        QR Dibuat
                      </p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {formatDateTime(cardSecurity.qr.createdAt)}
                      </p>
                    </div>
                  </div>

                  {/* Peringatan bila sisa scan menipis / terduga difotokopi */}
                  {cardSecurity.scanLeft <= 5 && cardSecurity.qr.isValid && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 mt-4">
                      <AlertTriangle size={18} className="text-amber-500 shrink-0" />
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        QR sudah dipindai {cardSecurity.qr.scanCount} dari batas{' '}
                        {cardSecurity.scanLimit}. Bila mencapai batas, kartu otomatis dinonaktifkan
                        karena terduga difotokopi/digandakan.
                      </p>
                    </div>
                  )}

                  {/* Riwayat pemindaian */}
                  <div className="mt-5">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase flex items-center gap-1.5">
                        <History size={13} />
                        Riwayat Pemindaian Terbaru
                      </h5>
                      {(auth.role === 'superadmin' || auth.role === 'admin_nasional') && cardSecurity.scanLog.length > 0 && (
                        <button
                          onClick={async () => {
                            if (!window.confirm('Reset riwayat scan?')) return;
                            setActionLoading('reset-scan');
                            try {
                                await apiClient.post(`/members/${id}/digital-card/security/reset`);
                                toast('success', 'Riwayat scan berhasil direset');
                                await fetchCardSecurity();
                            } catch {
                                toast('error', 'Gagal mereset riwayat');
                            }
                            setActionLoading(null);
                          }}
                          disabled={actionLoading === 'reset-scan'}
                          className="text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        >
                          Reset Riwayat
                        </button>
                      )}
                    </div>
                    {cardSecurity.scanLog.length > 0 ? (
                      <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                        <table className="w-full text-xs">
                          <thead className="bg-gray-50 dark:bg-gray-900 text-left text-gray-500 dark:text-gray-400">
                            <tr>
                              <th className="px-3 py-2 font-medium">Waktu</th>
                              <th className="px-3 py-2 font-medium">IP</th>
                              <th className="px-3 py-2 font-medium hidden sm:table-cell">
                                Perangkat
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {cardSecurity.scanLog.slice(0, 10).map((s) => (
                              <tr key={s.id}>
                                <td className="px-3 py-2 font-mono text-gray-700 dark:text-gray-300">
                                  {formatDateTime(s.scannedAt)}
                                </td>
                                <td className="px-3 py-2 font-mono text-gray-700 dark:text-gray-300">
                                  {s.ipAddress || '-'}
                                </td>
                                <td className="px-3 py-2 hidden sm:table-cell text-gray-500 dark:text-gray-400 max-w-[220px] truncate">
                                  {s.userAgent || '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        Belum ada pemindaian. QR akan tercatat di sini setiap kali dipindai.
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Kartu belum dibuat atau status keamanan tidak dapat dimuat. Generate kartu digital
                  terlebih dahulu.
                </p>
              )}
            </div>

            {/* Kartu Fisik & Riwayat Penerbitan */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <IdCard size={18} className="text-blue-500" />
                  Kartu Fisik &amp; Riwayat Penerbitan
                </h4>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (
                        window.confirm(
                          'Cetak kartu fisik baru? QR baru dengan source "printed" akan dibuat.',
                        )
                      ) {
                        issuePrintedCard(null);
                      }
                    }}
                    disabled={actionLoading === 'card-print'}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50"
                  >
                    <Printer size={13} />
                    {actionLoading === 'card-print' ? 'Mencetak...' : 'Cetak Kartu Fisik'}
                  </button>
                  <button
                    onClick={() => {
                      if (
                        window.confirm(
                          'Penggantian kartu hilang/rusak? Kartu fisik lama akan dicabut.',
                        )
                      ) {
                        issuePrintedCard('hilang');
                      }
                    }}
                    disabled={actionLoading === 'card-print'}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition disabled:opacity-50"
                  >
                    <AlertTriangle size={13} />
                    Ganti Hilang/Rusak
                  </button>
                </div>
              </div>

              {cardIssuances !== null && cardIssuances.length > 0 ? (
                <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 dark:bg-gray-900 text-left text-gray-500 dark:text-gray-400">
                      <tr>
                        <th className="px-3 py-2 font-medium">Edisi</th>
                        <th className="px-3 py-2 font-medium">Jenis</th>
                        <th className="px-3 py-2 font-medium">Alasan</th>
                        <th className="px-3 py-2 font-medium">Status</th>
                        <th className="px-3 py-2 font-medium hidden sm:table-cell">Scan</th>
                        <th className="px-3 py-2 font-medium hidden md:table-cell">Waktu</th>
                        <th className="px-3 py-2 font-medium">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {cardIssuances.map((iss) => (
                        <tr key={iss.id}>
                          <td className="px-3 py-2 font-mono text-gray-700 dark:text-gray-300">
                            #{iss.edisi}
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                iss.source === 'printed'
                                  ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                                  : 'bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400'
                              }`}
                            >
                              {iss.source === 'printed' ? (
                                <Printer size={10} />
                              ) : (
                                <Smartphone size={10} />
                              )}
                              {iss.source === 'printed' ? 'Fisik' : 'Digital'}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-gray-600 dark:text-gray-300">
                            {iss.reason
                              ? toProperCase(iss.reason.replace('replacement', 'Penggantian'))
                              : '-'}
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={`font-semibold ${
                                iss.isValid
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-red-600 dark:text-red-400'
                              }`}
                            >
                              {iss.isValid ? 'Berlaku' : 'Dicabut'}
                            </span>
                          </td>
                          <td className="px-3 py-2 hidden sm:table-cell text-gray-600 dark:text-gray-300">
                            {iss.scanCount}×
                          </td>
                          <td className="px-3 py-2 hidden md:table-cell text-gray-600 dark:text-gray-300">
                            {formatDateTime(iss.createdAt)}
                          </td>
                          <td className="px-3 py-2">
                            {iss.source === 'printed' && (
                              <button
                                onClick={() =>
                                  window.open(
                                    `${window.location.origin}/api/members/${member?.id}/digital-card/printed/pdf?issuanceId=${iss.id}`,
                                    '_blank',
                                  )
                                }
                                className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline font-medium"
                              >
                                <Download size={12} />
                                PDF
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Belum ada penerbitan kartu fisik. Klik "Cetak Kartu Fisik" untuk membuat QR statis
                  per-penerbitan.
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Tab: Iuran ── */}
        {activeTab === 'dues' && (
          <div className="space-y-6">
            {/* Dues Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-50 dark:bg-green-950">
                    <CheckCircle2 size={18} className="text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Total Lunas</p>
                    <p className="text-lg font-bold text-green-600">{paidDues}x</p>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950">
                    <CreditCard size={18} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Total Dibayar</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {formatRupiah(totalPaid)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950">
                    <Award size={18} className="text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Kepatuhan</p>
                    <p className="text-lg font-bold text-purple-600">
                      {totalDues > 0 ? Math.round((paidDues / totalDues) * 100) : 0}%
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Dues Table */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Riwayat Pembayaran Iuran
                </h3>
              </div>
              {member.iuran.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                        <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400">
                          Periode
                        </th>
                        <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400">
                          Jumlah
                        </th>
                        <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400">
                          Status
                        </th>
                        <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400 hidden sm:table-cell">
                          Tgl Bayar
                        </th>
                        <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400 hidden md:table-cell">
                          Tgl Input
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {member.iuran.map((dues) => (
                        <tr
                          key={dues.id}
                          className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition"
                        >
                          <td className="px-5 py-3 font-medium text-gray-900 dark:text-white">
                            {formatPeriode(dues.periode)}
                          </td>
                          <td className="px-5 py-3 font-mono text-sm text-gray-700 dark:text-gray-300">
                            {formatRupiah(Number(dues.jumlah))}
                          </td>
                          <td className="px-5 py-3">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${DUES_STATUS_STYLES[dues.status] || ''}`}
                            >
                              {FLAT_STATUS_LABELS[dues.status] || dues.status}
                            </span>
                          </td>
                          <td className="px-5 py-3 hidden sm:table-cell text-xs text-gray-500">
                            {dues.tanggalBayar ? formatDate(dues.tanggalBayar) : '-'}
                          </td>
                          <td className="px-5 py-3 hidden md:table-cell text-xs text-gray-500">
                            {formatDate(dues.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-10">
                  <CreditCard size={36} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Belum ada riwayat iuran
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Data iuran akan muncul setelah dicatat
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Edit Modal ── */}
        <EditMemberModal
          open={showEditModal}
          memberId={id}
          onClose={() => setShowEditModal(false)}
          onSuccess={fetchMember}
        />

        {/* ── Delete Modal ── */}
        <Modal
          open={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title="Hapus Anggota"
          size="sm"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
              <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-400">
                Tindakan ini akan menghapus <strong>{toProperCase(member.namaLengkap)}</strong>{' '}
                secara permanen.
              </p>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Data yang terkait seperti dokumen dan riwayat iuran juga akan terhapus. Tindakan ini
              tidak dapat dibatalkan.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={actionLoading === 'delete'}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition disabled:opacity-50"
              >
                {actionLoading === 'delete' ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </Modal>

        {/* ── Reset KTA Modal ── */}
        <Modal
          open={showResetKtaModal}
          onClose={() => setShowResetKtaModal(false)}
          title="Reset KTA"
          size="sm"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
              <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-400">
                Semua pengajuan KTA <strong>{toProperCase(member.namaLengkap)}</strong> akan dihapus
                dan kartu yang ada akan dicabut. Anggota dapat mengajukan KTA baru dari aplikasi.
              </p>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Data anggota dan nomor anggota tetap dipertahankan. Tindakan ini tidak dapat
              dibatalkan.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowResetKtaModal(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                Batal
              </button>
              <button
                onClick={handleResetKta}
                disabled={actionLoading === 'reset-kta'}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition disabled:opacity-50"
              >
                {actionLoading === 'reset-kta' ? 'Memproses...' : 'Ya, Reset KTA'}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </PermissionGuard>
  );
}
