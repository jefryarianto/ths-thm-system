'use client';

import { PermissionGuard } from '@/components/auth/permission-guard';

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
  Send,
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
  MoreVertical,
  BadgeCheck,
  Users,
  IdCard,
  Download,
  Image,
  Printer,
  Pencil,
  Save,
} from 'lucide-react';
import Modal from '@/components/ui/modal';
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
    wilayah?: { id: string; nama: string; distrik?: { id: string; nama: string } };
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

interface LevelVisual {
  stripCount: number;
  stripClass: string;
  stripBorder: string;
  stripColor: string;
  label: string;
}

/** Tingkat Tapak Suci → visual balok pada kartu (sesuai tabel pengaturan tingkatan). */
const TINGKAT_LEVEL: Record<string, LevelVisual> = {
  Anggota: { stripCount: 0, stripClass: '', stripBorder: '', stripColor: '', label: 'Tanpa strip' },
  Pratama: { stripCount: 1, stripClass: 'bg-blue-700', stripBorder: 'border-blue-900', stripColor: '#1d4ed8', label: 'Biru 1' },
  Tamtama: { stripCount: 2, stripClass: 'bg-blue-700', stripBorder: 'border-blue-900', stripColor: '#1d4ed8', label: 'Biru 2' },
  Muda:    { stripCount: 1, stripClass: 'bg-yellow-600', stripBorder: 'border-yellow-800', stripColor: '#ca8a04', label: 'Kuning 1' },
  Madya:   { stripCount: 2, stripClass: 'bg-yellow-600', stripBorder: 'border-yellow-800', stripColor: '#ca8a04', label: 'Kuning 2' },
  Utama:   { stripCount: 3, stripClass: 'bg-yellow-600', stripBorder: 'border-yellow-800', stripColor: '#ca8a04', label: 'Kuning 3' },
};

function getLevelVisual(tingkat?: string | null, fromApi?: { stripCount: number; color: string; label?: string } | null): LevelVisual {
  if (fromApi) {
    const api: LevelVisual = {
      stripCount: fromApi.stripCount,
      stripColor: fromApi.color,
      label: fromApi.label || 'Strip',
      stripClass: '',
      stripBorder: '',
    };
    return api;
  }
  return (
    (tingkat && TINGKAT_LEVEL[tingkat]) || {
      stripCount: 0,
      stripClass: '',
      stripBorder: '',
      stripColor: '',
      label: 'Tanpa strip',
    }
  );
}

function InfoPreview({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="mb-[13px]">
      <div className="text-[12px] font-extrabold text-blue-950 uppercase tracking-[0.5px] font-['Georgia,_serif']">{label}</div>
      <div className={`${strong ? 'text-[19px] font-black text-blue-950 tracking-[1.2px] font-ocr' : 'text-[15px] font-bold text-slate-900'} mt-[3px] leading-[20px]`}>
        {value}
      </div>
    </div>
  );
}

function BackPreview({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 text-[18px] mb-3">
      <div className="w-[105px] font-black text-blue-950 uppercase font-['Georgia,_serif']">{label}</div>
      <div className="w-[18px] font-black text-slate-900">:</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
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
  const [editForm, setEditForm] = useState({
    namaLengkap: '',
    jenisKelamin: 'L' as 'L' | 'P',
    tempatLahir: '',
    tanggalLahir: '',
    tempatDadar: '',
    tahunDadar: '',
    alamat: '',
    noHp: '',
    email: '',
    tingkat: '',
    rantingId: '',
    distrikId: '',
    wilayahId: '',
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const [editDistriks, setEditDistriks] = useState<Array<{ id: string; nama: string }>>([]);
  const [editWilayahs, setEditWilayahs] = useState<Array<{ id: string; nama: string }>>([]);
  const [editRantings, setEditRantings] = useState<Array<{ id: string; nama: string }>>([]);
  const [editWilayahLoading, setEditWilayahLoading] = useState(false);
  const [editRantingLoading, setEditRantingLoading] = useState(false);
  const [cardData, setCardData] = useState<{
    qrCode: string;
    signerName?: string;
    signerTitle?: string;
    signatureImage?: string | null;
    stampImage?: string | null;
    levelVisual?: { stripCount: number; color: string; label?: string } | null;
  } | null>(null);
  const [cardLoading, setCardLoading] = useState(false); // eslint-disable-line @typescript-eslint/no-unused-vars
  const [tingkatanList, setTingkatanList] = useState<Array<{ id: string; nama: string }>>([]);

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

  useEffect(() => {
    apiClient.get('/tingkatan').then((r) => setTingkatanList(r.data.data || [])).catch(() => {/* ignore */});
  }, []);

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
      const expiry = new Date(new Date().setFullYear(new Date().getFullYear() + 5)).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      const ttl = [m.tempatLahir, m.tanggalLahir ? new Date(m.tanggalLahir).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : null].filter(Boolean).join(', ') || '-';
      const dadar = [member?.tempatDadar, member?.tahunDadar].filter(Boolean).join(', ') || '-';
      const lv = getLevelVisual(member?.tingkat, data.data.levelVisual || null);
      const stripHtml = Array.from({ length: lv.stripCount })
        .map(() => `<div class="level-strip" style="background:${lv.stripColor}"></div>`)
        .join('');
      const photoHtml = m.fotoPath
        ? `<img src="${window.location.origin}/api/uploads/${encodeURIComponent(m.fotoPath)}" alt="Foto" style="width:100%;height:100%;object-fit:cover"/>`
        : m.jenisKelamin === 'P'
          ? `<img src="${window.location.origin}/woman-icon.png" alt="foto" style="width:130px;height:130px;object-fit:contain;opacity:0.9;margin:52px auto 0;display:block"/>`
          : `<img src="${window.location.origin}/man-icon.png" alt="foto" style="width:130px;height:130px;object-fit:contain;opacity:0.9;margin:52px auto 0;display:block"/>`;
      const signerName = data.data.card?.signerName || 'Koordinator Distrik';
      const signerTitle = data.data.card?.signerTitle || 'THS-THM';
      const logoUrl = `${window.location.origin}/logo.png`;

      const win = window.open('', '_blank');
      if (!win) return;

      win.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>KTA - ${toProperCase(m.namaLengkap)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; padding: 20px; display: flex; flex-direction: column; align-items: center; gap: 20px; }
  @media print { body { padding: 0; } .page-break { page-break-after: always; } }
  .card { width: 856px; height: 540px; position: relative; border-radius: 28px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.15); flex-shrink: 0; }
  .card.front { background: linear-gradient(135deg, #ecfeff, #fff, #dbeafe); border: 2px solid #e2e8f0; }
  .card.back { background: linear-gradient(135deg, #1e3a5f, #1e40af, #0891b2); border: 2px solid #1e3a5f; }
  .front .bg-circle1 { position: absolute; top: -80px; right: -80px; width: 320px; height: 320px; border-radius: 50%; background: rgba(6,182,212,0.15); }
  .front .bg-circle2 { position: absolute; bottom: -110px; left: -80px; width: 380px; height: 380px; border-radius: 50%; background: rgba(29,78,216,0.08); }
  .front .top-bar { position: absolute; top: 0; left: 0; right: 0; height: 104px; background: linear-gradient(135deg, #2563eb, #1d4ed8); }
  .front .bottom-bar { position: absolute; bottom: 0; left: 0; right: 0; height: 96px; background: linear-gradient(315deg, #93c5fd, #dbeafe); }
  .guilloche { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
  .watermark { position: absolute; left: 230px; top: 166px; width: 600px; height: 207px; pointer-events: none; }
  .watermark img { width: 100%; height: 100%; object-fit: contain; opacity: 0.1; }
  .content { position: relative; z-index: 10; height: 100%; padding: 0; }
  .header-row { display: flex; align-items: center; gap: 14px; padding: 14px 24px; color: #fff; }
  .logo { width: 80px; height: 80px; border-radius: 50%; overflow: hidden; background: #fff; flex-shrink: 0; box-shadow: 0 0 0 3px rgba(255,255,255,0.35); position: relative; }
  .logo img { width: 76px; height: 76px; object-fit: contain; }
  .logo .shimmer { position: absolute; inset: 0; background: linear-gradient(135deg, transparent 30%, rgba(255,255,255,0.55) 50%, transparent 70%); }
  .header-text { line-height: 19px; }
  .header-text .row1 { font-size: 16px; font-weight: 900; letter-spacing: 2px; }
  .header-text .row2 { font-size: 16px; font-weight: 900; letter-spacing: 1.1px; margin-top: 1px; }
  .header-text .org { font-size: 16px; font-weight: 900; letter-spacing: 0.5px; margin-top: 1px; }
  .header-text .sub { font-size: 16px; font-weight: 900; margin-top: 1px; }
  .sig-wrap .shimmer { position: absolute; inset: -4px; border-radius: 12px; background: linear-gradient(135deg, rgba(34,211,238,0.2), rgba(255,255,255,0.3), rgba(252,211,77,0.2)); }
  .back .wm { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; }
  .back .wm img { width: 480px; height: 166px; object-fit: contain; opacity: 0.5; filter: invert(1); }
  .photo { position: absolute; left: 40px; top: 148px; width: 185px; height: 235px; border-radius: 16px; background: linear-gradient(135deg, #cbd5e1, #f1f5f9); border: 4px solid #fff; box-shadow: 0 4px 12px rgba(0,0,0,0.1); display: flex; align-items: center; justify-content: center; overflow: hidden; }
  .level-strips { position: absolute; left: 40px; top: 395px; width: 185px; display: flex; flex-direction: column; gap: 6px; }
  .level-strip { height: 14px; width: 100%; border-radius: 4px; border: 1px solid rgba(0,0,0,0.25); box-shadow: 0 1px 3px rgba(0,0,0,0.2); }
  .info { position: absolute; left: 240px; top: 148px; right: 40px; z-index: 20; }
  .info-row { margin-bottom: 13px; }
  .info-row .label { display: block; font-size: 12px; font-weight: 800; color: #1e3a5f; text-transform: uppercase; letter-spacing: 0.5px; font-family: Georgia, 'Times New Roman', serif; }
  .info-row .name { display: block; font-size: 19px; font-weight: 900; color: #0f2b4a; letter-spacing: 1.2px; margin-top: 3px; }
  .info-row .value { display: block; font-size: 15px; font-weight: 700; color: #111827; margin-top: 3px; line-height: 20px; }
  .bottom-info { position: absolute; left: 40px; bottom: 14px; color: #111827; }
  .bottom-info .label { font-size: 13px; font-weight: 700; color: #1e3a5f; font-family: Georgia, 'Times New Roman', serif; }
  .bottom-info .expiry { font-size: 16px; font-weight: 700; margin-top: 2px; }
  .signature { position: absolute; right: 0; bottom: 14px; width: 220px; text-align: center; color: #111827; }
  .signature .sig-wrap { position: relative; height: 110px; width: 110px; margin: 0 auto 2px; }
  .signature .sig { position: absolute; left: 22px; top: 81px; font-size: 16px; font-family: cursive; transform: rotate(-8deg); color: #334155; }
  .signature .sig img { position: absolute; left: 20px; top: 79px; width: 70px; height: 29px; object-fit: contain; opacity: 0.95; transform: rotate(-8deg); }
  .signature .stamp { position: absolute; left: 0; top: 0; width: 110px; height: 110px; border-radius: 50%; border: 4px solid rgba(30,64,175,0.45); display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 900; color: #1e40af; transform: rotate(-8deg); overflow: hidden; }
  .signature .stamp img { width: 100%; height: 100%; object-fit: cover; }
  .signature .title { font-size: 14px; font-weight: 900; color: #111827; }
  .signature .subtitle { font-size: 12px; font-weight: 600; color: #111827; margin-top: 2px; }

  .back .title { position: absolute; left: 0; right: 0; text-align: center; top: 28px; color: #fff; }
  .back .title h2 { font-size: 28px; font-weight: 900; letter-spacing: 0.16em; }
  .back .title p { font-size: 15px; opacity: 0.9; margin-top: 4px; }
  .qr-box { position: absolute; left: 48px; top: 145px; width: 210px; height: 210px; background: #fff; border-radius: 16px; border: 4px solid #1e3a5f; box-shadow: 0 4px 12px rgba(0,0,0,0.15); padding: 16px; display: flex; align-items: center; justify-content: center; }
  .qr-box img { width: 100%; height: 100%; }
  .back-info { position: absolute; left: 300px; top: 145px; right: 48px; background: rgba(255,255,255,0.9); border-radius: 16px; border: 1px solid rgba(191,219,254,0.5); padding: 24px; color: #334155; }
  .back-info .row { display: flex; gap: 8px; font-size: 18px; margin-bottom: 12px; }
  .back-info .row .lbl { width: 105px; font-weight: 900; color: #1e3a5f; text-transform: uppercase; font-family: Georgia, 'Times New Roman', serif; }
  .back-info .row .colon { width: 18px; font-weight: 900; color: #111827; }
  .back-info .row .val { font-weight: 600; }
  .back-info .desc { font-size: 18px; line-height: 1.5; margin-bottom: 16px; }
  .back-footer { position: absolute; left: 48px; right: 48px; bottom: 32px; display: flex; align-items: flex-end; justify-content: space-between; color: #fff; font-size: 15px; }
  .back-footer .url { text-align: right; }
  .back-footer .url .u { font-size: 13px; opacity: 0.8; }
  .back-footer .url .v { font-size: 16px; font-weight: 700; }
</style></head><body>
<div class="card front">
  <div class="bg-circle1"></div><div class="bg-circle2"></div>
  <div class="top-bar"></div><div class="bottom-bar"></div>
  <svg class="guilloche" viewBox="0 0 856 540" aria-hidden="true"><defs><pattern id="g-front" x="0" y="0" width="18" height="18" patternUnits="userSpaceOnUse"><path d="M0 9 Q4.5 0 9 9 T18 9" fill="none" stroke="rgba(29,78,216,0.3)" stroke-width="0.5"/></pattern></defs><rect x="16" y="16" width="824" height="508" rx="22" fill="none" stroke="url(#g-front)" stroke-width="14"/></svg>
  <div class="watermark"><img src="${window.location.origin}/peta-indonesia.png" alt="peta"/></div>
  <div class="content">
    <div class="header-row">
      <div class="logo"><img src="${logoUrl}" alt="THS-THM" /><div class="shimmer"></div></div>
      <div class="header-text">
        <div class="row1">KARTU TANDA ANGGOTA</div>
        <div class="row2">ORGANISASI PENCAK SILAT PENDIDIKAN</div>
        <div class="org">TUNGGAL HATI SEMINARI - TUNGGAL HATI MARIA</div>
        <div class="sub">DISTRIK KEUSKUPAN ${distrik}</div>
      </div>
    </div>
    <div class="photo">${photoHtml}</div>
    <div class="level-strips">${stripHtml}</div>
    <div class="info">
      <div class="info-row"><span class="label">No. Anggota</span><span class="name">${(m.nomorAnggota || '-').toUpperCase()}</span></div>
      <div class="info-row"><span class="label">Nama</span><span class="value">${(m.namaLengkap || '-').toUpperCase()}</span></div>
      <div class="info-row"><span class="label">Tempat, Tanggal Lahir</span><span class="value">${ttl.toUpperCase()}</span></div>
      <div class="info-row"><span class="label">Ranting</span><span class="value">${(m.ranting || '-').toUpperCase()}</span></div>
      <div class="info-row"><span class="label">Wilayah</span><span class="value">${(m.wilayah || '-').toUpperCase()}</span></div>
    </div>
    <div class="bottom-info">
      <div class="label">Berlaku sampai</div>
      <div class="expiry">${expiry}</div>
    </div>
    <div class="signature">
      <div class="sig-wrap">
        <div class="stamp">${data.data.stampImage ? `<img src="${window.location.origin}/api/uploads/${encodeURIComponent(data.data.stampImage)}" alt="stempel"/>` : 'STEMPEL'}</div>
        ${data.data.signatureImage ? `<img src="${window.location.origin}/api/uploads/${encodeURIComponent(data.data.signatureImage)}" alt="ttd" style="position:absolute;left:20px;top:79px;width:70px;height:29px;object-fit:contain;opacity:0.95;transform:rotate(-8deg)"/>` : '<div class="sig">ttd</div>'}
      </div>
      <div class="title">${signerName}</div>
      <div class="subtitle">${signerTitle}</div>
    </div>
  </div>
</div>
<div class="card back page-break">
  <svg class="guilloche" viewBox="0 0 856 540" aria-hidden="true"><defs><pattern id="g-back" x="0" y="0" width="18" height="18" patternUnits="userSpaceOnUse"><path d="M0 9 Q4.5 0 9 9 T18 9" fill="none" stroke="rgba(191,219,254,0.4)" stroke-width="0.5"/></pattern></defs><rect x="16" y="16" width="824" height="508" rx="22" fill="none" stroke="url(#g-back)" stroke-width="14"/></svg>
  <div class="wm"><img src="${window.location.origin}/peta-indonesia.png" alt="peta"/></div>
  <div class="content">
    <div class="title">
      <h2>VERIFIKASI KARTU ANGGOTA</h2>
      <p>Scan QR untuk memeriksa keabsahan anggota</p>
    </div>
    <div class="qr-box">${qr ? `<img src="${qr}" alt="QR"/>` : '<div style="width:100%;height:100%;display:grid;grid-template-columns:repeat(5,1fr);grid-template-rows:repeat(5,1fr);gap:4px">' + Array.from({length:25},(_,i)=>`<div style="background:${i%3===0||i%7===0?'#0f172a':'#e2e8f0'};border-radius:2px"></div>`).join('') + '</div>'}</div>
    <div class="back-info">
      <p class="desc">Halaman verifikasi publik hanya menampilkan data minimum untuk membuktikan keabsahan anggota.</p>
      <div class="row"><span class="lbl">TTL</span><span class="colon">:</span><span class="val">${ttl.toUpperCase()}</span></div>
      <div class="row"><span class="lbl">DADAR</span><span class="colon">:</span><span class="val">${dadar.toUpperCase()}</span></div>
      <div class="row"><span class="lbl">Status</span><span class="colon">:</span><span class="val">${(m.statusKeanggotaan === 'aktif' ? 'Aktif' : 'Nonaktif').toUpperCase()}</span></div>
      <div class="row"><span class="lbl">VALID S/D</span><span class="colon">:</span><span class="val">${expiry}</span></div>
    </div>
    <div class="back-footer">
      <div>Jika kartu ini ditemukan, harap menghubungi sekretariat THS-THM setempat.</div>
      <div class="url"><div class="u">URL Verifikasi</div><div class="v">/verify/member/token</div></div>
    </div>
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
  const validUntilText = new Date(new Date().setFullYear(new Date().getFullYear() + 5)).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const ttl = [member.tempatLahir, member.tanggalLahir ? new Date(member.tanggalLahir).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : null]
    .filter(Boolean)
    .join(', ') || '-';
  const dadar = [member.tempatDadar, member.tahunDadar].filter(Boolean).join(', ') || '-';

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
                      <MoreVertical size={16} />
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
        
                  {/* Front Side Preview */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Sisi Depan</h4>
                    <div className="relative w-full max-w-[856px] aspect-[856/540] rounded-[28px] overflow-hidden shadow-2xl border border-slate-300 bg-white">
                      {/* Background */}
                      <div className="absolute inset-0 bg-gradient-to-br from-cyan-50 via-white to-blue-100" />
                      <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-cyan-300/30" />
                      <div className="absolute -bottom-28 -left-20 w-96 h-96 rounded-full bg-blue-700/15" />
                      <div className="absolute top-0 left-0 right-0 h-[104px] bg-gradient-to-br from-blue-700 via-blue-600 to-blue-800" />
                      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-tr from-blue-300/70 via-blue-200/50 to-cyan-100/30" />

                      {/* Guilloche / microprint border pattern */}
                      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 856 540" aria-hidden="true">
                        <defs>
                          <pattern id="guilloche-front" x="0" y="0" width="18" height="18" patternUnits="userSpaceOnUse">
                            <path d="M0 9 Q4.5 0 9 9 T18 9" fill="none" stroke="rgba(29,78,216,0.3)" strokeWidth="0.5" />
                          </pattern>
                        </defs>
                        <rect x="16" y="16" width="824" height="508" rx="22" fill="none" stroke="url(#guilloche-front)" strokeWidth="14" />
                      </svg>

                      {/* Watermark — peta indonesia.png washout (digeser kanan, tidak mengenai bingkai foto) */}
                      <div className="absolute left-[230px] top-[166px] w-[600px] h-[207px] pointer-events-none opacity-[0.1]">
                        <img src="/peta-indonesia.png" alt="" className="w-full h-full object-contain" />
                      </div>

                      {/* Content */}
                      <div className="relative z-10 h-full">
                        {/* Header — 4 baris semua bold + logo utuh (contain) */}
                        <div className="px-6 pt-3.5 flex items-center gap-3.5 text-white">
                          <div className="w-20 h-20 rounded-full overflow-hidden bg-white shadow flex items-center justify-center flex-shrink-0 relative">
                            <img src="/logo.png" alt="THS-THM" className="w-[76px] h-[76px] object-contain" />
                            {/* Hologram / foil shimmer overlay */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/55 to-transparent" />
                          </div>
                          <div className="leading-[19px]">
                            <div className="text-[16px] font-black tracking-[2px]">KARTU TANDA ANGGOTA</div>
                            <div className="text-[16px] font-black tracking-[1.1px] mt-px">ORGANISASI PENCAK SILAT PENDIDIKAN</div>
                            <div className="text-[16px] font-black tracking-[0.5px] mt-px">TUNGGAL HATI SEMINARI - TUNGGAL HATI MARIA</div>
                            <div className="text-[16px] font-black mt-px">DISTRIK KEUSKUPAN {(member.ranting?.wilayah?.distrik?.nama || 'THS-THM').replace(/^keuskupan\s*/i, '').toUpperCase()}</div>
                          </div>
                        </div>
        
                        {/* Photo — fallback man-icon.png / woman-icon.png sesuai jenis kelamin (top sejajar label No. Anggota) */}
                        <div className="absolute left-10 top-[148px] w-[185px] h-[235px] rounded-2xl bg-slate-200 border-4 border-white shadow-lg overflow-hidden">
                          {member.fotoPath ? (
                            <img src={`/api/uploads/${encodeURIComponent(member.fotoPath)}`} alt="Foto" className="w-full h-full object-cover" />
                          ) : (
                            <img src={member.jenisKelamin === 'P' ? '/woman-icon.png' : '/man-icon.png'} alt="foto" className="w-[130px] h-[130px] object-contain opacity-90 mx-auto mt-[52px]" />
                          )}
                        </div>

                        {/* Level strips — sesuai tabel pengaturan tingkatan */}
                        <div className="absolute left-10 top-[395px] w-[185px] flex flex-col gap-[6px]">
                          {Array.from({ length: levelVisual.stripCount }).map((_, i) => (
                            <div
                              key={i}
                              className="h-[14px] w-full rounded-sm border border-black/25 shadow-sm"
                              style={levelVisual.stripColor ? { backgroundColor: levelVisual.stripColor } : undefined}
                            />
                          ))}
                        </div>
        
                        {/* Info — label di atas, nilai di bawah; kolom lebar ke kanan, z-20 agar teks di depan stempel & tidak wrap */}
                        <div className="absolute left-[240px] top-[148px] right-10 z-20 text-slate-800">
                          <InfoPreview label="No. Anggota" value={(member.nomorAnggota || '-').toUpperCase()} strong />
                          <InfoPreview label="Nama" value={(member.namaLengkap || '-').toUpperCase()} />
                          <InfoPreview
                            label="Tempat, Tanggal Lahir"
                            value={[member.tempatLahir || '-', member.tanggalLahir ? new Date(member.tanggalLahir).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-']
                              .filter(Boolean)
                              .join(', ')
                              .toUpperCase()}
                          />
                          <InfoPreview label="Ranting" value={(member.ranting?.nama || '-').toUpperCase()} />
                          <InfoPreview label="Wilayah" value={(member.ranting?.wilayah?.nama || '-').toUpperCase()} />
                        </div>
        
                        {/* Bottom — jarak bawah sama dengan jarak atas header (14px) */}
                        <div className="absolute left-10 bottom-[14px]">
                          <div className="text-[13px] font-bold text-blue-950">Berlaku sampai</div>
                          <div className="text-[16px] font-bold text-slate-900 mt-0.5">{validUntilText}</div>
                        </div>
                        {/* Signer — stempel 110px (50% dari 220px) di tengah container 220px, nama/jabatan tidak wrap; jarak bawah 14px */}
                        <div className="absolute right-0 bottom-[14px] w-[220px] text-center text-slate-900">
                          <div className="relative w-[110px] h-[110px] mb-[2px] mx-auto">
                            <div className="absolute left-0 top-0 w-[110px] h-[110px] rounded-full border-[4px] border-blue-800/45 flex items-center justify-center rotate-[-8deg] overflow-hidden">
                              {cardData?.stampImage ? (
                                <img src={`/api/uploads/${encodeURIComponent(cardData.stampImage)}`} alt="stempel" className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-[11px] font-black text-blue-800">STEMPEL</span>
                              )}
                            </div>
                            {cardData?.signatureImage ? (
                              <img src={`/api/uploads/${encodeURIComponent(cardData.signatureImage)}`} alt="ttd" className="absolute left-[20px] top-[79px] w-[70px] h-[29px] object-contain opacity-95 rotate-[-8deg]" />
                            ) : (
                              <div className="absolute left-[22px] top-[81px] text-[16px] font-[cursive] rotate-[-8deg] text-slate-700">ttd</div>
                            )}
                          </div>
                          <div className="text-[14px] font-black max-w-[220px] mx-auto">{(cardData?.signerName || 'Koordinator Distrik').toUpperCase()}</div>
                          <div className="text-[12px] font-semibold mt-0.5 max-w-[220px] mx-auto">{(cardData?.signerTitle || 'THS-THM').toUpperCase()}</div>
                        </div>
                      </div>
                    </div>
                  </div>
        
                  {/* Back Side Preview */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Sisi Belakang</h4>
                    <div className="relative w-full max-w-[856px] aspect-[856/540] rounded-[28px] overflow-hidden shadow-2xl border border-slate-300 bg-gradient-to-r from-blue-950 via-blue-800 to-cyan-600">
                      {/* Guilloche / microprint border pattern */}
                      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 856 540" aria-hidden="true">
                        <defs>
                          <pattern id="guilloche-back" x="0" y="0" width="18" height="18" patternUnits="userSpaceOnUse">
                            <path d="M0 9 Q4.5 0 9 9 T18 9" fill="none" stroke="rgba(191,219,254,0.4)" strokeWidth="0.5" />
                          </pattern>
                        </defs>
                        <rect x="16" y="16" width="824" height="508" rx="22" fill="none" stroke="url(#guilloche-back)" strokeWidth="14" />
                      </svg>
                      {/* Watermark peta PUTIH (invert peta indonesia.png) */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.5]">
                        <img src="/peta-indonesia.png" alt="" className="w-[480px] h-[166px] object-contain invert" />
                      </div>
                      <div className="relative z-10 h-full">
                        <div className="absolute top-7 left-0 right-0 text-center">
                          <div className="text-[28px] font-black tracking-[0.16em] text-white">VERIFIKASI KARTU ANGGOTA</div>
                          <div className="text-[15px] opacity-90 text-white mt-1">Scan QR untuk memeriksa keabsahan anggota</div>
                        </div>
                        <div className="absolute left-12 top-[145px] w-[210px] h-[210px] bg-white rounded-2xl border-4 border-blue-900 shadow-lg p-4 flex items-center justify-center">
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
                        <div className="absolute left-[300px] top-[145px] right-12 text-slate-800">
                          <div className="bg-white/85 rounded-2xl border border-blue-200 p-6 shadow-sm">
                            <p className="text-[18px] leading-relaxed text-slate-700 mb-4">Halaman verifikasi publik hanya menampilkan data minimum untuk membuktikan keabsahan anggota.</p>
                            <BackPreview label="TTL" value={ttl.toUpperCase()} />
                            <BackPreview label="DADAR" value={dadar.toUpperCase()} />
                            <BackPreview label="Status" value={(member.statusKeanggotaan === 'aktif' ? 'Aktif' : 'Nonaktif').toUpperCase()} />
                            <BackPreview label="VALID S/D" value={validUntilText} />
                          </div>
                        </div>
                        <div className="absolute left-12 right-12 bottom-8 text-white flex items-end justify-between gap-6">
                          <div className="max-w-[610px] text-[15px] leading-relaxed opacity-95">Jika kartu ini ditemukan, harap menghubungi sekretariat THS-THM setempat.</div>
                          <div className="text-right">
                            <div className="text-[13px] opacity-80">URL Verifikasi</div>
                            <div className="text-[16px] font-bold">/verify/member/token</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
        
                  {/* Download Actions */}
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
              <Modal
                open={showEditModal}
                onClose={() => setShowEditModal(false)}
                title="Edit Anggota"
                size="md"
              >
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setEditLoading(true);
                    setEditError('');
                    try {
                      const payload: Record<string, unknown> = {};
                      if (editForm.namaLengkap !== member?.namaLengkap) payload.namaLengkap = editForm.namaLengkap;
                      if (editForm.jenisKelamin !== member?.jenisKelamin) payload.jenisKelamin = editForm.jenisKelamin;
                      if (editForm.tempatLahir !== (member?.tempatLahir || '')) payload.tempatLahir = editForm.tempatLahir;
                      if (editForm.tanggalLahir !== (member?.tanggalLahir || '')) payload.tanggalLahir = editForm.tanggalLahir;
                      if (editForm.alamat !== (member?.alamat || '')) payload.alamat = editForm.alamat;
                      if (editForm.noHp !== (member?.noHp || '')) payload.noHp = editForm.noHp;
                      if (editForm.email !== (member?.email || '')) payload.email = editForm.email;
                      if (editForm.tingkat !== (member?.tingkat || '')) payload.tingkat = editForm.tingkat;
                      if (editForm.tempatDadar !== (member?.tempatDadar || '')) payload.tempatDadar = editForm.tempatDadar;
                      if (editForm.tahunDadar !== (member?.tahunDadar || '')) payload.tahunDadar = editForm.tahunDadar;
                      if (editForm.rantingId !== (member?.rantingId || '')) payload.rantingId = editForm.rantingId;
        
                      if (Object.keys(payload).length === 0) {
                        setEditError('Tidak ada perubahan yang dilakukan');
                        setEditLoading(false);
                        return;
                      }
        
                      await apiClient.patch(`/members/${member!.id}`, payload);
                      setShowEditModal(false);
                      await fetchMember();
                    } catch (err: unknown) {
                      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
                      setEditError(msg || 'Gagal menyimpan perubahan');
                    } finally {
                      setEditLoading(false);
                    }
                  }}
                  className="space-y-4"
                >
                  {editError && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-2">
                      <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
                      <p className="text-sm text-red-700 dark:text-red-400">{editError}</p>
                    </div>
                  )}
        
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nama Lengkap</label>
                      <input
                        type="text"
                        value={editForm.namaLengkap}
                        onChange={(e) => setEditForm({ ...editForm, namaLengkap: e.target.value })}
                        required
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Jenis Kelamin</label>
                      <select
                        value={editForm.jenisKelamin}
                        onChange={(e) => setEditForm({ ...editForm, jenisKelamin: e.target.value as 'L' | 'P' })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="L">Laki-laki</option>
                        <option value="P">Perempuan</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tempat Lahir</label>
                      <input
                        type="text"
                        value={editForm.tempatLahir}
                        onChange={(e) => setEditForm({ ...editForm, tempatLahir: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tanggal Lahir</label>
                      <input
                        type="date"
                        value={editForm.tanggalLahir ? editForm.tanggalLahir.split('T')[0] : ''}
                        onChange={(e) => setEditForm({ ...editForm, tanggalLahir: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tempat - Tahun Dadar</label>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={editForm.tempatDadar}
                          onChange={(e) => setEditForm({ ...editForm, tempatDadar: e.target.value })}
                          placeholder="Tempat dadar"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                          type="text"
                          value={editForm.tahunDadar}
                          onChange={(e) => setEditForm({ ...editForm, tahunDadar: e.target.value })}
                          placeholder="Tahun"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Alamat</label>
                      <textarea
                        value={editForm.alamat}
                        onChange={(e) => setEditForm({ ...editForm, alamat: e.target.value })}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">No. HP</label>
                      <input
                        type="text"
                        value={editForm.noHp}
                        onChange={(e) => setEditForm({ ...editForm, noHp: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                      <input
                        type="email"
                        value={editForm.email}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tingkat</label>
                      <select
                        value={editForm.tingkat}
                        onChange={(e) => setEditForm({ ...editForm, tingkat: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Pilih Tingkat</option>
                        {tingkatanList.map((t) => (
                          <option key={t.id} value={t.nama}>{t.nama}</option>
                        ))}
                      </select>
                    </div>
                  </div>
        
                  {/* Organisasi - Cascading dropdowns */}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-2">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Organisasi</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Distrik</label>
                        <select
                          value={editForm.distrikId}
                          onChange={async (e) => {
                            const distrikId = e.target.value;
                            setEditForm({ ...editForm, distrikId, wilayahId: '', rantingId: '' });
                            setEditWilayahs([]);
                            setEditRantings([]);
                            if (distrikId) {
                              setEditWilayahLoading(true);
                              try {
                                const wRes = await apiClient.get(`/org-structure/wilayah?distrikId=${distrikId}`);
                                setEditWilayahs(wRes.data.data || []);
                              } catch { /* ignore */ }
                              setEditWilayahLoading(false);
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Pilih Distrik</option>
                          {editDistriks.map((d) => (
                            <option key={d.id} value={d.id}>{d.nama}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Wilayah</label>
                        <select
                          value={editForm.wilayahId}
                          onChange={async (e) => {
                            const wilayahId = e.target.value;
                            setEditForm({ ...editForm, wilayahId, rantingId: '' });
                            setEditRantings([]);
                            if (wilayahId) {
                              setEditRantingLoading(true);
                              try {
                                const rRes = await apiClient.get(`/org-structure/ranting?wilayahId=${wilayahId}`);
                                setEditRantings(rRes.data.data || []);
                              } catch { /* ignore */ }
                              setEditRantingLoading(false);
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Pilih Wilayah</option>
                          {editWilayahLoading ? (
                            <option disabled>Memuat...</option>
                          ) : (
                            editWilayahs.map((w) => (
                              <option key={w.id} value={w.id}>{w.nama}</option>
                            ))
                          )}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ranting</label>
                        <select
                          value={editForm.rantingId}
                          onChange={(e) => setEditForm({ ...editForm, rantingId: e.target.value })}
                          required
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Pilih Ranting</option>
                          {editRantingLoading ? (
                            <option disabled>Memuat...</option>
                          ) : (
                            editRantings.map((r) => (
                              <option key={r.id} value={r.id}>{r.nama}</option>
                            ))
                          )}
                        </select>
                      </div>
                    </div>
                  </div>
        
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowEditModal(false)}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={editLoading}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
                    >
                      {editLoading ? (
                        <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Menyimpan...</>
                      ) : (
                        <><Save size={16} />Simpan Perubahan</>
                      )}
                    </button>
                  </div>
                </form>
              </Modal>
        
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
