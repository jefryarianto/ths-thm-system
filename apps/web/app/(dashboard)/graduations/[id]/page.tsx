'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  GraduationCap,
  Award,
  XCircle,
  AlertCircle,
  RefreshCw,
  Clock,
  Star,
} from 'lucide-react';
import Modal from '@/components/ui/modal';
import StatCard from '@/components/cards/stat-card';
import {
  STATUS_STYLES,
  STATUS_LABELS,
  formatDate,
  formatShort,
  DetailSkeleton,
} from '@/components/graduations/constants';

// ─── Types ───

interface GraduationDetail {
  id: string;
  nama: string;
  lokasi: string | null;
  tanggalMulai: string;
  tanggalSelesai: string | null;
  status: string;
  tipe: string;
  scopeType: string;
  scopeId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Participant {
  id: string;
  namaLengkap: string;
  jenisKelamin: 'L' | 'P';
  noHp: string | null;
  email: string | null;
  status: string;
  ranting?: { id: string; nama: string };
}

// ─── Page ───

export default function GraduationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [graduation, setGraduation] = useState<GraduationDetail | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showGraduateModal, setShowGraduateModal] = useState(false);
  const [graduateResults, setGraduateResults] = useState<
    Record<string, { lulus: boolean; totalSkor?: number }>
  >({});

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [gradRes, partRes] = await Promise.all([
        apiClient.get(`/graduations/${id}`),
        apiClient.get(`/graduations/${id}/participants`),
      ]);
      setGraduation(gradRes.data.data);
      const parts = partRes.data.data || [];
      setParticipants(parts);
      setError(null);
    } catch {
      setError('Gagal memuat data pendadaran');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleGraduate = async () => {
    if (!graduation) return;
    const results = participants
      .filter((p) => graduateResults[p.id]?.lulus !== undefined)
      .map((p) => ({
        candidateId: p.id,
        lulus: graduateResults[p.id].lulus,
        totalSkor: graduateResults[p.id].totalSkor || 0,
        ranking: 0,
      }));

    if (results.length === 0) return;

    try {
      await apiClient.post(`/graduations/${graduation.id}/graduate`, { results });
      await fetchData();
      setShowGraduateModal(false);
      setGraduateResults({});
    } catch {
      /* ignore */
    }
  };

  if (loading) return <DetailSkeleton />;

  if (error || !graduation) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <AlertCircle size={40} className="mx-auto text-red-400 mb-3" />
          <p className="text-red-600 font-medium">{error || 'Pendadaran tidak ditemukan'}</p>
          <button
            onClick={() => router.push('/graduations')}
            className="mt-3 text-sm text-blue-600 hover:underline"
          >
            ← Kembali
          </button>
        </div>
      </div>
    );
  }

  const dateRange = graduation.tanggalSelesai
    ? `${formatShort(graduation.tanggalMulai)} — ${formatShort(graduation.tanggalSelesai)}`
    : formatDate(graduation.tanggalMulai);

  const participatingCount = participants.filter((p) => p.status === 'mengikuti_pendadaran').length;
  const lulusCount = participants.filter((p) => p.status === 'lulus').length;
  const gagalCount = participants.filter((p) => p.status === 'gagal').length;

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link
        href="/graduations"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition group"
      >
        <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
        Kembali ke Pendadaran
      </Link>

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
              <GraduationCap size={24} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  {graduation.nama}
                </h1>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[graduation.status] || ''}`}
                >
                  {STATUS_LABELS[graduation.status] || graduation.status}
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{dateRange}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {graduation.lokasi || 'Lokasi belum ditentukan'}
              </p>
            </div>
          </div>
          <button
            onClick={fetchData}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-400"
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Peserta Aktif"
          value={participatingCount}
          icon={<Users size={18} />}
          color="blue"
          variant="mini"
        />
        <StatCard
          label="Lulus"
          value={lulusCount}
          icon={<Award size={18} />}
          color="green"
          variant="mini"
        />
        <StatCard
          label="Gagal"
          value={gagalCount}
          icon={<XCircle size={18} />}
          color="red"
          variant="mini"
        />
        <StatCard
          label="Total Calon"
          value={participants.length}
          icon={<Calendar size={18} />}
          color="purple"
          variant="mini"
        />
      </div>

      {/* Detail Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
            <GraduationCap size={18} className="text-emerald-500" />
            Detail Pendadaran
          </h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
              <Calendar size={16} className="text-gray-400" />
              <div>
                <p className="text-xs text-gray-500 uppercase">Tanggal</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{dateRange}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
              <MapPin size={16} className="text-gray-400" />
              <div>
                <p className="text-xs text-gray-500 uppercase">Lokasi</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {graduation.lokasi || 'Belum ditentukan'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
              <Award size={16} className="text-gray-400" />
              <div>
                <p className="text-xs text-gray-500 uppercase">Tipe</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                  {graduation.tipe}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
              <Clock size={16} className="text-gray-400" />
              <div>
                <p className="text-xs text-gray-500 uppercase">Dibuat</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {formatDate(graduation.createdAt)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Participants */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Users size={18} className="text-emerald-500" />
              Daftar Peserta ({participants.length})
            </h3>
            {graduation.status === 'published' && (
              <button
                onClick={() => setShowGraduateModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition"
              >
                <Award size={14} /> Input Hasil
              </button>
            )}
          </div>
          {participants.length > 0 ? (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {participants.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                        p.status === 'lulus'
                          ? 'bg-emerald-500'
                          : p.status === 'gagal'
                            ? 'bg-red-500'
                            : p.status === 'mengikuti_pendadaran'
                              ? 'bg-blue-500'
                              : 'bg-gray-400'
                      }`}
                    >
                      {p.namaLengkap.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {p.namaLengkap}
                      </p>
                      <p className="text-xs text-gray-400">{p.ranting?.nama || '-'}</p>
                    </div>
                  </div>
                  <span
                    className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      p.status === 'lulus'
                        ? 'bg-emerald-100 text-emerald-700'
                        : p.status === 'gagal'
                          ? 'bg-red-100 text-red-700'
                          : p.status === 'mengikuti_pendadaran'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {p.status === 'mengikuti_pendadaran'
                      ? 'Peserta'
                      : p.status === 'lulus'
                        ? 'Lulus'
                        : p.status === 'gagal'
                          ? 'Gagal'
                          : p.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users size={32} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-400">Belum ada peserta</p>
            </div>
          )}
        </div>
      </div>

      {/* Graduate Modal */}
      <Modal
        open={showGraduateModal}
        onClose={() => setShowGraduateModal(false)}
        title="Input Hasil Pendadaran"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Tentukan kelulusan untuk setiap peserta pendadaran
          </p>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {participants
              .filter((p) => p.status === 'mengikuti_pendadaran')
              .map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {p.namaLengkap}
                    </p>
                    <p className="text-xs text-gray-400">{p.ranting?.nama || '-'}</p>
                  </div>
                  <input
                    type="number"
                    placeholder="Skor"
                    value={graduateResults[p.id]?.totalSkor || ''}
                    onChange={(e) =>
                      setGraduateResults((prev) => ({
                        ...prev,
                        [p.id]: { ...prev[p.id], totalSkor: Number(e.target.value) || 0 },
                      }))
                    }
                    className="w-20 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                  <div className="flex gap-1">
                    <button
                      onClick={() =>
                        setGraduateResults((prev) => ({
                          ...prev,
                          [p.id]: { ...prev[p.id], lulus: true },
                        }))
                      }
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                        graduateResults[p.id]?.lulus === true
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-emerald-100'
                      }`}
                    >
                      Lulus
                    </button>
                    <button
                      onClick={() =>
                        setGraduateResults((prev) => ({
                          ...prev,
                          [p.id]: { ...prev[p.id], lulus: false },
                        }))
                      }
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                        graduateResults[p.id]?.lulus === false
                          ? 'bg-red-600 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-red-100'
                      }`}
                    >
                      Gagal
                    </button>
                  </div>
                </div>
              ))}
            {participants.filter((p) => p.status === 'mengikuti_pendadaran').length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">
                Tidak ada peserta aktif yang bisa dinilai
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setShowGraduateModal(false)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              Batal
            </button>
            <button
              onClick={handleGraduate}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition"
            >
              Simpan Hasil
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
