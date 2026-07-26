'use client';

import { PermissionGuard } from '@/components/auth/permission-guard';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import { RefreshCw, FileText, Calendar, User, Tag, Send, ExternalLink, Edit3 } from 'lucide-react';
import { DetailLayout, DetailSkeleton, ErrorPage, InfoCard, InfoRow, MiniStatCard } from '@/components/crud';
import { formatDate } from '@/components/members/constants';

interface OutgoingLetterDetail {
  id: string;
  nomorSurat: string;
  tanggalSurat: string;
  tujuan: string;
  perihal: string;
  isi: string;
  status: string;
  filePath: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function OutgoingLetterDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [letter, setLetter] = useState<OutgoingLetterDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLetter = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data: res } = await apiClient.get(`/letters/outgoing/${id}`);
      setLetter(res.data);
      setError(null);
    } catch {
      setError('Gagal memuat surat keluar');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchLetter(); }, [fetchLetter]);

  if (loading) return <DetailSkeleton rows={4} />;
  if (error || !letter) return <ErrorPage message={error || 'Surat tidak ditemukan'} backHref="/letters" onRetry={fetchLetter} />;

  return (
      <PermissionGuard module="letters" action="view">
        <DetailLayout
              backHref="/letters"
              backLabel="Kembali ke Surat"
              title={letter.perihal}
              subtitle={`${letter.nomorSurat} → ${letter.tujuan}`}
              headerRight={
                <div className="flex items-center gap-2">
                  <Link
                    href={`/letters/outgoing/${id}/edit`}
                    className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                  >
                    <Edit3 size={14} /> Edit
                  </Link>
                  <button onClick={fetchLetter} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-400" title="Refresh">
                    <RefreshCw size={16} />
                  </button>
                </div>
              }
            >
              {/* Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <MiniStatCard label="Status" value={letter.status} icon={<Tag size={18} />} color="blue" />
                <MiniStatCard label="Tanggal Surat" value={formatDate(letter.tanggalSurat)} icon={<Calendar size={18} />} color="green" />
                <MiniStatCard label="Tujuan" value={letter.tujuan} icon={<Send size={18} />} color="purple" />
              </div>
        
              {/* Detail */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <InfoCard title="Informasi Surat" icon={<FileText size={18} className="text-blue-500" />}>
                  <InfoRow icon={<FileText size={16} />} label="Nomor Surat" value={letter.nomorSurat} />
                  <InfoRow icon={<Calendar size={16} />} label="Tanggal Surat" value={formatDate(letter.tanggalSurat)} />
                  <InfoRow icon={<User size={16} />} label="Tujuan" value={letter.tujuan} />
                  <InfoRow icon={<Tag size={16} />} label="Status" value={letter.status} />
                </InfoCard>
        
                <InfoCard title="Isi Surat" icon={<FileText size={18} className="text-blue-500" />}>
                  <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl whitespace-pre-wrap text-sm text-gray-900 dark:text-white leading-relaxed">
                    {letter.isi || <span className="text-gray-400 italic">Tidak ada isi surat</span>}
                  </div>
                </InfoCard>
              </div>
        
              {/* File attachment */}
              {letter.filePath && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Lampiran</h3>
                  <a href={`/api/uploads/${letter.filePath}`} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 rounded-lg text-sm hover:bg-blue-100 dark:hover:bg-blue-900 transition">
                    <ExternalLink size={16} /> Lihat Lampiran
                  </a>
                </div>
              )}
            </DetailLayout>
      </PermissionGuard>
    );
}
