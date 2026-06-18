'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
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
  RefreshCw,
  ExternalLink,
  MoreVertical,
  BadgeCheck,
  Users,
  IdCard,
  Download,
  Image,
  Pencil,
  X,
  Save,
} from 'lucide-react';
import Modal from '@/components/ui/modal';
import {
  StatusBadge,
  InfoRow,
  DetailStats,
  DetailSkeleton,
  DUES_STATUS_STYLES,
  DOCUMENT_TYPES,
  FLAT_STATUS_LABELS,
  formatDate,
  formatRupiah,
} from '@/components/members/constants';

// ─── Types ───

interface MemberDetail {
  id: string;
  nomorAnggota: string;
  namaLengkap: string;
  jenisKelamin: 'L' | 'P';
  tempatLahir: string | null;
  tanggalLahir: string | null;
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
  jenis: string;
  namaDokumen?: string;
  status: string;
  tokenVerifikasi?: string;
  createdAt: string;
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

function InfoPreview({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="grid grid-cols-[100px_1fr] gap-1 mt-2 items-start">
      <div className="text-sm font-bold text-blue-950">{label}</div>
      <div className={`${strong ? 'text-lg font-black text-blue-950' : 'text-sm font-semibold text-slate-800'}`}>
        : {value}
      </div>
    </div>
  );
}

function BackPreview({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[80px_1fr] gap-2 text-sm mb-2">
      <div className="font-black text-blue-950">{label}</div>
      <div className="font-semibold">: {value}</div>
    </div>
  );
}

// ─── Page Component ───

export default function MemberDetailPage() {
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
  const [cardData, setCardData] = useState<{ qrCode: string } | null>(null);
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
          if (data.success) setCardData({ qrCode: data.data.qrCode });
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

  const downloadKTA = async (memberId: string, _format: 'pdf' | 'image') => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${window.location.origin}/api/members/${memberId}/digital-card`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!data.success) {
        alert('Gagal memuat data KTA');
        return;
      }

      const m = data.data.member;
      const qr = data.data.qrCode;
      const distrik = m.distrik || 'THS-THM';
      const expiry = new Date(new Date().setFullYear(new Date().getFullYear() + 5)).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      const ttl = [m.tempatLahir, m.tanggalLahir ? new Date(m.tanggalLahir).toLocaleDateString('id-ID') : null].filter(Boolean).join(', ') || '-';

      const win = window.open('', '_blank');
      if (!win) return;

      win.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>KTA - ${m.namaLengkap}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; padding: 20px; display: flex; flex-direction: column; align-items: center; gap: 20px; }
  @media print { body { padding: 0; } .page-break { page-break-after: always; } }
  .card { width: 856px; height: 540px; position: relative; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.15); flex-shrink: 0; }
  .card.front { background: linear-gradient(135deg, #ecfeff, #fff, #dbeafe); border: 2px solid #e2e8f0; }
  .card.back { background: linear-gradient(135deg, #1e3a5f, #1e40af, #0891b2); border: 2px solid #1e3a5f; }
  .front .bg-circle1 { position: absolute; top: -80px; right: -80px; width: 320px; height: 320px; border-radius: 50%; background: rgba(6,182,212,0.15); }
  .front .bg-circle2 { position: absolute; bottom: -110px; left: -80px; width: 380px; height: 380px; border-radius: 50%; background: rgba(29,78,216,0.08); }
  .front .top-bar { position: absolute; top: 0; left: 0; right: 0; height: 64px; background: linear-gradient(90deg, #1e3a5f, #1d4ed8, #06b6d4); }
  .front .bottom-bar { position: absolute; bottom: 0; left: 0; right: 0; height: 80px; background: linear-gradient(90deg, #0f2b4a, #1e40af, #0891b2); }
  .front .border-inner, .back .border-inner { position: absolute; inset: 18px; border-radius: 20px; border: 2px solid rgba(250,204,21,0.6); }
  .watermark { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 100px; font-weight: 900; color: rgba(30,58,95,0.04); pointer-events: none; }
  .content { position: relative; z-index: 10; height: 100%; padding: 32px; }
  .header-row { display: flex; align-items: flex-start; gap: 16px; color: #fff; }
  .logo { width: 48px; height: 48px; border-radius: 50%; background: #fde047; border: 4px solid #0f172a; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .logo-inner { width: 32px; height: 32px; border-radius: 50%; background: #fff; border: 1px solid #334155; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 900; color: #1e3a5f; }
  .header-text { line-height: 1.2; }
  .header-text .org { font-size: 18px; font-weight: 900; letter-spacing: 0.02em; }
  .header-text .sub { font-size: 14px; font-weight: 600; opacity: 0.9; }
  .title-badge { position: absolute; left: 0; right: 0; text-align: center; top: 82px; }
  .title-badge span { display: inline-block; padding: 6px 24px; border-radius: 999px; background: rgba(255,255,255,0.9); border: 1px solid #eab308; box-shadow: 0 1px 3px rgba(0,0,0,0.1); font-size: 18px; font-weight: 900; letter-spacing: 0.18em; color: #1e3a5f; }
  .photo { position: absolute; left: 32px; top: 140px; width: 160px; height: 200px; border-radius: 16px; background: linear-gradient(135deg, #cbd5e1, #f1f5f9); border: 4px solid #fff; box-shadow: 0 4px 12px rgba(0,0,0,0.1); display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 14px; font-weight: 600; }
  .info { position: absolute; left: 210px; top: 138px; right: 30px; }
  .info-row { display: grid; grid-template-columns: 100px 1fr; gap: 4px; margin-top: 8px; align-items: start; }
  .info-row.label { font-size: 14px; font-weight: 700; color: #1e3a5f; }
  .info-row.name { font-size: 18px; font-weight: 900; color: #1e3a5f; }
  .info-row.value { font-size: 14px; font-weight: 600; color: #1e293b; }
  .bottom-info { position: absolute; left: 32px; bottom: 28px; color: #fff; font-size: 12px; }
  .bottom-info .expiry { font-size: 18px; font-weight: 900; }
  .signature { position: absolute; right: 40px; bottom: 24px; text-align: center; color: #fff; }
  .signature .sig { font-size: 30px; font-family: cursive; transform: rotate(-8deg); color: rgba(15,23,42,0.8); margin-bottom: 4px; }
  .signature .title { font-size: 13px; font-weight: 900; border-top: 1px solid rgba(255,255,255,0.6); padding-top: 4px; }
  .signature .subtitle { font-size: 10px; font-weight: 600; opacity: 0.9; }
  .back .title { position: absolute; left: 0; right: 0; text-align: center; top: 24px; color: #fff; }
  .back .title h2 { font-size: 22px; font-weight: 900; letter-spacing: 0.16em; }
  .back .title p { font-size: 12px; opacity: 0.9; margin-top: 4px; }
  .qr-box { position: absolute; left: 40px; top: 100px; width: 170px; height: 170px; background: #fff; border-radius: 16px; border: 4px solid #1e3a5f; box-shadow: 0 4px 12px rgba(0,0,0,0.15); padding: 12px; display: flex; align-items: center; justify-content: center; }
  .qr-box img { width: 100%; height: 100%; }
  .back-info { position: absolute; left: 240px; top: 100px; right: 30px; background: rgba(255,255,255,0.85); border-radius: 16px; border: 1px solid rgba(191,219,254,0.5); padding: 16px; color: #334155; }
  .back-info .row { display: grid; grid-template-columns: 80px 1fr; gap: 8px; font-size: 14px; margin-bottom: 8px; }
  .back-info .row .lbl { font-weight: 900; color: #1e3a5f; }
  .back-info .row .val { font-weight: 600; }
  .back-info .desc { font-size: 14px; line-height: 1.5; margin-bottom: 12px; }
  .back-footer { position: absolute; left: 30px; right: 30px; bottom: 24px; display: flex; align-items: flex-end; justify-content: space-between; color: #fff; font-size: 12px; }
  .back-footer .url { text-align: right; }
  .back-footer .url .u { font-size: 10px; opacity: 0.8; }
  .back-footer .url .v { font-size: 13px; font-weight: 700; }
</style></head><body>
<div class="card front">
  <div class="bg-circle1"></div><div class="bg-circle2"></div>
  <div class="top-bar"></div><div class="bottom-bar"></div>
  <div class="border-inner"></div>
  <div class="watermark">THS</div>
  <div class="content">
    <div class="header-row">
      <div class="logo"><div class="logo-inner">THS</div></div>
      <div class="header-text">
        <div class="org">TUNGGAL HATI SEMINARI - TUNGGAL HATI MARIA</div>
        <div class="sub">DISTRIK ${distrik}</div>
      </div>
    </div>
    <div class="title-badge"><span>KARTU TANDA ANGGOTA</span></div>
    <div class="photo">FOTO</div>
    <div class="info">
      <div class="info-row"><span class="label">Nama</span><span class="name">: ${m.namaLengkap}</span></div>
      <div class="info-row"><span class="label">No. Anggota</span><span class="value">: ${m.nomorAnggota}</span></div>
      <div class="info-row"><span class="label">Ranting</span><span class="value">: ${m.ranting || '-'}</span></div>
      <div class="info-row"><span class="label">Wilayah</span><span class="value">: ${m.wilayah || '-'}</span></div>
      <div class="info-row"><span class="label">Distrik</span><span class="value">: ${distrik}</span></div>
    </div>
    <div class="bottom-info">
      <div>Berlaku sampai</div>
      <div class="expiry">${expiry}</div>
    </div>
    <div class="signature">
      <div class="sig">ttd</div>
      <div class="title">Koordinator Distrik</div>
      <div class="subtitle">THS-THM</div>
    </div>
  </div>
</div>
<div class="card back page-break">
  <div class="border-inner"></div>
  <div class="content">
    <div class="title">
      <h2>VERIFIKASI KARTU ANGGOTA</h2>
      <p>Scan QR untuk memeriksa keabsahan anggota</p>
    </div>
    <div class="qr-box">${qr ? `<img src="${qr}" alt="QR"/>` : '<div style="width:100%;height:100%;display:grid;grid-template-columns:repeat(5,1fr);grid-template-rows:repeat(5,1fr);gap:4px">' + Array.from({length:25},(_,i)=>`<div style="background:${i%3===0||i%7===0?'#0f172a':'#e2e8f0'};border-radius:2px"></div>`).join('') + '</div>'}</div>
    <div class="back-info">
      <p class="desc">Halaman verifikasi publik hanya menampilkan data minimum untuk membuktikan keabsahan anggota.</p>
      <div class="row"><span class="lbl">TTL</span><span class="val">: ${ttl}</span></div>
      <div class="row"><span class="lbl">Status</span><span class="val">: ${m.statusKeanggotaan === 'aktif' ? 'Aktif' : 'Nonaktif'}</span></div>
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
      alert('Gagal memuat KTA. Silakan coba lagi.');
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

  const initials = member.namaLengkap
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const totalPaid = member.iuran
    .filter((d: DuesItem) => d.status === 'lunas')
    .reduce((sum: number, d: DuesItem) => sum + Number(d.jumlah), 0);

  const totalDues = member.iuran.length;
  const paidDues = member.iuran.filter((d: DuesItem) => d.status === 'lunas').length;

  const orgPath =
    [member.ranting?.wilayah?.distrik?.nama, member.ranting?.wilayah?.nama, member.ranting?.nama]
      .filter(Boolean)
      .join(' › ') || '-';

  return (
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
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 relative">
          <button
            onClick={fetchMember}
            className="absolute top-3 right-3 p-2 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-sm transition text-white"
            title="Refresh"
          >
            <RefreshCw size={14} />
          </button>
        </div>
        <div className="px-6 pb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 -mt-12">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg ring-4 ring-white dark:ring-gray-800">
              {initials}
            </div>
            <div className="flex-1 mt-2 sm:mt-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  {member.namaLengkap}
                </h1>
                <span className="font-mono text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-md">
                  {member.nomorAnggota}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <StatusBadge status={member.statusKeanggotaan} bordered />
                <StatusBadge status={member.statusValidasi} bordered />
                <StatusBadge status={member.statusData} bordered />
                {member.tingkat && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-400">
                    <Award size={12} />
                    {member.tingkat}
                  </span>
                )}
              </div>
            </div>
            {/* Quick Actions */}
            <div className="flex items-center gap-2 mt-4 sm:mt-0">
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
                onClick={async () => {
                  setEditForm({
                    namaLengkap: member.namaLengkap,
                    jenisKelamin: member.jenisKelamin,
                    tempatLahir: member.tempatLahir || '',
                    tanggalLahir: member.tanggalLahir || '',
                    alamat: member.alamat || '',
                    noHp: member.noHp || '',
                    email: member.email || '',
                    tingkat: member.tingkat || '',
                    rantingId: member.rantingId || '',
                    distrikId: member.ranting?.wilayah?.distrik?.id || '',
                    wilayahId: member.ranting?.wilayah?.id || '',
                  });
                  setEditError('');
                  // Fetch distrik & cascading data
                  try {
                    const dRes = await apiClient.get('/org-structure/distrik');
                    setEditDistriks(dRes.data.data || []);
                    const distrikId = member.ranting?.wilayah?.distrik?.id;
                    if (distrikId) {
                      const wRes = await apiClient.get(`/org-structure/wilayah?distrikId=${distrikId}`);
                      setEditWilayahs(wRes.data.data || []);
                      const wilayahId = member.ranting?.wilayah?.id;
                      if (wilayahId) {
                        const rRes = await apiClient.get(`/org-structure/ranting?wilayahId=${wilayahId}`);
                        setEditRantings(rRes.data.data || []);
                      }
                    }
                  } catch { /* ignore */ }
                  setShowEditModal(true);
                }}
                className="flex items-center gap-1.5 px-3 py-2 border border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-400 rounded-lg text-xs font-medium hover:bg-blue-50 dark:hover:bg-blue-950 transition"
              >
                <Pencil size={14} />
                Edit
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 transition text-gray-400 hover:text-red-500"
                title="Hapus anggota"
              >
                <MoreVertical size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

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
              <InfoRow icon={User} label="Nama Lengkap" value={member.namaLengkap} />
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
                <InfoRow icon={Award} label="Tingkat" value={member.tingkat || null} />
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
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <FileText size={18} className="text-blue-500" />
              Dokumen Anggota
            </h3>
            <span className="text-xs text-gray-400">{member.dokumen.length} dokumen</span>
          </div>
          {member.dokumen.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700">
                    <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">
                      Jenis
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">
                      Nama Dokumen
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">
                      Status
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400 hidden sm:table-cell">
                      Dibuat
                    </th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {member.dokumen.map((doc) => (
                    <tr
                      key={doc.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition"
                    >
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {DOCUMENT_TYPES[doc.jenis] || doc.jenis}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {doc.namaDokumen || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={doc.status} />
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-xs text-gray-500">
                        {formatDate(doc.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {doc.tokenVerifikasi && (
                            <Link
                              href={`/verify/${doc.tokenVerifikasi}`}
                              target="_blank"
                              className="p-1.5 rounded hover:bg-blue-50 dark:hover:bg-blue-950 transition"
                              title="Verifikasi Dokumen"
                            >
                              <BadgeCheck size={14} className="text-blue-600" />
                            </Link>
                          )}
                          <Link
                            href={`/documents?search=${doc.jenis}`}
                            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                            title="Lihat Detail"
                          >
                            <ExternalLink size={14} className="text-gray-400" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
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
            <div className="relative w-full max-w-[856px] aspect-[856/540] rounded-[20px] overflow-hidden shadow-xl border border-gray-300 bg-white">
              {/* Background */}
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-50 via-white to-blue-100" />
              <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-cyan-300/30" />
              <div className="absolute -bottom-28 -left-20 w-96 h-96 rounded-full bg-blue-700/15" />
              <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-r from-blue-900 via-blue-700 to-cyan-500" />
              <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-r from-blue-950 via-blue-800 to-cyan-600" />
              <div className="absolute inset-[18px] rounded-[20px] border-2 border-yellow-400/80" />
              
              {/* Watermark */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.06]">
                <div className="w-60 h-60 rounded-full border-[18px] border-blue-900 flex items-center justify-center text-5xl font-black text-blue-900">THS</div>
              </div>

              {/* Content */}
              <div className="relative z-10 h-full p-8">
                {/* Header */}
                <div className="flex items-start gap-4 text-white">
                  <div className="w-12 h-12 rounded-full bg-yellow-300 border-4 border-slate-900 flex items-center justify-center flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-white border border-slate-700 flex items-center justify-center text-[9px] font-black text-blue-800">THS</div>
                  </div>
                  <div className="leading-tight">
                    <div className="text-[18px] font-black tracking-wide">TUNGGAL HATI SEMINARI - TUNGGAL HATI MARIA</div>
                    <div className="text-[14px] font-semibold opacity-95">DISTRIK {member.ranting?.wilayah?.distrik?.nama?.toUpperCase() || 'THS-THM'}</div>
                  </div>
                </div>

                {/* Title */}
                <div className="absolute left-0 right-0 text-center" style={{ top: '82px' }}>
                  <div className="inline-block px-6 py-1.5 rounded-full bg-white/90 border border-yellow-500 shadow-sm">
                    <span className="text-[18px] font-black tracking-[0.18em] text-blue-900">KARTU TANDA ANGGOTA</span>
                  </div>
                </div>

                {/* Photo */}
                <div className="absolute left-8 rounded-2xl bg-slate-200 border-4 border-white shadow-lg overflow-hidden" style={{ top: '140px', width: '160px', height: '200px' }}>
                  <div className="w-full h-full bg-gradient-to-br from-slate-300 to-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm">FOTO</div>
                </div>

                {/* Info */}
                <div className="absolute text-slate-800" style={{ left: '210px', top: '138px', right: '30px' }}>
                  <InfoPreview label="Nama" value={member.namaLengkap} strong />
                  <InfoPreview label="No. Anggota" value={member.nomorAnggota} />
                  <InfoPreview label="Ranting" value={member.ranting?.nama || '-'} />
                  <InfoPreview label="Wilayah" value={member.ranting?.wilayah?.nama || '-'} />
                  <InfoPreview label="Distrik" value={member.ranting?.wilayah?.distrik?.nama || '-'} />
                </div>

                {/* Bottom */}
                <div className="absolute left-8 text-white" style={{ bottom: '28px' }}>
                  <div className="text-[12px] opacity-90">Berlaku sampai</div>
                  <div className="text-[18px] font-black">{new Date(new Date().setFullYear(new Date().getFullYear() + 5)).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                </div>
                <div className="absolute text-center text-white" style={{ right: '40px', bottom: '24px' }}>
                  <div className="relative h-16 w-36">
                    <div className="absolute left-6 top-0 text-3xl font-[cursive] rotate-[-8deg] text-slate-900/80">ttd</div>
                    <div className="absolute right-0 top-0 w-16 h-16 rounded-full border-4 border-blue-200/80 flex items-center justify-center text-[8px] font-bold text-blue-100 rotate-[-12deg]">STEMPEL</div>
                  </div>
                  <div className="text-[13px] font-black border-t border-white/60 pt-1">Koordinator Distrik</div>
                  <div className="text-[10px] font-semibold opacity-95">THS-THM</div>
                </div>
              </div>
            </div>
          </div>

          {/* Back Side Preview */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Sisi Belakang</h4>
            <div className="relative w-full max-w-[856px] aspect-[856/540] rounded-[20px] overflow-hidden shadow-xl border border-gray-300 bg-gradient-to-r from-blue-950 via-blue-800 to-cyan-600">
              <div className="absolute inset-[18px] rounded-[20px] border-2 border-yellow-400/80" />
              <div className="relative z-10 h-full p-8">
                <div className="absolute left-0 right-0 text-center" style={{ top: '24px' }}>
                  <div className="text-[22px] font-black tracking-[0.16em] text-white">VERIFIKASI KARTU ANGGOTA</div>
                  <div className="text-[12px] opacity-90 text-white mt-1">Scan QR untuk memeriksa keabsahan anggota</div>
                </div>
                <div className="absolute bg-white rounded-2xl border-4 border-blue-900 shadow-lg p-3 flex items-center justify-center" style={{ left: '40px', top: '100px', width: '170px', height: '170px' }}>
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
                <div className="absolute bg-white/85 rounded-2xl border border-blue-200 p-4 shadow-sm" style={{ left: '240px', top: '100px', right: '30px' }}>
                  <p className="text-sm leading-relaxed text-slate-700 mb-3">Halaman verifikasi publik hanya menampilkan data minimum untuk membuktikan keabsahan anggota.</p>
                  <BackPreview label="TTL" value={member.tempatLahir ? `${member.tempatLahir}, ${member.tanggalLahir ? new Date(member.tanggalLahir).toLocaleDateString('id-ID') : '-'}` : member.tanggalLahir ? new Date(member.tanggalLahir).toLocaleDateString('id-ID') : '-'} />
                  <BackPreview label="Status" value={member.statusKeanggotaan === 'aktif' ? 'Aktif' : 'Nonaktif'} />
                </div>
                <div className="absolute text-white flex items-end justify-between gap-6" style={{ left: '30px', right: '30px', bottom: '24px' }}>
                  <div className="text-xs leading-relaxed opacity-95 max-w-[500px]">Jika kartu ini ditemukan, harap menghubungi sekretariat THS-THM setempat.</div>
                  <div className="text-right">
                    <div className="text-[10px] opacity-80">URL Verifikasi</div>
                    <div className="text-[13px] font-bold">/verify/member/token</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Download Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => downloadKTA(member.id, 'pdf')}
              className="flex items-center justify-center gap-3 px-6 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium shadow-lg"
            >
              <Download size={20} />
              Download PDF (KTA) — 2 Sisi
            </button>
            <button
              onClick={() => downloadKTA(member.id, 'image')}
              className="flex items-center justify-center gap-3 px-6 py-4 bg-green-600 text-white rounded-xl hover:bg-green-700 transition font-medium shadow-lg"
            >
              <Image size={20} />
              Preview PNG (KTA)
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
              <input
                type="text"
                value={editForm.tingkat}
                onChange={(e) => setEditForm({ ...editForm, tingkat: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
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
              Tindakan ini akan menghapus <strong>{member.namaLengkap}</strong> secara permanen.
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
  );
}
