'use client';

import { PermissionGuard } from '@/components/auth/permission-guard';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import { ArrowLeft, FileText, BadgeCheck, ExternalLink, User, Calendar } from 'lucide-react';

import Breadcrumbs from '@/components/ui/breadcrumbs';

interface DocumentDetail {
  id: string;
  tipe: string;
  nomorDokumen: string;
  status: string;
  verificationUrl?: string | null;
  filePath?: string | null;
  anggota?: {
    id: string;
    namaLengkap: string;
    nomorAnggota: string;
    email?: string | null;
    noHp?: string | null;
  };
  qrValidation?: { token: string; isValid: boolean } | null;
  createdAt: string;
  updatedAt?: string;
}

const DOKUMEN_TIPE_LABEL: Record<string, string> = {
  kartu_anggota: 'Kartu Anggota (KTA)',
  sertifikat_pendadaran: 'Sertifikat Pendadaran',
  sertifikat_pelatihan: 'Sertifikat Pelatihan',
  piagam_prestasi: 'Piagam Prestasi',
};

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

function formatDateTime(dateStr?: string) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function docVerificationToken(verificationUrl?: string | null): string | null {
  if (!verificationUrl) return null;
  const m = verificationUrl.match(/\/verify\/([^/?#]+)/);
  return m ? m[1] : null;
}

export default function DocumentDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    apiClient.get(`/documents/${id}`).then(({ data }) => {
      setDoc(data.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-8 text-sm text-gray-500">Memuat...</div>;
  if (!doc) return <div className="p-8 text-sm text-red-500">Dokumen tidak ditemukan</div>;

  const statusMeta = DOKUMEN_STATUS_META[doc.status] || { label: doc.status, className: '' };
  const verifyToken = docVerificationToken(doc.verificationUrl) || doc.qrValidation?.token || null;

  return (
    <PermissionGuard module="documents" action="view">
      <Breadcrumbs suffix={{ href: '#', label: doc?.nomorDokumen || 'Detail' }} />
      <div className="max-w-2xl mx-auto space-y-6">
        <Link href="/documents" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition">
          <ArrowLeft size={16} /> Kembali ke Dokumen
        </Link>

        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950">
              <FileText size={26} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-semibold font-mono">{doc.nomorDokumen}</h1>
              <p className="text-sm text-gray-500">{DOKUMEN_TIPE_LABEL[doc.tipe] || doc.tipe}</p>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusMeta.className || 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>
              {statusMeta.label}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Tanggal Dibuat</span>
              <p className="font-medium flex items-center gap-1.5 mt-0.5">
                <Calendar size={14} className="text-gray-400" />
                {formatDateTime(doc.createdAt)}
              </p>
            </div>
            <div>
              <span className="text-gray-500">Terakhir Diperbarui</span>
              <p className="font-medium flex items-center gap-1.5 mt-0.5">
                <Calendar size={14} className="text-gray-400" />
                {formatDateTime(doc.updatedAt)}
              </p>
            </div>

            {doc.anggota && (
              <>
                <div className="sm:col-span-2 border-t border-gray-100 dark:border-gray-700 pt-4">
                  <span className="text-gray-500 flex items-center gap-1.5">
                    <User size={14} /> Anggota
                  </span>
                  <p className="font-medium mt-0.5">{doc.anggota.namaLengkap}</p>
                  <p className="text-xs text-gray-500 font-mono mt-0.5">No. Anggota: {doc.anggota.nomorAnggota}</p>
                </div>
                {(doc.anggota.email || doc.anggota.noHp) && (
                  <div className="sm:col-span-2 text-xs text-gray-500">
                    {doc.anggota.email && <span>{doc.anggota.email}</span>}
                    {doc.anggota.email && doc.anggota.noHp && <span className="mx-1.5">·</span>}
                    {doc.anggota.noHp && <span>{doc.anggota.noHp}</span>}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Aksi / Verifikasi */}
        <div className="flex flex-wrap gap-3">
          {verifyToken && (
            <Link
              href={`/verify/${verifyToken}`}
              target="_blank"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
            >
              <BadgeCheck size={16} />
              Buka Halaman Verifikasi
            </Link>
          )}
          {doc.anggota && (
            <Link
              href={`/members/${doc.anggota.id}`}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              <ExternalLink size={16} />
              Lihat Profil Anggota
            </Link>
          )}
        </div>
      </div>
    </PermissionGuard>
  );
}
