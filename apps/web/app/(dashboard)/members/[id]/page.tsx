'use client';

import { PermissionGuard } from '@/components/auth/permission-guard';
import { CARD, COLORS, FRONT, BACK, getLevelVisual, photoCrop, fmt, decorFrontSvg, decorBackSvg, guillocheSvg, cardCss } from '@/lib/card-design';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
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
} from 'lucide-react';
import Modal from '@/components/ui/modal';
import EditMemberModal from '@/components/members/EditMemberModal';
import { StatusBadge,
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

// ─── Types ───

interface MemberDetail {
  id: string;
  nomorAnggota: string;
  namaLengkap: string;
  jenisKelamin: 'L' | 'P';
  tempatLahir: string | null;
  tanggalLahir: string | null;
  tempatDadar: string | null;
  tahunDadar: string | null;
  alamat: string | null;
  noHp: string | null;
  email: string | null;
  fotoPath: string | null;
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
    wilayah?: { id: string; nama: string; distrik?: { id: string; nama: string; alamat?: string | null } };
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

/** Label tipe dokumen — sesuai enum TipeDokumen di Prisma. */
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

// ─── Card Preview Helpers ───
// Visual tingkat (LEVELS/getLevelVisual) dan format data (fmt) diambil dari
// packages/card-design — sumber tunggal desain kartu (mobile/web/PDF/preview).
function InfoPreview({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div style={{ marginBottom: FRONT.info.rowMarginBottom }}>
      <div
        style={{
          fontSize: FRONT.info.label.fontSize,
          fontWeight: 800,
          color: COLORS.label,
          textTransform: 'uppercase',
          letterSpacing: FRONT.info.label.letterSpacing,
        }}
      >
        {label}
      </div>
      <div
        className="font-ocr"
        style={
          strong
            ? {
                fontSize: FRONT.info.valueStrong.fontSize,
                fontWeight: 900,
                color: FRONT.info.valueStrong.color,
                letterSpacing: FRONT.info.valueStrong.letterSpacing,
                marginTop: FRONT.info.valueStrong.marginTop,
                lineHeight: FRONT.info.value.lineHeight,
              }
            : {
                fontSize: FRONT.info.value.fontSize,
                fontWeight: 700,
                color: FRONT.info.value.color,
                marginTop: FRONT.info.value.marginTop,
                lineHeight: FRONT.info.value.lineHeight,
              }
        }
      >
        {value}
      </div>
    </div>
  );
}

function BackPreview({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: BACK.info.row.marginBottom }}>
      <div style={{ width: BACK.info.row.label.w, fontSize: BACK.info.row.label.fontSize, fontWeight: 700, color: '#ffffff', textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{ width: BACK.info.row.colon.w, fontSize: BACK.info.row.label.fontSize, fontWeight: 700, color: '#ffffff', opacity: 0.9 }}>:</div>
      <div style={{ flex: 1, fontSize: BACK.info.row.value.fontSize, fontWeight: 600, color: '#ffffff' }}>{value}</div>
    </div>
  );
}

/** Foto anggota — fallback siluet man/woman-icon saat foto tidak ada ATAU gagal dimuat (onError → 404). */
function MemberPhotoWeb({ src, iconSrc, crop, iconCls }: { src: string | null; iconSrc: string; crop?: { left: number; top: number; w: number; h: number }; iconCls: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return <img src={iconSrc} alt="foto" className={iconCls} />;
  }
  // Crop ala SIM (dari spec): region atas pasfoto (kepala + bahu) memenuhi kotak
  return (
    <img
      src={src}
      alt="Foto"
      className="absolute max-w-none"
      style={crop ? { left: crop.left, top: crop.top, width: crop.w, height: crop.h, objectFit: 'cover' } : { width: '100%', height: '100%', objectFit: 'cover' }}
      onError={() => setFailed(true)}
    />  );
}

// ─── Page Component ───

export default function MemberDetailPage() {
  const toast = useToast();
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [member, setMember] = useState<MemberDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get('tab') as 'info' | 'documents' | 'dues' | 'card' | null;
  const [activeTab, setActiveTab] = useState<'info' | 'documents' | 'dues' | 'card'>(
    tabFromUrl || 'info'
  );
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [cardData, setCardData] = useState<{
    qrCode: string;
    signerName?: string;
    signerTitle?: string;
    signatureImage?: string | null;
    stampImage?: string | null;
    levelVisual?: { stripCount: number; color: string; label?: string } | null;
  } | null>(null);
  const [cardLoading, setCardLoading] = useState(false); // eslint-disable-line @typescript-eslint/no-unused-vars

  const fetchMember = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data: res } = await apiClient.get(`/members/${id}`);
      setMember(res.data);
      setError(null);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 404) setError('Anggota tidak ditemukan');
      else if (status === 403) setError('Akses ditolak: di luar cakupan wilayah Anda');
      else setError('Gagal memuat data anggota');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchMember();
  }, [fetchMember]);

  // Fetch digital card data when card tab is active
  useEffect(() => {
    if (activeTab === 'card' && member && !cardData) {
      setCardLoading(true);
      const token = localStorage.getItem('accessToken');
      fetch(`${window.location.origin}/api/members/${member.id}/digital-card`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.success) {
            setCardData({
              qrCode: data.data.qrCode,
              signerName: data.data.card?.signerName,
              signerTitle: data.data.card?.signerTitle,
              signatureImage: data.data.signatureImage || null,
              stampImage: data.data.stampImage || null,
              levelVisual: data.data.levelVisual || null,
            });
          }
        })
        .catch(() => {})
        .finally(() => setCardLoading(false));
    }
  }, [activeTab, member, cardData]);

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
    } catch {
      /* ignore */
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
          : `${window.location.origin}/api/members/${memberId}/digital-card/image`;
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
      a.download = format === 'pdf' ? `KTA-${member?.nomorAnggota || memberId}.pdf` : `KTA-${member?.nomorAnggota || memberId}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast('success', format === 'pdf' ? 'PDF KTA berhasil diunduh' : 'PNG KTA berhasil diunduh');
    } catch (err) {
      console.error('KTA download error:', err);
      toast('error', 'Gagal mengunduh KTA. Silakan coba lagi.');
    }
  };

  /** Preview HTML (2 sisi) untuk cetak — memakai logo resmi & visual strip terkini. */
  const previewKTA = async (memberId: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${window.location.origin}/api/members/${memberId}/digital-card`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!data.success) {
         toast('error', 'Gagal memuat data KTA');
        return;
      }

      const m = data.data.member;
      const qr = data.data.qrCode;
      const distrik = (m.distrik || 'THS-THM').replace(/^keuskupan\s*/i, '').toUpperCase();
      const expiry = fmt.validUntilText();
      const ttl = fmt.ttl(m.tempatLahir, m.tanggalLahir);
      const dadar = fmt.dadar(member?.tempatDadar, member?.tahunDadar);
      const lv = getLevelVisual(member?.tingkat, data.data.levelVisual || null);
      const stripHtml = Array.from({ length: lv.stripCount })
        .map(() => `<div class="rank-strip" style="background:${lv.stripColor}"></div>`)
        .join('');
      // Foto — fallback siluet man/woman-icon saat foto tidak ada ATAU gagal dimuat (onerror → 404/korup)
      const photoIconSrc = m.jenisKelamin === 'P' ? `${window.location.origin}/woman-icon.png` : `${window.location.origin}/man-icon.png`;
      const cropBig = photoCrop(FRONT.photo.big.w, FRONT.photo.big.h);
      const cropSmall = photoCrop(FRONT.photo.small.w, FRONT.photo.small.h);
      const cropStyle = (c: ReturnType<typeof photoCrop>) => `position:absolute;left:${c.left}px;top:${c.top}px;width:${c.w}px;height:${c.h}px;object-fit:cover`;
      const photoHtml = m.fotoPath
        ? `<img src="${window.location.origin}/api/uploads/${encodeURIComponent(m.fotoPath)}.bg.png" alt="Foto" style="${cropStyle(cropBig)}" onerror="this.onerror=null;this.src='${photoIconSrc}';this.style.cssText='width:130px;height:130px;object-fit:contain;opacity:0.9'"/>`
        : `<img src="${photoIconSrc}" alt="foto" style="width:130px;height:130px;object-fit:contain;opacity:0.9"/>`;
      const photoSmallHtml = m.fotoPath
        ? `<img src="${window.location.origin}/api/uploads/${encodeURIComponent(m.fotoPath)}.bg.png" alt="Foto" style="${cropStyle(cropSmall)}" onerror="this.onerror=null;this.src='${photoIconSrc}';this.style.cssText='width:100px;height:100px;object-fit:contain;opacity:0.9'"/>`
        : `<img src="${photoIconSrc}" alt="foto" style="width:100px;height:100px;object-fit:contain;opacity:0.9"/>`;
      const signerName = data.data.card?.signerName || 'Koordinator Distrik';
      const signerTitle = data.data.card?.signerTitle || '';
      const logoUrl = `${window.location.origin}/logo.svg`;
      const petaUrl = `${window.location.origin}/peta-indonesia.png`;
      const sig = FRONT.signer;

      const win = window.open('', '_blank');
      if (!win) return;

      win.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>KTA - ${toProperCase(m.namaLengkap)}</title>
<style>
  @font-face { font-family: 'OCR A Extended'; src: url('${window.location.origin}/fonts/OCR A Extended.ttf') format('truetype'); }
  @font-face { font-family: 'Open Sans'; src: url('${window.location.origin}/fonts/OpenSans-Bold.ttf') format('truetype'); font-weight: 700; }
  @font-face { font-family: 'Roboto'; src: url('${window.location.origin}/fonts/Roboto-Regular.ttf') format('truetype'); font-weight: 400; }
  @font-face { font-family: 'Roboto'; src: url('${window.location.origin}/fonts/Roboto-Bold.ttf') format('truetype'); font-weight: 700; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Roboto', Arial, sans-serif; padding: 20px; display: flex; flex-direction: column; align-items: center; gap: 20px; }
  @media print { body { padding: 0; } .page-break { page-break-after: always; } }
  .card { box-shadow: 0 10px 40px rgba(0,0,0,0.15); flex-shrink: 0; }
  ${cardCss()}
</style></head><body>
<div class="card front">
  <div class="bg-circle1"></div><div class="bg-circle2"></div>
  ${decorFrontSvg()}
  ${guillocheSvg('front')}
  <div class="watermark front" style="-webkit-mask-image:url('${petaUrl}');mask-image:url('${petaUrl}')"></div>
  <div class="header-row">
    <div class="logo"><img src="${logoUrl}" alt="THS-THM" /></div>
    <div class="header-text">
      <div class="r1">KARTU TANDA ANGGOTA</div>
      <div class="r2">ORGANISASI PENCAK SILAT PENDIDIKAN</div>
      <div class="r3">TUNGGAL HATI SEMINARI - TUNGGAL HATI MARIA</div>
      <div>DISTRIK KEUSKUPAN ${distrik}</div>
    </div>
  </div>
  <div class="photo-slot photo-big">${photoHtml}</div>
  <div class="photo-slot photo-small">${photoSmallHtml}</div>
  ${lv.stripCount > 0 ? `<div class="rank-box"><div class="rank-name">${(member?.tingkat || '').toUpperCase()}</div><div class="rank-strips">${stripHtml}</div></div>` : ''}
  <div class="info">
    <div class="info-row"><div class="info-label">No. Anggota</div><div class="info-value strong">${(m.nomorAnggota || '-').toUpperCase()}</div></div>
    <div class="info-pair">
      <div class="info-row info-pair-left"><div class="info-label">Nama</div><div class="info-value">${(m.namaLengkap || '-').toUpperCase()}</div></div>
      <div class="jk-box"><div class="info-label">JK</div><div class="info-value">${m.jenisKelamin === 'P' ? 'P' : 'L'}</div></div>
    </div>
    <div class="info-row"><div class="info-label">Tempat, Tanggal Lahir</div><div class="info-value">${ttl.toUpperCase()}</div></div>
    <div class="info-row"><div class="info-label">Ranting</div><div class="info-value">${(m.ranting || '-').toUpperCase()}</div></div>
    <div class="info-row"><div class="info-label">Wilayah</div><div class="info-value">${(m.wilayah || '-').toUpperCase()}</div></div>
  </div>
  <div class="bottom-info">
    <div class="bottom-label">Berlaku sampai</div>
    <div class="bottom-value">${expiry}</div>
  </div>
  <div class="signer">
    <div class="sig-title1">KOORDINATORAT DISTRIK THS-THM</div>
    <div class="sig-title2">KEUSKUPAN ${distrik}</div>
    <div class="sig-wrap">
      <div class="stamp">${data.data.stampImage ? `<img src="${window.location.origin}/api/uploads/${encodeURIComponent(data.data.stampImage)}" alt="stempel"/>` : 'STEMPEL'}</div>
      ${data.data.signatureImage ? `<div style="position:absolute;left:${sig.sig.left}px;top:${sig.sig.top}px;width:${sig.sig.w}px;height:${sig.sig.h}px">` + [0, 1, 2].map(() => `<img src="${window.location.origin}/api/uploads/${encodeURIComponent(data.data.signatureImage)}" alt="ttd" style="position:absolute;left:0;top:0;width:${sig.sig.w}px;height:${sig.sig.h}px;object-fit:contain;opacity:0.7;filter:brightness(0.6) contrast(1.4);transform:rotate(${sig.sig.rotate}deg)"/>`).join('') + `</div>` : `<div class="sig-text">ttd</div>`}
    </div>
    <div class="signer-row">
      <div class="signer-name">${(signerName || 'Koordinator Distrik').toUpperCase()}</div>
      ${signerTitle ? `<div class="signer-title">${signerTitle.toUpperCase()}</div>` : ''}
    </div>
  </div>
</div>
<div class="card back page-break">
  ${decorBackSvg()}
  ${guillocheSvg('back')}
  <div class="watermark back" style="-webkit-mask-image:url('${petaUrl}');mask-image:url('${petaUrl}')"></div>
  <div class="back-title">
    <div class="t">VERIFIKASI KARTU ANGGOTA</div>
    <div class="s">Scan QR untuk memeriksa keabsahan anggota</div>
  </div>
  <div class="qr-box">${qr ? `<img src="${qr}" alt="QR"/>` : '<div style="width:100%;height:100%;display:grid;grid-template-columns:repeat(5,1fr);grid-template-rows:repeat(5,1fr);gap:4px">' + Array.from({ length: 25 }, (_, i) => `<div style="background:${i % 3 === 0 || i % 7 === 0 ? '#0f172a' : '#e2e8f0'};border-radius:2px"></div>`).join('') + '</div>'}</div>
  <div class="back-info">
    <div class="back-desc">Halaman verifikasi publik hanya menampilkan data minimum untuk membuktikan keabsahan anggota.</div>
    <div class="back-row"><span class="lbl">TTL</span><span class="colon">:</span><span class="val">${ttl.toUpperCase()}</span></div>
    <div class="back-row"><span class="lbl">DADAR</span><span class="colon">:</span><span class="val">${dadar.toUpperCase()}</span></div>
    <div class="back-row"><span class="lbl">STATUS</span><span class="colon">:</span><span class="val">${(m.statusKeanggotaan === 'aktif' ? 'AKTIF' : 'NONAKTIF')}</span></div>
    <div class="back-row"><span class="lbl">VALID S/D</span><span class="colon">:</span><span class="val">${expiry.toUpperCase()}</span></div>
    <div class="back-row"><span class="lbl">ALAMAT</span><span class="colon">:</span><span class="val">THS-THM, ${(m.alamatDistrik || 'Distrik').toUpperCase()}</span></div>
  </div>
  <div class="back-footer">
    <div class="footer-text">Jika kartu ini ditemukan, harap menghubungi sekretariat THS-THM setempat.</div>
    <div class="footer-url"><div class="u">URL Verifikasi</div><div class="v">/verify/member/token</div></div>
  </div>
</div>
<script>window.print();</script>
</body></html>`);
      win.document.close();
    } catch (err) {
      console.error('KTA error:', err);
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
      router.push('/members');
    } catch {
      /* ignore */
    }
    setActionLoading(null);
    setShowDeleteModal(false);
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

  const totalPaid = member.iuran
    .filter((d: DuesItem) => d.status === 'lunas')
    .reduce((sum: number, d: DuesItem) => sum + Number(d.jumlah), 0);

  const totalDues = member.iuran.length;
  const paidDues = member.iuran.filter((d: DuesItem) => d.status === 'lunas').length;

  const orgPath =
    [member.ranting?.wilayah?.distrik?.nama, member.ranting?.wilayah?.nama, member.ranting?.nama]
      .filter(Boolean)
      .join(' › ') || '-';

  // ── Data turunan kartu (sesuai template desain) ──
  const levelVisual = getLevelVisual(member.tingkat, cardData?.levelVisual || null);
  const validUntilText = fmt.validUntilText();
  const ttl = fmt.ttl(member.tempatLahir, member.tanggalLahir);
  const dadar = fmt.dadar(member.tempatDadar, member.tahunDadar);

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
                  ...(member.tingkat ? [
                    <span key="tingkat" className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-400">
                      <Award size={12} />
                      {member.tingkat}
                    </span>
                  ] : []),
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
                dokumenCount={member.dokumen.length}
                paidDues={paidDues}
                totalDues={totalDues}
                rantingNama={member.ranting?.nama || '-'}
              />
        
              {/* ── Tabs ── */}
              <div className="border-b border-gray-200 dark:border-gray-700">
                <div className="flex gap-6">
                  {[
                    { key: 'info', label: 'Informasi Pribadi', icon: User },
                    { key: 'documents', label: `Dokumen (${member.dokumen.length})`, icon: FileText },
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
                      <InfoRow icon={User} label="Nama Lengkap" value={toProperCase(member.namaLengkap)} />
                      <InfoRow
                        icon={User}
                        label="Jenis Kelamin"
                        value={member.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan'}
                      />
                      <InfoRow
                        icon={Calendar}
                        label="Tempat, Tgl Lahir"
                        value={
                          [member.tempatLahir, member.tanggalLahir ? formatDate(member.tanggalLahir) : null]
                            .filter(Boolean)
                            .join(', ') || null
                        }
                      />
                      <InfoRow
                        icon={Calendar}
                        label="Tempat - Tahun Dadar"
                        value={
                          [member.tempatDadar, member.tahunDadar]
                            .filter(Boolean)
                            .join(' - ') || null
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
                        <InfoRow icon={Award} label="Tingkatan" value={member.tingkat || null} />
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
                    {(['kartu_anggota', 'sertifikat_pendadaran', 'sertifikat_pelatihan', 'piagam_prestasi'] as const).map((t) => {
                      const count = member.dokumen.filter((d: DocumentItem) => d.tipe === t).length;
                      return (
                        <div key={t} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
                          <p className="text-xs text-gray-500 dark:text-gray-400">{DOKUMEN_TIPE_LABEL[t]}</p>
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
                      <span className="text-xs text-gray-400">{member.dokumen.length} dokumen</span>
                    </div>
                    {member.dokumen.length > 0 ? (
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
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusMeta.className || 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>
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
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <IdCard size={20} className="text-blue-500" />
                      Kartu Anggota Digital (KTA)
                    </h3>
                  </div>
        
                  {/* Front Side Preview — geometri 856×540 dari packages/card-design (sumber tunggal) */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Sisi Depan</h4>
                    <div
                      className="relative w-full max-w-[856px] aspect-[856/540] rounded-[28px] overflow-hidden shadow-2xl border"
                      style={{ background: COLORS.front.bg, borderColor: COLORS.front.border }}
                    >
                      {/* Dekorasi kanon — ombak + header + gradien bawah (SVG dari spec) */}
                      <div className="absolute inset-0 pointer-events-none" dangerouslySetInnerHTML={{ __html: decorFrontSvg().replace('<svg ', '<svg style="width:100%;height:100%" ') }} />
                      {/* Guilloche / microprint border (dari spec) */}
                      <div className="absolute inset-0 pointer-events-none" dangerouslySetInnerHTML={{ __html: guillocheSvg('front').replace('<svg ', '<svg style="width:100%;height:100%" ') }} />

                      {/* Watermark — peta indonesia.png washout, posisi dari spec */}
                      <div
                        className="absolute pointer-events-none opacity-[0.08]"
                        style={{ left: FRONT.watermark.left, top: FRONT.watermark.top, width: FRONT.watermark.w, height: FRONT.watermark.h }}
                      >
                        <img src="/peta-indonesia.png" alt="" className="w-full h-full object-contain" />
                      </div>

                      <div className="relative z-10 h-full">
                        {/* Header — 4 baris + logo utuh */}
                        <div className="flex items-start text-white" style={{ padding: `${FRONT.header.padTop}px ${FRONT.header.padH}px`, gap: FRONT.header.gap }}>
                          <div
                            className="relative rounded-full overflow-hidden bg-white flex items-center justify-center flex-shrink-0"
                            style={{ width: FRONT.logo.size, height: FRONT.logo.size }}
                          >
                            <img src="/logo.svg" alt="THS-THM" style={{ width: FRONT.logo.img, height: FRONT.logo.img, objectFit: 'contain' }} />
                            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/55 to-transparent" />
                          </div>
                          <div style={{ lineHeight: FRONT.header.row.lineHeight }}>
                            {[
                              { t: 'KARTU TANDA ANGGOTA', sp: FRONT.header.row.spacing[0] },
                              { t: 'ORGANISASI PENCAK SILAT PENDIDIKAN', sp: FRONT.header.row.spacing[1] },
                              { t: 'TUNGGAL HATI SEMINARI - TUNGGAL HATI MARIA', sp: FRONT.header.row.spacing[2] },
                              { t: `DISTRIK KEUSKUPAN ${(member.ranting?.wilayah?.distrik?.nama || 'THS-THM').replace(/^keuskupan\s*/i, '').toUpperCase()}`, sp: FRONT.header.row.spacing[3] },
                            ].map((row, i) => (
                              <div key={i} className="font-bold" style={{ fontSize: FRONT.header.row.fontSize, letterSpacing: row.sp, marginTop: i > 0 ? FRONT.header.row.rowGap : 0 }}>
                                {row.t}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Photo besar kiri — TANPA bingkai; fallback siluet man/woman-icon (onError) */}
                        <div className="absolute overflow-hidden" style={{ left: FRONT.photo.big.left, top: FRONT.photo.big.top, width: FRONT.photo.big.w, height: FRONT.photo.big.h }}>
                          <MemberPhotoWeb
                            src={member.fotoPath ? `/api/uploads/${encodeURIComponent(member.fotoPath)}.bg.png` : null}
                            iconSrc={member.jenisKelamin === 'P' ? '/woman-icon.png' : '/man-icon.png'}
                            crop={photoCrop(FRONT.photo.big.w, FRONT.photo.big.h)}
                            iconCls="w-[130px] h-[130px] object-contain opacity-90"
                          />
                        </div>

                        {/* Photo kecil kanan atas — TANPA bingkai, sejajar label No. Anggota; rank di bawahnya */}
                        <div className="absolute overflow-hidden" style={{ right: FRONT.photo.small.right, top: FRONT.photo.small.top, width: FRONT.photo.small.w, height: FRONT.photo.small.h }}>
                          <MemberPhotoWeb
                            src={member.fotoPath ? `/api/uploads/${encodeURIComponent(member.fotoPath)}.bg.png` : null}
                            iconSrc={member.jenisKelamin === 'P' ? '/woman-icon.png' : '/man-icon.png'}
                            crop={photoCrop(FRONT.photo.small.w, FRONT.photo.small.h)}
                            iconCls="w-[100px] h-[100px] object-contain opacity-90"
                          />
                        </div>

                        {/* Level rank — DI BAWAH photo kecil (kanan atas); sembunyi utk 'Anggota' */}
                        {levelVisual.stripCount > 0 && (
                          <div className="absolute" style={{ right: FRONT.rank.right, top: FRONT.rank.top, width: FRONT.rank.w }}>
                            <div
                              className="text-center font-black"
                              style={{ fontSize: FRONT.rank.name.fontSize, color: COLORS.rankText, letterSpacing: FRONT.rank.name.letterSpacing, marginBottom: FRONT.rank.name.marginBottom }}
                            >
                              {(member.tingkat || levelVisual.label || '').toUpperCase()}
                            </div>
                            <div className="flex flex-col" style={{ gap: FRONT.rank.strip.gap }}>
                              {Array.from({ length: levelVisual.stripCount }).map((_, i) => (
                                <div
                                  key={i}
                                  className="w-full rounded-sm border border-black/25"
                                  style={{ height: FRONT.rank.strip.h, borderRadius: FRONT.rank.strip.radius, backgroundColor: levelVisual.stripColor }}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Info — label di atas, nilai di bawah; kolom tengah (foto kiri + kanan), z-20 */}
                        <div className="absolute z-20" style={{ left: FRONT.info.left, top: FRONT.info.top, right: FRONT.info.right }}>
                          <div className="absolute inset-0 pointer-events-none rounded-xl bg-gradient-to-tr from-cyan-300/10 via-white/20 to-amber-300/10" />
                          <InfoPreview label="No. Anggota" value={(member.nomorAnggota || '-').toUpperCase()} strong />
                          <div className="flex">
                            <div className="min-w-0">
                              <InfoPreview label="Nama" value={(member.namaLengkap || '-').toUpperCase()} />
                            </div>
                            <div style={{ marginLeft: FRONT.info.jk.marginLeft, width: FRONT.info.jk.w }}>
                              <div style={{ fontSize: FRONT.info.label.fontSize, fontWeight: 800, color: COLORS.label, textTransform: 'uppercase', letterSpacing: FRONT.info.label.letterSpacing }}>
                                JK
                              </div>
                              <div className="font-ocr" style={{ fontSize: FRONT.info.value.fontSize, fontWeight: 700, color: FRONT.info.value.color, marginTop: FRONT.info.value.marginTop }}>
                                {member.jenisKelamin === 'P' ? 'P' : 'L'}
                              </div>
                            </div>
                          </div>
                          <InfoPreview label="Tempat, Tanggal Lahir" value={ttl.toUpperCase()} />
                          <InfoPreview label="Ranting" value={(member.ranting?.nama || '-').toUpperCase()} />
                          <InfoPreview label="Wilayah" value={(member.ranting?.wilayah?.nama || '-').toUpperCase()} />
                        </div>

                        {/* Bottom — jarak bawah sama dengan jarak atas header */}
                        <div className="absolute" style={{ left: FRONT.bottom.left, bottom: FRONT.bottom.bottom }}>
                          <div style={{ fontSize: FRONT.bottom.label.fontSize, fontWeight: 700, color: FRONT.bottom.label.color, marginBottom: FRONT.bottom.label.marginBottom }}>
                            Berlaku sampai
                          </div>
                          <div className="font-['Roboto']" style={{ fontSize: FRONT.bottom.value.fontSize, fontWeight: 700, color: FRONT.bottom.value.color, marginTop: FRONT.bottom.value.marginTop }}>
                            {validUntilText}
                          </div>
                        </div>

                        {/* Signer — teks di atas, stempel (tdk ditebalkan) + ttd di tengah, nama (underline) + jabatan menimpa bagian bawah stempel */}
                        <div className="absolute text-left" style={{ right: FRONT.signer.right, bottom: FRONT.signer.bottom, width: FRONT.signer.w, height: FRONT.signer.h, color: COLORS.value }}>
                          <div className="absolute font-black font-['Roboto']" style={{ left: FRONT.signer.title1.left, top: FRONT.signer.title1.top, fontSize: FRONT.signer.title1.fontSize }}>
                            KOORDINATORAT DISTRIK THS-THM
                          </div>
                          <div className="absolute font-bold font-['Roboto']" style={{ left: FRONT.signer.title2.left, top: FRONT.signer.title2.top, fontSize: FRONT.signer.title2.fontSize }}>
                            KEUSKUPAN {(member.ranting?.wilayah?.distrik?.nama || 'THS-THM').replace(/^keuskupan\s*/i, '').toUpperCase()}
                          </div>
                          <div className="absolute" style={{ left: FRONT.signer.wrap.left, top: FRONT.signer.wrap.top, width: FRONT.signer.wrap.w, height: FRONT.signer.wrap.h }}>
                            <div
                              className="absolute rounded-full overflow-hidden flex items-center justify-center border-2"
                              style={{
                                left: FRONT.signer.stamp.left,
                                top: FRONT.signer.stamp.top,
                                width: FRONT.signer.stamp.size,
                                height: FRONT.signer.stamp.size,
                                borderColor: COLORS.stampBorder,
                                transform: `rotate(${FRONT.signer.stamp.rotate}deg)`,
                                fontSize: FRONT.signer.stamp.text.fontSize,
                                fontWeight: 900,
                                color: COLORS.stampText,
                              }}
                            >
                              {cardData?.stampImage ? (
                                <img src={`/api/uploads/${encodeURIComponent(cardData.stampImage)}`} alt="stempel" className="w-full h-full object-cover" />
                              ) : (
                                <span>STEMPEL</span>
                              )}
                            </div>
                            {cardData?.signatureImage ? (
                              <div className="absolute" style={{ left: FRONT.signer.sig.left, top: FRONT.signer.sig.top, width: FRONT.signer.sig.w, height: FRONT.signer.sig.h }}>
                                {[0, 1, 2].map((k) => (
                                  <img
                                    key={k}
                                    src={`/api/uploads/${encodeURIComponent(cardData?.signatureImage ?? '')}`}
                                    alt="ttd"
                                    className="absolute left-0 top-0"
                                    style={{
                                      width: '100%',
                                      height: '100%',
                                      objectFit: 'contain',
                                      opacity: 0.7,
                                      filter: 'brightness(0.6) contrast(1.4)',
                                      transform: `rotate(${FRONT.signer.sig.rotate}deg)`,
                                    }}
                                  />
                                ))}
                              </div>
                            ) : (
                              <div
                                className="absolute flex items-center justify-center"
                                style={{
                                  left: FRONT.signer.sig.left,
                                  top: FRONT.signer.sig.top,
                                  width: FRONT.signer.sig.w,
                                  height: FRONT.signer.sig.h,
                                  fontSize: FRONT.signer.sig.fontSize,
                                  fontFamily: 'cursive',
                                  transform: `rotate(${FRONT.signer.sig.rotate}deg)`,
                                  color: FRONT.signer.sig.color,
                                }}
                              >
                                ttd
                              </div>
                            )}
                          </div>
                          <div className="absolute w-full" style={{ left: 0, bottom: 0 }}>
                            <div className="font-black underline" style={{ fontSize: FRONT.signer.name.fontSize, color: COLORS.value }}>
                              {(cardData?.signerName || 'Koordinator Distrik').toUpperCase()}
                            </div>
                            {cardData?.signerTitle ? (
                              <div className="font-bold" style={{ fontSize: FRONT.signer.title.fontSize, color: COLORS.value, marginTop: FRONT.signer.title.marginTop }}>
                                {cardData.signerTitle.toUpperCase()}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>                  {/* Back Side Preview — geometri dari packages/card-design (sumber tunggal) */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Sisi Belakang</h4>
                    <div className="relative w-full max-w-[856px] aspect-[856/540] rounded-[28px] overflow-hidden shadow-2xl border" style={{ background: COLORS.back.bg, borderColor: COLORS.back.border }}>
                      {/* Gradien + ombak (SVG kanon dari spec) */}
                      <div className="absolute inset-0 pointer-events-none" dangerouslySetInnerHTML={{ __html: decorBackSvg().replace('<svg ', '<svg style="width:100%;height:100%" ') }} />
                      {/* Guilloche / microprint border (dari spec) */}
                      <div className="absolute inset-0 pointer-events-none" dangerouslySetInnerHTML={{ __html: guillocheSvg('back').replace('<svg ', '<svg style="width:100%;height:100%" ') }} />
                      {/* Watermark peta PUTIH — posisi dari spec */}
                      <div
                        className="absolute pointer-events-none"
                        style={{ left: (CARD.W - BACK.watermark.w) / 2, top: (CARD.H - BACK.watermark.h) / 2, width: BACK.watermark.w, height: BACK.watermark.h, opacity: BACK.watermark.opacity }}
                      >
                        <img src="/peta-indonesia.png" alt="" className="w-full h-full object-contain invert" />
                      </div>
                      <div className="relative z-10 h-full">
                        <div className="absolute left-0 right-0 text-center" style={{ top: BACK.title.top }}>
                          <div className="font-black text-white" style={{ fontSize: BACK.title.fontSize, letterSpacing: BACK.title.letterSpacing }}>
                            VERIFIKASI KARTU ANGGOTA
                          </div>
                          <div className="text-white opacity-90" style={{ fontSize: BACK.title.subtitle.fontSize, marginTop: BACK.title.subtitle.marginTop }}>
                            Scan QR untuk memeriksa keabsahan anggota
                          </div>
                        </div>
                        <div
                          className="absolute bg-white flex items-center justify-center rounded-2xl shadow-lg"
                          style={{ left: BACK.qr.left, top: BACK.qr.top, width: BACK.qr.size, height: BACK.qr.size, borderRadius: BACK.qr.radius, border: `${BACK.qr.border}px solid ${BACK.qr.borderColor}`, padding: BACK.qr.padding }}
                        >
                          {cardData?.qrCode ? (
                            <img src={cardData.qrCode} alt="QR Code" className="w-full h-full" />
                          ) : (
                            <div className="w-full h-full grid grid-cols-5 grid-rows-5 gap-1">
                              {Array.from({ length: 25 }).map((_, i) => (
                                <div key={i} className={`${i % 3 === 0 || i % 7 === 0 ? 'bg-slate-900' : 'bg-slate-200'} rounded-sm`} />
                              ))}
                            </div>
                          )}
                        </div>
                        {/* Area teks belakang transparan — teks putih langsung di atas gradien */}
                        <div className="absolute" style={{ left: BACK.info.left, top: BACK.info.top, right: BACK.info.right, padding: BACK.info.padding }}>
                          <p className="font-['Roboto'] text-white/95" style={{ fontSize: BACK.info.desc.fontSize, lineHeight: `${BACK.info.desc.lineHeight}px`, opacity: BACK.info.desc.opacity, marginBottom: BACK.info.desc.marginBottom }}>
                            Halaman verifikasi publik hanya menampilkan data minimum untuk membuktikan keabsahan anggota.
                          </p>
                          <BackPreview label="TTL" value={ttl.toUpperCase()} />
                          <BackPreview label="DADAR" value={dadar.toUpperCase()} />
                          <BackPreview label="Status" value={(member.statusKeanggotaan === 'aktif' ? 'Aktif' : 'Nonaktif').toUpperCase()} />
                          <BackPreview label="VALID S/D" value={validUntilText} />
                          <BackPreview label="Alamat" value={`THS-THM, ${(member.ranting?.wilayah?.distrik?.alamat || 'Distrik').toUpperCase()}`} />
                        </div>
                        <div className="absolute text-white flex items-end justify-between gap-6" style={{ left: BACK.footer.left, right: BACK.footer.right, bottom: BACK.footer.bottom }}>
                          <div className="opacity-95" style={{ flex: 1, fontSize: BACK.footer.text.fontSize, lineHeight: `${BACK.footer.text.lineHeight}px` }}>
                            Jika kartu ini ditemukan, harap menghubungi sekretariat THS-THM setempat.
                          </div>
                          <div className="text-right">
                            <div className="uppercase opacity-80" style={{ fontSize: BACK.footer.urlLabel.fontSize }}>
                              URL Verifikasi
                            </div>
                            <div className="font-bold" style={{ fontSize: BACK.footer.urlValue.fontSize, marginTop: BACK.footer.urlValue.marginTop }}>
                              /verify/member/token
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>                  {/* Download Actions */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <button
                      onClick={() => downloadKTA(member.id, 'pdf')}
                      className="flex items-center justify-center gap-3 px-6 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium shadow-lg"
                    >
                      <Download size={20} />
                      Download PDF — 2 Sisi
                    </button>
                    <button
                      onClick={() => downloadKTA(member.id, 'image')}
                      className="flex items-center justify-center gap-3 px-6 py-4 bg-green-600 text-white rounded-xl hover:bg-green-700 transition font-medium shadow-lg"
                    >
                      <Image size={20} />
                      Download PNG — 2 Sisi
                    </button>
                    <button
                      onClick={() => previewKTA(member.id)}
                      className="flex items-center justify-center gap-3 px-6 py-4 bg-slate-700 text-white rounded-xl hover:bg-slate-800 transition font-medium shadow-lg"
                    >
                      <Printer size={20} />
                      Preview & Cetak (HTML)
                    </button>
                  </div>
        
                  <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 text-sm text-yellow-700 dark:text-yellow-400">
                    Kartu digital ini menggunakan format CR80 landscape (856x540 px) dengan QR Code untuk verifikasi keaslian. Scan QR untuk memvalidasi data anggota.
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
                                  {dues.periode}
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
                        <p className="text-sm text-gray-500 dark:text-gray-400">Belum ada riwayat iuran</p>
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
                      Tindakan ini akan menghapus <strong>{toProperCase(member.namaLengkap)}</strong> secara permanen.
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
            </div>
      </PermissionGuard>
    );
}
