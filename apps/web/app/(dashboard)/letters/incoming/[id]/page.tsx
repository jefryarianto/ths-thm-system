'use client';

import { PermissionGuard } from '@/components/auth/permission-guard';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import { RefreshCw, FileText, Calendar, User, Tag, ArrowRight, ExternalLink, Edit3 } from 'lucide-react';
import { DetailLayout, DetailSkeleton, ErrorPage, InfoCard, InfoRow, MiniStatCard } from '@/components/crud';
import { formatDate } from '@/components/members/constants';

interface IncomingLetterDetail {
  id: string;
  nomorSurat: string;
  tanggalSurat: string;
  tanggalTerima: string;
  pengirim: string;
  perihal: string;
  status: string;
  fileScanPath: string | null;
  disposisi: Array<{
    id: string;
    dariUserId: string;
    kepadaUserId: string;
    isi: string;
    dibaca: boolean;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export default function IncomingLetterDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [letter, setLetter] = useState<IncomingLetterDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLetter = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data: res } = await apiClient.get(`/letters/incoming/${id}`);
      setLetter(res.data);
      setError(null);
    } catch {
      setError('Gagal memuat surat masuk');
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
              subtitle={`${letter.nomorSurat} - ${letter.pengirim}`}
              headerRight={
                <div className="flex items-center gap-2">
                  <Link
                    href={`/letters/incoming/${id}/edit`}
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
                <MiniStatCard label="Tanggal Terima" value={formatDate(letter.tanggalTerima)} icon={<Calendar size={18} />} color="green" />
                <MiniStatCard label="Disposisi" value={letter.disposisi.length} icon={<ArrowRight size={18} />} color="purple" />
              </div>
        
              {/* Detail */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <InfoCard title="Informasi Surat" icon={<FileText size={18} className="text-blue-500" />}>
                  <InfoRow icon={<FileText size={16} />} label="Nomor Surat" value={letter.nomorSurat} />
                  <InfoRow icon={<Calendar size={16} />} label="Tanggal Surat" value={formatDate(letter.tanggalSurat)} />
                  <InfoRow icon={<Calendar size={16} />} label="Tanggal Terima" value={formatDate(letter.tanggalTerima)} />
                  <InfoRow icon={<User size={16} />} label="Pengirim" value={letter.pengirim} />
                  <InfoRow icon={<Tag size={16} />} label="Status" value={letter.status} />
                  <InfoRow icon={<FileText size={16} />} label="Perihal" value={letter.perihal} />
                </InfoCard>
        
                <InfoCard title="Disposisi" icon={<ArrowRight size={18} className="text-blue-500" />}>
                  {letter.disposisi.length > 0 ? (
                    <div className="space-y-3">
                      {letter.disposisi.map((d) => (
                        <div key={d.id} className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-gray-500">Disposisi</p>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${d.dibaca ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                              {d.dibaca ? 'Dibaca' : 'Belum'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-900 dark:text-white mt-1">{d.isi}</p>
                          <p className="text-xs text-gray-400 mt-1">{formatDate(d.createdAt)}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic text-center py-6">Belum ada disposisi</p>
                  )}
                </InfoCard>
              </div>
        
              {/* File attachment */}
              {letter.fileScanPath && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Lampiran</h3>
                  <a href={`/api/uploads/${letter.fileScanPath}`} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 rounded-lg text-sm hover:bg-blue-100 dark:hover:bg-blue-900 transition">
                    <ExternalLink size={16} /> Lihat File Scan
                  </a>
                </div>
              )}
            </DetailLayout>
      </PermissionGuard>
    );
}
