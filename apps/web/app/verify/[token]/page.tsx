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
} from 'lucide-react';

interface VerificationResult {
  valid: boolean;
  document?: {
    id: string;
    jenis: string;
    namaDokumen?: string;
    status: string;
    createdAt: string;
    anggota?: {
      id: string;
      namaLengkap: string;
      nomorAnggota: string;
    };
  };
  message?: string;
}

const DOCUMENT_LABELS: Record<string, string> = {
  kta: 'Kartu Tanda Anggota (KTA)',
  sertifikat: 'Sertifikat',
  spg: 'Surat Penetapan Golongan (SPG)',
  lainnya: 'Dokumen Lainnya',
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
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
      setResult(res.data || res);
    } catch (err: any) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const status = (err as any)?.response?.status;
      if (status === 404) {
        setResult({ valid: false, message: 'Dokumen tidak ditemukan atau token tidak valid' });
      } else {
        setError('Gagal terhubung ke server verifikasi');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) verify();
  }, [token]);

  if (loading && !result) return <VerificationSkeleton />;

  const isValid = result?.valid === true;
  const doc = result?.document;
  const member = doc?.anggota;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo / Brand */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-lg mb-3">
            <Shield size={28} className="text-white" />
          </div>
          <h1 className="text-lg font-bold text-gray-900">Verifikasi Dokumen</h1>
          <p className="text-xs text-gray-500 mt-0.5">THS-THM Document Verification</p>
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
                {isValid ? 'Dokumen ASLI' : 'Dokumen TIDAK VALID'}
              </h2>
              <p className={`text-sm mt-1 ${isValid ? 'text-emerald-600' : 'text-red-600'}`}>
                {isValid
                  ? 'Dokumen ini telah terverifikasi dan tercatat di sistem THS-THM'
                  : result.message || 'Dokumen tidak ditemukan dalam sistem THS-THM'}
              </p>
            </div>

            {/* Document Details */}
            {isValid && doc && (
              <div className="p-6 space-y-4">
                {/* Verification Badge */}
                <div className="flex items-center justify-center gap-2 py-3 px-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <Fingerprint size={18} className="text-emerald-600" />
                  <span className="text-xs font-medium text-emerald-700">
                    Terverifikasi — {formatDate(new Date().toISOString())}
                  </span>
                </div>

                {/* Info Grid */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                    <div className="p-2 rounded-lg bg-white shadow-sm">
                      <FileText size={16} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-gray-400 uppercase">
                        Jenis Dokumen
                      </p>
                      <p className="text-sm font-semibold text-gray-900">
                        {DOCUMENT_LABELS[doc.jenis] || doc.jenis}
                      </p>
                    </div>
                  </div>

                  {doc.namaDokumen && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                      <div className="p-2 rounded-lg bg-white shadow-sm">
                        <Hash size={16} className="text-purple-600" />
                      </div>
                      <div>
                        <p className="text-[10px] font-medium text-gray-400 uppercase">
                          Nama Dokumen
                        </p>
                        <p className="text-sm font-medium text-gray-900">{doc.namaDokumen}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                    <div className="p-2 rounded-lg bg-white shadow-sm">
                      <User size={16} className="text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-gray-400 uppercase">Pemilik</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {member?.namaLengkap || '-'}
                      </p>
                    </div>
                  </div>

                  {member?.nomorAnggota && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                      <div className="p-2 rounded-lg bg-white shadow-sm">
                        <Hash size={16} className="text-amber-600" />
                      </div>
                      <div>
                        <p className="text-[10px] font-medium text-gray-400 uppercase">
                          No. Anggota
                        </p>
                        <p className="text-sm font-mono font-semibold text-gray-900">
                          {member.nomorAnggota}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                    <div className="p-2 rounded-lg bg-white shadow-sm">
                      <Calendar size={16} className="text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-gray-400 uppercase">
                        Tanggal Terbit
                      </p>
                      <p className="text-sm font-medium text-gray-900">
                        {formatDate(doc.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Security Footer */}
                <div className="pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2 justify-center text-xs text-gray-400">
                    <Shield size={12} />
                    <span>Ditandatangani secara digital oleh sistem THS-THM</span>
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
                      Dokumen dengan token ini tidak tercatat dalam database sistem THS-THM.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50">
                    <ShieldAlert size={18} className="text-amber-500 flex-shrink-0" />
                    <p className="text-sm text-amber-700">
                      Hati-hati terhadap pemalsuan dokumen. Hubungi admin THS-THM untuk verifikasi
                      lebih lanjut.
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
            THS-THM System — Sistem Verifikasi Dokumen
          </div>
        </div>
      </div>
    </div>
  );
}
