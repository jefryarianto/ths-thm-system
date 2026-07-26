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
  Users,
  GraduationCap,
  Award,
  XCircle,
  AlertCircle,
  RefreshCw,
  Clock,
  ClipboardList,
  UserCheck,
  Plus,
  Trash2,
  CheckCircle2,
  BookOpen,
  FileEdit,
  Save,
  ListChecks,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import Modal from '@/components/ui/modal';

// ─── Constants (inline — no external file dependency) ──

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700',
  published: 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  closed: 'bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800',
  cancelled: 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-500 border-gray-200 dark:border-gray-700',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  published: 'Dipublikasikan',
  closed: 'Ditutup',
  cancelled: 'Dibatalkan',
};

const UJIAN_STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
  berlangsung: 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400',
  selesai: 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400',
  dibatalkan: 'bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400',
};

const UJIAN_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  berlangsung: 'Berlangsung',
  selesai: 'Selesai',
  dibatalkan: 'Dibatalkan',
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('id-ID', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

function formatShort(d: string) {
  return new Date(d).toLocaleDateString('id-ID', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function DetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-1/3" />
      <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
      <div className="grid grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 bg-gray-200 dark:bg-gray-800 rounded-xl" />
        ))}
      </div>
      <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
    </div>
  );
}

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
  adminKegiatanId?: string | null;
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

interface UjianPraktek {
  id: string;
  nama: string;
  deskripsi: string | null;
  tanggal: string | null;
  durasiMenit: number | null;
  status: string;
  createdAt: string;
  penilais: Array<{ id: string; pengujiUser: { id: string; namaLengkap: string; email: string } }>;
  items: Array<{ id: string; itemPenilaian: { id: string; namaItem: string; skorMaksimal: number; bobot: number; aspek: { namaAspek: string } }; urutan: number }>;
  _count: { penilaians: number };
}

interface AvailableItem {
  id: string;
  namaItem: string;
  kodeItem: string;
  skorMaksimal: number;
  bobot: number;
  urutan: number;
  aspek: { id: string; namaAspek: string; kodeAspek: string };
}

interface NilaiRecord {
  id: string;
  calonAnggotaId: string;
  calonAnggota: { id: string; namaLengkap: string; ranting?: { nama: string } };
  itemPenilaian: { id: string; namaItem: string; skorMaksimal: number; bobot: number };
  penguji: { id: string; namaLengkap: string };
  skor: number;
  komentar: string | null;
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

  // Sub-tab state
  const [activeSubTab, setActiveSubTab] = useState<'info' | 'participants' | 'ujian-praktek'>('info');

  // Graduate modal
  const [showGraduateModal, setShowGraduateModal] = useState(false);
  const [graduateResults, setGraduateResults] = useState<Record<string, { lulus: boolean; totalSkor?: number }>>({});

  // Ujian Praktek state
  const [ujianList, setUjianList] = useState<UjianPraktek[]>([]);
  const [ujianLoading, setUjianLoading] = useState(false);
  const [showCreateUjian, setShowCreateUjian] = useState(false);
  const [createUjianForm, setCreateUjianForm] = useState({ nama: '', deskripsi: '', tanggal: '', durasiMenit: '' });
  const [expandedUjian, setExpandedUjian] = useState<string | null>(null);
  const [availableItems, setAvailableItems] = useState<AvailableItem[]>([]);
  const [availableExaminers, setAvailableExaminers] = useState<Array<{ id: string; namaLengkap: string; email: string }>>([]);

  // Scoring state
  const [scores, setScores] = useState<NilaiRecord[]>([]);
  const [scoreInput, setScoreInput] = useState<Record<string, Record<string, number>>>({});
  const [savingScores, setSavingScores] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [gradRes, partRes] = await Promise.all([
        apiClient.get(`/graduations/${id}`),
        apiClient.get(`/graduations/${id}/participants`),
      ]);
      setGraduation(gradRes.data.data);
      setParticipants(partRes.data.data || []);
      setError(null);
    } catch {
      setError('Gagal memuat data pendadaran');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchUjianList = useCallback(async () => {
    if (!id) return;
    setUjianLoading(true);
    try {
      const res = await apiClient.get(`/graduations/${id}/ujian-praktek`);
      setUjianList(res.data.data || []);
    } catch { /* ignore */ }
    setUjianLoading(false);
  }, [id]);

  const fetchAvailableItems = useCallback(async () => {
    if (!id) return;
    try {
      const res = await apiClient.get(`/graduations/${id}/ujian-praktek/available-items`);
      setAvailableItems(res.data.data || []);
    } catch { /* ignore */ }
  }, [id]);

  const fetchAvailableExaminers = useCallback(async () => {
    if (!id) return;
    try {
      const res = await apiClient.get(`/graduations/${id}/ujian-praktek/available-examiners`);
      setAvailableExaminers(res.data.data?.allPenguji || []);
    } catch { /* ignore */ }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (activeSubTab === 'ujian-praktek') {
      fetchUjianList();
      fetchAvailableItems();
      fetchAvailableExaminers();
    }
  }, [activeSubTab, fetchUjianList, fetchAvailableItems, fetchAvailableExaminers]);

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
    } catch { /* ignore */ }
  };

  const handleCreateUjian = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      await apiClient.post(`/graduations/${id}/ujian-praktek`, {
        nama: createUjianForm.nama,
        deskripsi: createUjianForm.deskripsi || undefined,
        tanggal: createUjianForm.tanggal || undefined,
        durasiMenit: createUjianForm.durasiMenit ? Number(createUjianForm.durasiMenit) : undefined,
      });
      setShowCreateUjian(false);
      setCreateUjianForm({ nama: '', deskripsi: '', tanggal: '', durasiMenit: '' });
      await fetchUjianList();
    } catch { /* ignore */ }
  };

  const handleAssignExaminer = async (ujianId: string, pengujiUserId: string) => {
    try {
      await apiClient.post(`/graduations/${id}/ujian-praktek/${ujianId}/examiners`, { pengujiUserId });
      await fetchUjianList();
    } catch { /* ignore */ }
  };

  const handleRemoveExaminer = async (ujianId: string, pengujiUserId: string) => {
    try {
      await apiClient.delete(`/graduations/${id}/ujian-praktek/${ujianId}/examiners`, {
        data: { pengujiUserId },
      });
      await fetchUjianList();
    } catch { /* ignore */ }
  };

  const handleAssignItem = async (ujianId: string, itemPenilaianId: string) => {
    try {
      await apiClient.post(`/graduations/${id}/ujian-praktek/${ujianId}/items`, { itemPenilaianId });
      await fetchUjianList();
    } catch { /* ignore */ }
  };

  const handleRemoveItem = async (ujianId: string, itemPenilaianId: string) => {
    try {
      await apiClient.delete(`/graduations/${id}/ujian-praktek/${ujianId}/items/${itemPenilaianId}`);
      await fetchUjianList();
    } catch { /* ignore */ }
  };

  const handleUpdateUjianStatus = async (ujianId: string, status: string) => {
    try {
      await apiClient.patch(`/graduations/${id}/ujian-praktek/${ujianId}`, { status });
      await fetchUjianList();
    } catch { /* ignore */ }
  };

  const expandUjian = async (ujianId: string) => {
    if (expandedUjian === ujianId) {
      setExpandedUjian(null);
      return;
    }
    setExpandedUjian(ujianId);
    // Fetch existing scores
    try {
      const res = await apiClient.get(`/graduations/${id}/ujian-praktek/${ujianId}/scores`);
      const existingScores: NilaiRecord[] = res.data.data || [];
      setScores(existingScores);

      // Build score input from existing data
      const input: Record<string, Record<string, number>> = {};
      for (const s of existingScores) {
        if (!input[s.calonAnggotaId]) input[s.calonAnggotaId] = {};
        input[s.calonAnggotaId][s.itemPenilaian.id] = Number(s.skor);
      }
      setScoreInput(input);
    } catch { /* ignore */ }
  };

  const handleSaveScores = async (ujianId: string) => {
    const ujian = ujianList.find((u) => u.id === ujianId);
    if (!ujian) return;

    const scoresPayload: Array<{ calonAnggotaId: string; items: Array<{ itemPenilaianId: string; skor: number }> }> = [];

    for (const [calonAnggotaId, itemScores] of Object.entries(scoreInput)) {
      // Only include candidates who are participants
      if (!participants.some((p) => p.id === calonAnggotaId && p.status === 'mengikuti_pendadaran')) continue;

      const items = ujian.items
        .filter((item) => itemScores[item.itemPenilaian.id] !== undefined)
        .map((item) => ({
          itemPenilaianId: item.itemPenilaian.id,
          skor: itemScores[item.itemPenilaian.id] || 0,
        }));

      if (items.length > 0) {
        scoresPayload.push({ calonAnggotaId, items });
      }
    }

    if (scoresPayload.length === 0) return;

    setSavingScores(true);
    try {
      await apiClient.post(`/graduations/${id}/ujian-praktek/${ujianId}/score`, { scores: scoresPayload });
      await expandUjian(ujianId); // reload
    } catch { /* ignore */ }
    setSavingScores(false);
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
          >← Kembali</button>
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

  const activeParticipants = participants.filter((p) => p.status === 'mengikuti_pendadaran');

  // Get items not yet assigned to a ujian
  const getUnassignedItems = (ujian: UjianPraktek) => {
    const assignedIds = new Set(ujian.items.map((i) => i.itemPenilaian.id));
    return availableItems.filter((i) => !assignedIds.has(i.id));
  };

  // Get examiners not yet assigned to a ujian
  const getUnassignedExaminers = (ujian: UjianPraktek) => {
    const assignedIds = new Set(ujian.penilais.map((p) => p.pengujiUser.id));
    return availableExaminers.filter((e) => !assignedIds.has(e.id));
  };

  const SUB_TABS = [
    { key: 'info' as const, label: 'Detail', icon: GraduationCap },
    { key: 'participants' as const, label: `Peserta (${participants.length})`, icon: Users },
    { key: 'ujian-praktek' as const, label: `Ujian Praktek (${ujianList.length})`, icon: ClipboardList },
  ];

  return (
    <PermissionGuard module="graduations" action="view">
      <Breadcrumbs suffix={{ href: '#', label: graduation?.nama || 'Detail' }} />
      <div className="space-y-6">

        {/* Back */}
        <Link href="/graduations" className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition group">
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
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">{graduation.nama}</h1>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[graduation.status] || ''}`}>
                    {STATUS_LABELS[graduation.status] || graduation.status}
                  </span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{dateRange}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{graduation.lokasi || 'Lokasi belum ditentukan'}</p>
              </div>
            </div>
            <button onClick={fetchData} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-400" title="Refresh">
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
            <div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950"><Users size={18} className="text-blue-600" /></div><div><p className="text-xs text-gray-500">Peserta Aktif</p><p className="text-lg font-bold text-gray-900 dark:text-white">{participatingCount}</p></div></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
            <div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-green-50 dark:bg-green-950"><Award size={18} className="text-green-600" /></div><div><p className="text-xs text-gray-500">Lulus</p><p className="text-lg font-bold text-green-600">{lulusCount}</p></div></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
            <div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-red-50 dark:bg-red-950"><XCircle size={18} className="text-red-600" /></div><div><p className="text-xs text-gray-500">Gagal</p><p className="text-lg font-bold text-red-600">{gagalCount}</p></div></div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
            <div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950"><Calendar size={18} className="text-purple-600" /></div><div><p className="text-xs text-gray-500">Total Calon</p><p className="text-lg font-bold text-gray-900 dark:text-white">{participants.length}</p></div></div>
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-4 overflow-x-auto">
            {SUB_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeSubTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveSubTab(tab.key)}
                  className={`flex items-center gap-2 px-3 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                    isActive
                      ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 dark:border-emerald-400'
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

        {/* ─── TAB: Info ──────────────────────────────────────── */}
        {activeSubTab === 'info' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                <GraduationCap size={18} className="text-emerald-500" />
                Detail Pendadaran
              </h3>
              <div className="space-y-3">
                {[
                  { icon: Calendar, label: 'Tanggal', value: dateRange },
                  { icon: MapPin, label: 'Lokasi', value: graduation.lokasi || 'Belum ditentukan' },
                  { icon: Award, label: 'Tipe', value: graduation.tipe },
                  { icon: Clock, label: 'Dibuat', value: formatDate(graduation.createdAt) },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                    <Icon size={16} className="text-gray-400 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500 uppercase">{label}</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                <BookOpen size={18} className="text-emerald-500" />
                Ringkasan
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Total Ujian Praktek</span>
                  <span className="text-lg font-bold text-gray-900 dark:text-white">{ujianList.length}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Peserta Mendaftar</span>
                  <span className="text-lg font-bold text-gray-900 dark:text-white">{participatingCount}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Sudah Dinilai</span>
                  <span className="text-lg font-bold text-gray-900 dark:text-white">{lulusCount + gagalCount}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB: Participants ─────────────────────────────── */}
        {activeSubTab === 'participants' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Users size={18} className="text-emerald-500" />
                Daftar Peserta ({participants.length})
              </h3>
              {graduation.status === 'published' && (
                <button onClick={() => setShowGraduateModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition">
                  <Award size={14} /> Input Hasil
                </button>
              )}
            </div>
            {participants.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {participants.map((p) => (
                  <div key={p.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                        p.status === 'lulus' ? 'bg-emerald-500' : p.status === 'gagal' ? 'bg-red-500' : p.status === 'mengikuti_pendadaran' ? 'bg-blue-500' : 'bg-gray-400'
                      }`}>
                        {p.namaLengkap.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{p.namaLengkap}</p>
                        <p className="text-xs text-gray-400">{p.ranting?.nama || '-'}</p>
                      </div>
                    </div>
                    <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      p.status === 'lulus' ? 'bg-emerald-100 text-emerald-700' : p.status === 'gagal' ? 'bg-red-100 text-red-700' : p.status === 'mengikuti_pendadaran' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {p.status === 'mengikuti_pendadaran' ? 'Peserta' : p.status === 'lulus' ? 'Lulus' : p.status === 'gagal' ? 'Gagal' : p.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8"><Users size={32} className="mx-auto text-gray-300 mb-2" /><p className="text-sm text-gray-400">Belum ada peserta</p></div>
            )}
          </div>
        )}

        {/* ─── TAB: Ujian Praktek ──────────────────────────────── */}
        {activeSubTab === 'ujian-praktek' && (
          <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <ClipboardList size={18} className="text-emerald-500" />
                Sesi Ujian Praktek
              </h3>
              <button onClick={() => setShowCreateUjian(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition">
                <Plus size={14} /> Buat Sesi
              </button>
            </div>

            {/* Create Ujian modal */}
            <Modal open={showCreateUjian} onClose={() => setShowCreateUjian(false)} title="Buat Sesi Ujian Praktek" size="md">
              <form onSubmit={handleCreateUjian} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nama Sesi *</label>
                  <input type="text" value={createUjianForm.nama} onChange={(e) => setCreateUjianForm({ ...createUjianForm, nama: e.target.value })} required
                    placeholder="Contoh: Ujian Praktek Ses-1"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Deskripsi</label>
                  <textarea value={createUjianForm.deskripsi} onChange={(e) => setCreateUjianForm({ ...createUjianForm, deskripsi: e.target.value })} rows={2}
                    placeholder="Deskripsi sesi ujian praktek"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tanggal</label>
                    <input type="date" value={createUjianForm.tanggal} onChange={(e) => setCreateUjianForm({ ...createUjianForm, tanggal: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Durasi (menit)</label>
                    <input type="number" value={createUjianForm.durasiMenit} onChange={(e) => setCreateUjianForm({ ...createUjianForm, durasiMenit: e.target.value })}
                      placeholder="60"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500" />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setShowCreateUjian(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">Batal</button>
                  <button type="submit"
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition">Simpan</button>
                </div>
              </form>
            </Modal>

            {/* Ujian List */}
            {ujianLoading ? (
              <div className="text-center py-8 text-sm text-gray-400">Memuat data ujian praktek...</div>
            ) : ujianList.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
                <ClipboardList size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Belum ada sesi ujian praktek</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Buat sesi ujian praktek untuk memulai penilaian interview</p>
                <button onClick={() => setShowCreateUjian(true)} className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition">
                  <Plus size={14} /> Buat Sesi Pertama
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {ujianList.map((ujian) => (
                  <div key={ujian.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                    {/* Session Header */}
                    <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                      onClick={() => expandUjian(ujian.id)}>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          ujian.status === 'selesai' ? 'bg-blue-50 dark:bg-blue-950' :
                          ujian.status === 'berlangsung' ? 'bg-emerald-50 dark:bg-emerald-950' :
                          ujian.status === 'dibatalkan' ? 'bg-red-50 dark:bg-red-950' :
                          'bg-gray-50 dark:bg-gray-800'
                        }`}>
                          <FileEdit size={18} className={
                            ujian.status === 'selesai' ? 'text-blue-600' :
                            ujian.status === 'berlangsung' ? 'text-emerald-600' :
                            ujian.status === 'dibatalkan' ? 'text-red-600' :
                            'text-gray-400'
                          } />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{ujian.nama}</h4>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${UJIAN_STATUS_STYLES[ujian.status] || ''}`}>
                              {UJIAN_STATUS_LABELS[ujian.status] || ujian.status}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {ujian.tanggal ? formatShort(ujian.tanggal) : 'Tgl belum ditentukan'}
                            {ujian.durasiMenit ? ` · ${ujian.durasiMenit} menit` : ''}
                            {ujian.penilais.length > 0 ? ` · ${ujian.penilais.length} penguji` : ''}
                            {ujian.items.length > 0 ? ` · ${ujian.items.length} item` : ''}
                            {ujian._count.penilaians > 0 ? ` · ${ujian._count.penilaians} nilai` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {ujian.status === 'draft' && (
                          <>
                            <button onClick={(e) => { e.stopPropagation(); handleUpdateUjianStatus(ujian.id, 'berlangsung'); }}
                              className="px-2 py-1 text-xs font-medium bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 rounded-lg hover:bg-emerald-200 transition">
                              Mulai
                            </button>
                          </>
                        )}
                        {ujian.status === 'berlangsung' && (
                          <button onClick={(e) => { e.stopPropagation(); handleUpdateUjianStatus(ujian.id, 'selesai'); }}
                            className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 transition">
                            Selesai
                          </button>
                        )}
                        {expandedUjian === ujian.id ? <ChevronDown size={18} className="text-gray-400" /> : <ChevronRight size={18} className="text-gray-400" />}
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {expandedUjian === ujian.id && (
                      <div className="border-t border-gray-100 dark:border-gray-700 p-4 space-y-6">

                        {/* --- Status Actions --- */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {ujian.status === 'draft' && (
                            <>
                              <button onClick={() => handleUpdateUjianStatus(ujian.id, 'berlangsung')}
                                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition">
                                <Eye size={12} /> Mulai Ujian
                              </button>
                              <button onClick={() => handleUpdateUjianStatus(ujian.id, 'dibatalkan')}
                                className="flex items-center gap-1 px-3 py-1.5 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 rounded-lg text-xs font-medium hover:bg-red-50 dark:hover:bg-red-950 transition">
                                <EyeOff size={12} /> Batalkan
                              </button>
                            </>
                          )}
                          {ujian.status === 'berlangsung' && (
                            <button onClick={() => handleUpdateUjianStatus(ujian.id, 'selesai')}
                              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition">
                              <CheckCircle2 size={12} /> Akhiri Ujian
                            </button>
                          )}
                        </div>

                        {/* --- Penguji (Examiners) --- */}
                        <div>
                          <h5 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                            <UserCheck size={14} /> Penguji
                          </h5>
                          <div className="space-y-1.5">
                            {ujian.penilais.map((p) => (
                              <div key={p.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                                <div>
                                  <p className="text-sm font-medium text-gray-900 dark:text-white">{p.pengujiUser.namaLengkap}</p>
                                  <p className="text-xs text-gray-400">{p.pengujiUser.email}</p>
                                </div>
                                {ujian.status === 'draft' && (
                                  <button onClick={() => handleRemoveExaminer(ujian.id, p.pengujiUser.id)}
                                    className="p-1 text-gray-400 hover:text-red-500 transition">
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                          {ujian.status === 'draft' && getUnassignedExaminers(ujian).length > 0 && (
                            <select
                              onChange={(e) => { if (e.target.value) handleAssignExaminer(ujian.id, e.target.value); }}
                              value=""
                              className="mt-2 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                              <option value="">+ Tambah Penguji...</option>
                              {getUnassignedExaminers(ujian).map((e) => (
                                <option key={e.id} value={e.id}>{e.namaLengkap} ({e.email})</option>
                              ))}
                            </select>
                          )}
                        </div>

                        {/* --- Item Penilaian (Assessment Items) --- */}
                        <div>
                          <h5 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                            <ListChecks size={14} /> Item Penilaian
                          </h5>
                          {ujian.items.length > 0 ? (
                            <div className="space-y-1">
                              {ujian.items.sort((a, b) => a.urutan - b.urutan).map((item) => (
                                <div key={item.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-400 w-4">{item.urutan + 1}.</span>
                                    <div>
                                      <p className="text-sm font-medium text-gray-900 dark:text-white">{item.itemPenilaian.namaItem}</p>
                                      <p className="text-xs text-gray-400">{item.itemPenilaian.aspek.namaAspek} · Max {Number(item.itemPenilaian.skorMaksimal)}</p>
                                    </div>
                                  </div>
                                  {ujian.status === 'draft' && (
                                    <button onClick={() => handleRemoveItem(ujian.id, item.itemPenilaian.id)}
                                      className="p-1 text-gray-400 hover:text-red-500 transition">
                                      <Trash2 size={14} />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-400 italic">Belum ada item penilaian</p>
                          )}
                          {ujian.status === 'draft' && getUnassignedItems(ujian).length > 0 && (
                            <select
                              onChange={(e) => { if (e.target.value) handleAssignItem(ujian.id, e.target.value); }}
                              value=""
                              className="mt-2 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                              <option value="">+ Tambah Item...</option>
                              {getUnassignedItems(ujian).map((item) => (
                                <optgroup key={item.aspek.id} label={item.aspek.namaAspek}>
                                  <option value={item.id}>{item.namaItem} (Max: {Number(item.skorMaksimal)})</option>
                                </optgroup>
                              ))}
                            </select>
                          )}
                        </div>

                        {/* --- Scoring / Penilaian --- */}
                        {(ujian.status === 'berlangsung' || ujian.status === 'selesai') && (
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <h5 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                <CheckCircle2 size={14} /> Penilaian Interview
                              </h5>
                              {ujian.status === 'berlangsung' && (
                                <button onClick={() => handleSaveScores(ujian.id)}
                                  disabled={savingScores}
                                  className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition disabled:opacity-50">
                                  <Save size={12} /> {savingScores ? 'Menyimpan...' : 'Simpan Nilai'}
                                </button>
                              )}
                            </div>

                            {/* Scoring table */}
                            {ujian.items.length > 0 && activeParticipants.length > 0 ? (
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm border-collapse">
                                  <thead>
                                    <tr className="border-b border-gray-200 dark:border-gray-700">
                                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Peserta</th>
                                      {ujian.items.sort((a, b) => a.urutan - b.urutan).map((item) => (
                                        <th key={item.id} className="text-center px-2 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap min-w-[80px]">
                                          <div>{item.itemPenilaian.namaItem}</div>
                                          <div className="text-[10px] text-gray-400">/ {Number(item.itemPenilaian.skorMaksimal)}</div>
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {activeParticipants.map((p) => (
                                      <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition">
                                        <td className="px-3 py-2 text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">
                                          {p.namaLengkap}
                                        </td>
                                        {ujian.items.sort((a, b) => a.urutan - b.urutan).map((item) => (
                                          <td key={item.id} className="px-2 py-2 text-center">
                                            <input
                                              type="number"
                                              min={0}
                                              max={Number(item.itemPenilaian.skorMaksimal)}
                                              step={1}
                                              value={scoreInput[p.id]?.[item.itemPenilaian.id] ?? ''}
                                              onChange={(e) => {
                                                const val = e.target.value;
                                                setScoreInput((prev) => ({
                                                  ...prev,
                                                  [p.id]: {
                                                    ...(prev[p.id] || {}),
                                                    [item.itemPenilaian.id]: val === '' ? 0 : Math.min(
                                                      Number(val),
                                                      Number(item.itemPenilaian.skorMaksimal)
                                                    ),
                                                  },
                                                }));
                                              }}
                                              disabled={ujian.status === 'selesai'}
                                              className={`w-16 px-2 py-1 text-center text-sm border rounded-lg ${
                                                ujian.status === 'selesai'
                                                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 cursor-not-allowed'
                                                  : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-emerald-500'
                                              }`}
                                              placeholder="0"
                                            />
                                          </td>
                                        ))}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <div className="text-center py-6 text-sm text-gray-400">
                                {ujian.items.length === 0
                                  ? 'Tambahkan item penilaian terlebih dahulu'
                                  : 'Tidak ada peserta aktif yang bisa dinilai'}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Graduate Modal */}
        <Modal open={showGraduateModal} onClose={() => setShowGraduateModal(false)} title="Input Hasil Pendadaran" size="lg">
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Tentukan kelulusan untuk setiap peserta pendadaran</p>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {activeParticipants.map((p) => (
                <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{p.namaLengkap}</p>
                    <p className="text-xs text-gray-400">{p.ranting?.nama || '-'}</p>
                  </div>
                  <input type="number" placeholder="Skor" value={graduateResults[p.id]?.totalSkor || ''}
                    onChange={(e) => setGraduateResults((prev) => ({ ...prev, [p.id]: { ...prev[p.id], totalSkor: Number(e.target.value) || 0 } }))}
                    className="w-20 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                  <div className="flex gap-1">
                    <button onClick={() => setGraduateResults((prev) => ({ ...prev, [p.id]: { ...prev[p.id], lulus: true } }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${graduateResults[p.id]?.lulus === true ? 'bg-emerald-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-emerald-100'}`}>
                      Lulus
                    </button>
                    <button onClick={() => setGraduateResults((prev) => ({ ...prev, [p.id]: { ...prev[p.id], lulus: false } }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${graduateResults[p.id]?.lulus === false ? 'bg-red-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-red-100'}`}>
                      Gagal
                    </button>
                  </div>
                </div>
              ))}
              {activeParticipants.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">Tidak ada peserta aktif yang bisa dinilai</p>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <button onClick={() => setShowGraduateModal(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">Batal</button>
              <button onClick={handleGraduate}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition">Simpan Hasil</button>
            </div>
          </div>
        </Modal>
      </div>
    </PermissionGuard>
  );
}
