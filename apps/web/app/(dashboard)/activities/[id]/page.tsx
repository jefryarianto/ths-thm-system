'use client';

import { PermissionGuard } from '@/components/auth/permission-guard';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import Breadcrumbs from '@/components/ui/breadcrumbs';
import {

  ArrowLeft, Calendar, MapPin, User, Users, FileText,
  RefreshCw, AlertCircle, Edit, Trash2, Tag,
} from 'lucide-react';
import ConfirmModal from '@/components/ui/confirm-modal';
import { useToast } from '@/components/ui/toast';
import { ACTIVITY_STATUS_COLORS } from '@/components/activities/constants';

interface ActivityDetail {
  id: string;
  nama: string;
  tipe: string;
  lokasi: string | null;
  tanggalMulai: string;
  tanggalSelesai: string | null;
  status: string;
  scopeType: string;
  scopeId: string | null;
  createdBy: string;
  creator?: { id: string; namaLengkap: string };
  peserta: Array<{
    id: string;
    anggota: { id: string; nomorAnggota: string; namaLengkap: string };
  }>;
  dokumenKegiatan: Array<{
    id: string;
    nama: string;
    tipe: string;
    createdAt: string;
  }>;
  createdAt: string;
}

function DetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-36" />
      <div className="bg-white dark:bg-gray-800 rounded-2xl border p-6">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-64 mb-4" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48" />
      </div>
    </div>
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('id-ID', {
    hour: '2-digit', minute: '2-digit',
  });
}

export default function ActivityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { toast } = useToast();

  const [activity, setActivity] = useState<ActivityDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const fetchActivity = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data: res } = await apiClient.get(`/activities/${id}`);
      setActivity(res.data);
      setError(null);
    } catch (err: unknown) {
      if ((err as { response?: { status?: number } })?.response?.status === 404) setError('Kegiatan tidak ditemukan');
      else setError('Gagal memuat data kegiatan');
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchActivity(); }, [fetchActivity]);

  const handleDelete = async () => {
    try {
      await apiClient.delete(`/activities/${id}`);
      toast('success', 'Kegiatan berhasil dihapus');
      router.push('/activities');
    } catch {
      toast('error', 'Gagal menghapus kegiatan');
      setShowDeleteModal(false);
    }
  };

  if (loading) return <DetailSkeleton />;

  if (error || !activity) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center max-w-md">
          <AlertCircle size={40} className="mx-auto text-red-400 mb-3" />
          <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
            {error === 'Kegiatan tidak ditemukan' ? 'Tidak Ditemukan' : 'Gagal Memuat'}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{error || 'Kegiatan tidak ditemukan'}</p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/activities" className="px-4 py-2 border rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
              ← Kembali
            </Link>
            <button onClick={fetchActivity} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition">
              Coba Lagi
            </button>
          </div>
        </div>
      </div>
    );
  }

  const dateDisplay = activity.tanggalSelesai
    ? `${formatDate(activity.tanggalMulai)} — ${formatDate(activity.tanggalSelesai)}`
    : formatDate(activity.tanggalMulai);

  const timeDisplay = activity.tanggalSelesai
    ? `${formatTime(activity.tanggalMulai)} — ${formatTime(activity.tanggalSelesai)}`
    : formatTime(activity.tanggalMulai);

  return (
      <PermissionGuard module="activities" action="view">
        <Breadcrumbs suffix={{ href: '#', label: activity?.nama || 'Detail' }} />
        <div className="space-y-6">
              {/* Back */}
              <Link href="/activities" className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition group">
                <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
                Kembali ke Kegiatan
              </Link>
        
              {/* Header */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="h-16 bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 relative">
                  <button onClick={fetchActivity} className="absolute top-3 right-3 p-2 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-sm transition text-white" title="Refresh">
                    <RefreshCw size={14} />
                  </button>
                </div>
                <div className="px-6 pb-6 -mt-6">
                  <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white dark:bg-gray-800 flex items-center justify-center shadow-lg ring-4 ring-white dark:ring-gray-800">
                      <Calendar size={20} className="text-blue-600" />
                    </div>
                    <div className="flex-1 mt-2 sm:mt-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white">{activity.nama}</h1>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ACTIVITY_STATUS_COLORS[activity.status] || ''}`}>
                          {activity.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{dateDisplay} • {timeDisplay}</p>
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-4 sm:mt-0">
                      <Link
                        href={`/activities/${activity.id}/edit`}
                        className="flex items-center gap-1.5 px-3 py-2 border border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-400 rounded-lg text-xs font-medium hover:bg-blue-50 dark:hover:bg-blue-950 transition"
                      >
                        <Edit size={14} /> Edit
                      </Link>
                      <button
                        onClick={() => setShowDeleteModal(true)}
                        className="flex items-center gap-1.5 px-3 py-2 border border-red-300 dark:border-red-600 text-red-700 dark:text-red-400 rounded-lg text-xs font-medium hover:bg-red-50 dark:hover:bg-red-950 transition"
                      >
                        <Trash2 size={14} /> Hapus
                      </button>
                    </div>
                  </div>
                </div>
              </div>
        
              {/* Info Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Info */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                    <Tag size={18} className="text-blue-500" /> Detail Kegiatan
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                      <Calendar size={16} className="text-gray-400 dark:text-gray-500 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Tanggal</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{formatDate(activity.tanggalMulai)}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">{formatTime(activity.tanggalMulai)}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                      <Tag size={16} className="text-gray-400 dark:text-gray-500 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Tipe</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">{activity.tipe}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                      <MapPin size={16} className="text-gray-400 dark:text-gray-500 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Lokasi</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{activity.lokasi || '-'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                      <User size={16} className="text-gray-400 dark:text-gray-500 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Dibuat Oleh</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{activity.creator?.namaLengkap || '-'}</p>
                      </div>
                    </div>
                  </div>
                </div>
        
                {/* Participants */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <Users size={18} className="text-blue-500" /> Peserta ({activity.peserta.length})
                    </h3>
                  </div>
                  {activity.peserta.length > 0 ? (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {activity.peserta.map((p) => (
                        <div key={p.id} className="flex items-center justify-between px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{p.anggota.namaLengkap}</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">{p.anggota.nomorAnggota}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Users size={32} className="mx-auto text-gray-300 mb-2" />
                      <p className="text-sm text-gray-400 dark:text-gray-500">Belum ada peserta</p>
                    </div>
                  )}
                </div>
              </div>
        
              {/* Documents */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                  <FileText size={18} className="text-blue-500" /> Dokumen ({activity.dokumenKegiatan.length})
                </h3>
                {activity.dokumenKegiatan.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-gray-700">
                          <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Nama</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-500 hidden sm:table-cell">Tipe</th>
                          <th className="text-left px-4 py-3 font-medium text-gray-500 hidden md:table-cell">Tanggal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {activity.dokumenKegiatan.map((doc) => (
                          <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition">
                            <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{doc.nama}</td>
                            <td className="px-4 py-3 hidden sm:table-cell text-gray-500 dark:text-gray-400">{doc.tipe}</td>
                            <td className="px-4 py-3 hidden md:table-cell text-xs text-gray-400 dark:text-gray-500">{formatDate(doc.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText size={32} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-sm text-gray-400 dark:text-gray-500">Belum ada dokumen</p>
                  </div>
                )}
              </div>
        
              {/* Delete Modal */}
              <ConfirmModal
                open={showDeleteModal}
                title="Hapus Kegiatan"
                message={`Apakah Anda yakin ingin menghapus "${activity.nama}"?`}
                confirmLabel="Ya, Hapus"
                cancelLabel="Batal"
                variant="danger"
                onConfirm={handleDelete}
                onCancel={() => setShowDeleteModal(false)}
              />
            </div>
      </PermissionGuard>
    );
}
