'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import apiClient from '@/lib/api-client';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  FileText,
  User,
  Calendar,
  XCircle,
  Building2,
  Hash,
  RefreshCw,
  Fingerprint,
  MapPin,
  CreditCard,
  Clock,
} from 'lucide-react';

interface KtaMember {
  nomorAnggota?: string;
  namaLengkap?: string;
  fotoPath?: string | null;
  jenisKelamin?: string;
  tempatLahir?: string;
  tanggalLahir?: string;
  statusKeanggotaan?: string;
  ranting?: string;
  wilayah?: string;
  distrik?: string;
}

interface VerificationResult {
  valid: boolean;
  tipe?: string;
  dokumenId?: string;
  nomorDokumen?: string;
  status?: string;
  createdAt?: string;
  nomorAnggota?: string;
  namaAnggota?: string;
  firstScanned?: boolean;
  scanCount?: number;
  lastScannedAt?: string | null;
  scanLimit?: number;
  scanLeft?: number;
  member?: KtaMember;
  message?: string;
}

const DOCUMENT_LABELS: Record<string, string> = {
  kartu_anggota: 'Kartu Tanda Anggota (KTA)',
  sertifikat_pendadaran: 'Sertifikat Pendadaran',
  sertifikat_pelatihan: 'Sertifikat Pelatihan',
  piagam_prestasi: 'Piagam Prestasi',
};

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  aktif: { label: 'Anggota Aktif', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  nonaktif: { label: 'Nonaktif', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  pindah: { label: 'Pindah', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  keluar: { label: 'Keluar', className: 'bg-red-100 text-red-700 border-red-200' },
  meninggal: { label: 'Meninggal', className: 'bg-gray-100 text-gray-600 border-gray-200' },
};

function formatDate(dateStr?: string) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function formatDateTime(dateStr?: string) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function photoUrl(fotoPath?: string | null) {
  if (!fotoPath) return null;
  const base = `/api/uploads/${encodeURIComponent(fotoPath)}`;
  return `${base}.bg.png`;
}

function VerificationSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 animate-pulse">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-gray-200 rounded-2xl" />
          </div>
          <div className="space-y-3 text-center">
            <div className="h-6 bg-gray-200 rounded w-48 mx-auto" />
            <div className="h-4 bg-gray-200 rounded w-64 mx-auto" />
            <div className="h-10 bg-gray-200 rounded-xl w-full mt-6" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyDocumentPage() {
  const params = useParams();
  const token = params?.token as string;

  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);

  const verify = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    setAttempts((prev) => prev + 1);
    try {
      const { data: res } = await apiClient.get(`/documents/verify/${token}`);
      const payload = res?.data ?? res;
      setResult(payload);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 404) {
        // Pesan spesifik dari server: dicabut, anggota keluar, QR duplikasi, dsb.
        const msg = err?.response?.data?.message;
        const detail = Array.isArray(msg) ? msg[0] : typeof msg === 'string' ? msg : undefined;
        setResult({
          valid: false,
          message: detail || 'Dokumen atau kartu tidak ditemukan, sudah dicabut, atau tidak berlaku',
        });
      } else {
        setError('Gagal terhubung ke server verifikasi');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) verify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (loading && !result) return <VerificationSkeleton />;

  const isValid = result?.valid === true;
  const docType = result?.tipe ?? '';
  const isKta = docType === 'kartu_anggota';
  const member = result?.member;
  const status = member?.statusKeanggotaan ?? result?.status ?? '';
  const statusMeta = STATUS_LABELS[status];
  const title = isKta ? 'Kartu Anggota' : 'Dokumen';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo / Brand */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-lg mb-3">
            <Shield size={28} className="text-white" />
          </div>
          <h1 className="text-lg font-bold text-gray-900">Verifikasi Kartu &amp; Dokumen</h1>
          <p className="text-xs text-gray-500 mt-0.5">THS-THM Verification</p>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
              <ShieldAlert size={32} className="text-red-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Koneksi Error</h2>
            <p className="text-sm text-gray-500 mb-4">{error}</p>
            <button
              onClick={verify}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition shadow-lg shadow-blue-200"
            >
              <RefreshCw size={16} />
              Coba Lagi
            </button>
          </div>
        )}

        {/* Result Card */}
        {result && !error && (
          <div
            className={`bg-white rounded-3xl shadow-xl border overflow-hidden transition-all duration-500 ${
              isValid ? 'border-emerald-200' : 'border-red-200'
            }`}
          >
            {/* Status Header */}
            <div
              className={`p-6 text-center ${
                isValid
                  ? 'bg-gradient-to-br from-emerald-50 to-green-50'
                  : 'bg-gradient-to-br from-red-50 to-rose-50'
              }`}
            >
              <div
                className={`w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg ${
                  isValid
                    ? 'bg-gradient-to-br from-emerald-500 to-green-600'
                    : 'bg-gradient-to-br from-red-400 to-rose-500'
                }`}
              >
                {isValid ? (
                  <ShieldCheck size={40} className="text-white" />
                ) : (
                  <ShieldAlert size={40} className="text-white" />
                )}
              </div>
              <h2 className={`text-xl font-bold ${isValid ? 'text-emerald-800' : 'text-red-800'}`}>
                {isValid ? `${title} ASLI` : `${title} TIDAK VALID`}
              </h2>
              <p className={`text-sm mt-1 ${isValid ? 'text-emerald-600' : 'text-red-600'}`}>
                {isValid
                  ? 'Terverifikasi dan tercatat di sistem THS-THM'
                  : result.message || 'Tidak ditemukan dalam sistem THS-THM'}
              </p>
            </div>

            {/* Details */}
            {isValid && (
              <div className="p-6 space-y-4">
                {/* Verification Badge */}
                <div className="flex items-center justify-center gap-2 py-3 px-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <Fingerprint size={18} className="text-emerald-600" />
                  <span className="text-xs font-medium text-emerald-700">
                    Terverifikasi {formatDate(new Date().toISOString().slice(0, 10))}
                  </span>
                </div>

                {/* Member Identity for KTA */}
                {isKta && member && (
                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                    <div className="w-20 h-20 rounded-2xl bg-white shadow-sm overflow-hidden flex-shrink-0">
                      <img
                        src={photoUrl(member.fotoPath) ?? '/logo.svg'}
                        alt={member.namaLengkap || 'Foto anggota'}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = '/logo.svg';
                        }}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-medium text-gray-400 uppercase">Pemegang Kartu</p>
                      <p className="text-base font-bold text-gray-900 truncate">
                        {member.namaLengkap || '-'}
                      </p>
                      <p className="text-xs font-mono font-semibold text-gray-600 mt-0.5">
                        {member.nomorAnggota || result.nomorAnggota || '-'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Info Grid */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                    <div className="p-2 rounded-lg bg-white shadow-sm">
                      <FileText size={16} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-gray-400 uppercase">Jenis</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {DOCUMENT_LABELS[docType] || (isKta ? 'Kartu Tanda Anggota (KTA)' : docType)}
                      </p>
                    </div>
                  </div>

                  {member && (
                    <>
                      {statusMeta && (
                        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-white shadow-sm">
                              <User size={16} className="text-indigo-600" />
                            </div>
                            <div>
                              <p className="text-[10px] font-medium text-gray-400 uppercase">Status Keanggotaan</p>
                              <p className="text-sm font-semibold text-gray-900">{statusMeta.label}</p>
                            </div>
                          </div>
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[10px] font-semibold ${statusMeta.className}`}>
                            {statusMeta.label}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                        <div className="p-2 rounded-lg bg-white shadow-sm">
                          <MapPin size={16} className="text-teal-600" />
                        </div>
                        <div>
                          <p className="text-[10px] font-medium text-gray-400 uppercase">Ranting / Wilayah / Distrik</p>
                          <p className="text-sm font-semibold text-gray-900">
                            {[member.ranting, member.wilayah, member.distrik].filter(Boolean).join(' · ') || '-'}
                          </p>
                        </div>
                      </div>
                    </>
                  )}

                  {result.nomorDokumen && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                      <div className="p-2 rounded-lg bg-white shadow-sm">
                        <CreditCard size={16} className="text-purple-600" />
                      </div>
                      <div>
                        <p className="text-[10px] font-medium text-gray-400 uppercase">No. Seri</p>
                        <p className="text-sm font-mono font-semibold text-gray-900">{result.nomorDokumen}</p>
                      </div>
                    </div>
                  )}

                  {result.createdAt && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                      <div className="p-2 rounded-lg bg-white shadow-sm">
                        <Calendar size={16} className="text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-[10px] font-medium text-gray-400 uppercase">Tanggal Terbit</p>
                        <p className="text-sm font-medium text-gray-900">{formatDate(result.createdAt)}</p>
                      </div>
                    </div>
                  )}

                  {typeof result.scanCount === 'number' && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                      <div className="p-2 rounded-lg bg-white shadow-sm">
                        <Hash size={16} className="text-amber-600" />
                      </div>
                      <div>
                        <p className="text-[10px] font-medium text-gray-400 uppercase">Pemindaian QR</p>
                        <p className="text-sm font-medium text-gray-900">
                          {result.scanCount} kali
                          {typeof result.scanLeft === 'number' && ` · sisa ${result.scanLeft}`}
                          {result.scanCount > 3 ? ' (aktifitas tinggi — periksa keaslian fisik)' : ''}
                        </p>
                      </div>
                    </div>
                  )}

                  {result.lastScannedAt && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                      <div className="p-2 rounded-lg bg-white shadow-sm">
                        <Clock size={16} className="text-sky-600" />
                      </div>
                      <div>
                        <p className="text-[10px] font-medium text-gray-400 uppercase">Terakhir Dipindai</p>
                        <p className="text-sm font-medium text-gray-900">{formatDateTime(result.lastScannedAt)}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Peringatan bila sisa pemindaian menipis (terduga difotokopi) */}
                {typeof result.scanLeft === 'number' && result.scanLeft <= 5 && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 border border-amber-100">
                    <ShieldAlert size={18} className="text-amber-500 flex-shrink-0" />
                    <p className="text-xs text-amber-700">
                      QR ini sudah sangat sering dipindai (sisa {result.scanLeft}). Kartu berisiko terduga
                      difotokopi/digandakan dan dapat otomatis dinonaktifkan.
                    </p>
                  </div>
                )}

                {/* Security Footer */}
                <div className="pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2 justify-center text-xs text-gray-400">
                    <Shield size={12} />
                    <span>Terdaftar di sistem THS-THM — data diambil langsung dari sumber</span>
                  </div>
                </div>
              </div>
            )}

            {/* Invalid State Details */}
            {!isValid && (
              <div className="p-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-red-50">
                    <XCircle size={18} className="text-red-500 flex-shrink-0" />
                    <p className="text-sm text-red-700">
                      Kartu/dokumen dengan token ini tidak tercatat, sudah dicabut, atau tidak berlaku di sistem
                      THS-THM.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50">
                    <ShieldAlert size={18} className="text-amber-500 flex-shrink-0" />
                    <p className="text-sm text-amber-700">
                      Hati-hati terhadap pemalsuan. Hubungi admin THS-THM untuk verifikasi lebih lanjut.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Retry Button */}
            <div className="px-6 pb-6 flex justify-center">
              <button
                onClick={verify}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-xl transition"
              >
                <RefreshCw size={12} />
                Verifikasi Ulang
              </button>
            </div>
          </div>
        )}

        {/* Token Info */}
        <div className="text-center mt-4">
          <p className="text-[10px] text-gray-400">
            Token: {token?.slice(0, 16)}...{token?.slice(-8)} | Verifikasi #{attempts}
          </p>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <div className="inline-flex items-center gap-1.5 text-xs text-gray-400">
            <Building2 size={12} />
            THS-THM System - Sistem Verifikasi Kartu &amp; Dokumen
          </div>
        </div>
      </div>
    </div>
  );
}