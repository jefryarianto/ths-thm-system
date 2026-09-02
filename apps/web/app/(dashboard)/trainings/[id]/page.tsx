'use client';

import { PermissionGuard } from '@/components/auth/permission-guard';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import Breadcrumbs from '@/components/ui/breadcrumbs';
import {

  ArrowLeft,
  Calendar,
  MapPin,
  User,
  BookOpen,
  Users,
  ClipboardCheck,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Star,
  TrendingUp,
  FileText,
  Dumbbell,
  Edit,
} from 'lucide-react';
import StatCard from '@/components/cards/stat-card';
import {
  MATERI_LABELS,
  formatDate,
  formatTime,
  InfoRow,
  DetailSkeleton,
} from '@/components/trainings/constants';
import { KATEGORI_MATERI_OPTIONS } from '@/components/trainings/materi-select';

// ─── Types ───

interface MateriLatihan {
  id: string;
  kategori: string;
  detail: string;
}

interface TrainingDetail {
  id: string;
  hariTanggal: string;
  lokasi: string | null;
  jenisMateri: string | null;
  hasilLatihanGlobal: string | null;
  rekomendasiLatihanBerikutnya: string | null;
  materi?: MateriLatihan[];
  rantingId: string;
  pelatihId: string | null;
  ranting?: { id: string; nama: string; kodeRanting: string; lokasiLatihan: string | null };
  pelatih?: { id: string; namaLengkap: string } | null;
  absensi: AttendanceItem[];
  evaluasi: EvaluationItem[];
  createdAt: string;
  updatedAt: string;
}

interface AttendanceItem {
  id: string;
  anggotaId: string;
  hadir: boolean;
  catatan: string | null;
  anggota?: { id: string; nomorAnggota: string; namaLengkap: string };
  createdAt: string;
}

interface EvaluationItem {
  id: string;
  anggotaId: string;
  nilai: number | null;
  catatan: string | null;
  anggota?: { id: string; nomorAnggota: string; namaLengkap: string };
  createdAt: string;
}

// ─── Page ───

export default function TrainingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [training, setTraining] = useState<TrainingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'attendance' | 'evaluations'>('info');

  const fetchTraining = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data: res } = await apiClient.get(`/trainings/${id}`);
      setTraining(res.data);
      setError(null);
    } catch {
      setError('Gagal memuat data latihan');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTraining();
  }, [fetchTraining]);

  if (loading) return <DetailSkeleton />;

  if (error || !training) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <AlertCircle size={40} className="mx-auto text-red-400 mb-3" />
          <p className="text-red-600 font-medium">{error || 'Latihan tidak ditemukan'}</p>
          <button
            onClick={() => router.push('/trainings')}
            className="mt-3 text-sm text-blue-600 hover:underline"
          >
            ← Kembali ke Latihan
          </button>
        </div>
      </div>
    );
  }

  const hadirCount = training.absensi.filter((a) => a.hadir).length;
  const totalCount = training.absensi.length;
  const attendanceRate = totalCount > 0 ? Math.round((hadirCount / totalCount) * 100) : 0;

  return (
      <PermissionGuard module="trainings" action="view">
        <Breadcrumbs suffix={{ href: '#', label: training ? (MATERI_LABELS[training.jenisMateri || ''] || training.jenisMateri || (training.materi && training.materi.length > 0 ? training.materi.map((m) => MATERI_LABELS[m.kategori] || m.kategori).join(', ') : null) || 'Detail') : 'Detail' }} />
        <div className="space-y-6">
              {/* Back */}
              <Link
                href="/trainings"
                className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition group"
              >
                <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
                Kembali ke Latihan
              </Link>
        
              {/* Header */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center shadow-lg">
                      <Dumbbell size={24} className="text-white" />
                    </div>
                    <div>
                      <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                        {MATERI_LABELS[training.jenisMateri || ''] ||
                          training.jenisMateri ||
                          (training.materi && training.materi.length > 0
                            ? training.materi.map((m) => MATERI_LABELS[m.kategori] || m.kategori).join(', ')
                            : null) ||
                          'Latihan'}
                      </h1>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {formatDate(training.hariTanggal)} - {formatTime(training.hariTanggal)}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400">
                          {training.ranting?.nama || '-'}
                        </span>
                        {training.pelatih && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400">
                            {training.pelatih.namaLengkap}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Link
                      href={`/trainings/${id}/edit`}
                      title="Edit"
                      aria-label="Edit"
                      className="p-2 rounded-lg border border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 transition"
                    >
                      <Edit size={15} />
                    </Link>
                    <button
                      onClick={fetchTraining}
                      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-400"
                      title="Refresh"
                      aria-label="Refresh"
                    >
                      <RefreshCw size={15} />
                    </button>
                  </div>
                </div>
              </div>
        
              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard
                  label="Hadir"
                  value={hadirCount}
                  icon={<CheckCircle2 size={18} />}
                  color="green"
                  variant="mini"
                />
                <StatCard
                  label="Tidak Hadir"
                  value={totalCount - hadirCount}
                  icon={<XCircle size={18} />}
                  color="red"
                  variant="mini"
                />
                <StatCard
                  label="Total Absensi"
                  value={totalCount}
                  icon={<Users size={18} />}
                  color="blue"
                  variant="mini"
                />
                <StatCard
                  label="Kehadiran"
                  value={`${attendanceRate}%`}
                  icon={<TrendingUp size={18} />}
                  color="purple"
                  variant="mini"
                />
              </div>
        
              {/* Tabs */}
              <div className="border-b border-gray-200 dark:border-gray-700">
                <div className="flex gap-6">
                  {[
                    { key: 'info', label: 'Informasi Latihan', icon: BookOpen },
                    { key: 'attendance', label: `Absensi (${totalCount})`, icon: ClipboardCheck },
                    { key: 'evaluations', label: `Evaluasi (${training.evaluasi.length})`, icon: Star },
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
                            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                      >
                        <Icon size={16} /> {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>
        
              {/* Tab: Info */}
              {activeTab === 'info' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                      <BookOpen size={18} className="text-blue-500" />
                      Detail Latihan
                    </h3>
                    <div className="space-y-2">
                      <InfoRow
                        icon={Calendar}
                        label="Hari & Tanggal"
                        value={`${formatDate(training.hariTanggal)} ? ${formatTime(training.hariTanggal)}`}
                      />
                      <InfoRow
                        icon={MapPin}
                        label="Lokasi"
                        value={training.lokasi || training.ranting?.lokasiLatihan}
                      />
                      <InfoRow
                        icon={BookOpen}
                        label="Jenis Materi"
                        value={MATERI_LABELS[training.jenisMateri || ''] || training.jenisMateri || null}
                      />
                      {training.materi && training.materi.length > 0 && (
                        <div className="pt-2">
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                            Materi Latihan
                          </p>
                          <div className="space-y-2">
                            {training.materi.map((m) => {
                              const kategoriInfo = KATEGORI_MATERI_OPTIONS.find((o) => o.value === m.kategori);
                              return (
                                <div
                                  key={m.id}
                                  className="bg-gray-50 dark:bg-gray-800/50 rounded-lg px-3 py-2 border border-gray-100 dark:border-gray-700"
                                >
                                  <div className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                                    <span>{kategoriInfo?.icon}</span>
                                    <span>{MATERI_LABELS[m.kategori] || m.kategori}</span>
                                  </div>
                                  {m.detail && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 pl-5">
                                      {m.detail}
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      <InfoRow icon={User} label="Pelatih" value={training.pelatih?.namaLengkap || null} />
                      <InfoRow icon={Users} label="Ranting" value={training.ranting?.nama || null} />
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                      <FileText size={18} className="text-blue-500" />
                      Catatan Latihan
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                          Hasil Latihan
                        </p>
                        <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800/50 rounded-xl px-4 py-3">
                          {training.hasilLatihanGlobal || (
                            <span className="text-gray-400 italic">Belum ada catatan hasil latihan</span>
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                          Rekomendasi
                        </p>
                        <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800/50 rounded-xl px-4 py-3">
                          {training.rekomendasiLatihanBerikutnya || (
                            <span className="text-gray-400 italic">Belum ada rekomendasi</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
        
              {/* Tab: Attendance */}
              {activeTab === 'attendance' && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Daftar Absensi</h3>
                    <span className="text-xs text-gray-400">
                      {hadirCount}/{totalCount} hadir
                    </span>
                  </div>
                  {totalCount > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                            <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400">
                              Anggota
                            </th>
                            <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400">
                              No. Anggota
                            </th>
                            <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400">
                              Status
                            </th>
                            <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400 hidden md:table-cell">
                              Catatan
                            </th>
                            <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400 hidden sm:table-cell">
                              Waktu
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                          {training.absensi.map((att) => (
                            <tr
                              key={att.id}
                              className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition"
                            >
                              <td className="px-5 py-3 font-medium text-gray-900 dark:text-white">
                                {att.anggota?.namaLengkap || '-'}
                              </td>
                              <td className="px-5 py-3 font-mono text-xs text-gray-500">
                                {att.anggota?.nomorAnggota || '-'}
                              </td>
                              <td className="px-5 py-3">
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                    att.hadir
                                      ? 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400'
                                      : 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400'
                                  }`}
                                >
                                  {att.hadir ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                                  {att.hadir ? 'Hadir' : 'Tidak Hadir'}
                                </span>
                              </td>
                              <td className="px-5 py-3 hidden md:table-cell text-gray-500 dark:text-gray-400 text-xs">
                                {att.catatan || '-'}
                              </td>
                              <td className="px-5 py-3 hidden sm:table-cell text-xs text-gray-400">
                                {formatTime(att.createdAt)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-10">
                      <ClipboardCheck size={36} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">Belum ada data absensi</p>
                    </div>
                  )}
                </div>
              )}
        
              {/* Tab: Evaluations */}
              {activeTab === 'evaluations' && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Hasil Evaluasi</h3>
                  </div>
                  {training.evaluasi.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                            <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400">
                              Anggota
                            </th>
                            <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400">
                              No. Anggota
                            </th>
                            <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400">
                              Nilai
                            </th>
                            <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400 hidden md:table-cell">
                              Catatan
                            </th>
                            <th className="text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400 hidden sm:table-cell">
                              Tanggal
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                          {training.evaluasi.map((evalItem) => (
                            <tr
                              key={evalItem.id}
                              className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition"
                            >
                              <td className="px-5 py-3 font-medium text-gray-900 dark:text-white">
                                {evalItem.anggota?.namaLengkap || '-'}
                              </td>
                              <td className="px-5 py-3 font-mono text-xs text-gray-500">
                                {evalItem.anggota?.nomorAnggota || '-'}
                              </td>
                              <td className="px-5 py-3">
                                {evalItem.nilai != null ? (
                                  <span
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                      evalItem.nilai >= 80
                                        ? 'bg-green-100 dark:bg-green-950 text-green-700'
                                        : evalItem.nilai >= 60
                                          ? 'bg-yellow-100 dark:bg-yellow-950 text-yellow-700'
                                          : 'bg-red-100 dark:bg-red-950 text-red-700'
                                    }`}
                                  >
                                    <Star size={12} />
                                    {evalItem.nilai}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="px-5 py-3 hidden md:table-cell text-gray-500 dark:text-gray-400 text-xs">
                                {evalItem.catatan || '-'}
                              </td>
                              <td className="px-5 py-3 hidden sm:table-cell text-xs text-gray-400">
                                {new Date(evalItem.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-10">
                      <Star size={36} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">Belum ada data evaluasi</p>
                    </div>
                  )}
                </div>
              )}
            </div>
      </PermissionGuard>
    );
}
