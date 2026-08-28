'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { PublicLayout } from '@/components';
import { ChevronRight, Building2, Users, Calendar, Link2, Loader2, RefreshCw } from 'lucide-react';
import OrgChart from '@/components/public/org-chart';
import PengurusModal from '@/components/public/pengurus-modal';
import StrukturSearchBar from '@/components/public/search-bar';
import apiClient from '@/lib/api-client';

type Level = 'nasional' | 'distrik' | 'wilayah' | 'ranting';

interface UnitOption {
  id: string;
  nama: string;
}

interface PeriodeOption {
  id: string;
  nama: string;
  tglMulai: string;
  tglSelesai: string;
  isActive: boolean;
}

interface Pengurus {
  id: string;
  nama: string;
  jabatan: string;
  jabatanUrutan: number;
  parentId: string | null;
  fotoPath?: string | null;
  status?: string;
  distrik?: string | null;
  wilayah?: string | null;
  ranting?: string | null;
  nasional?: string | null;
}

interface UnitChildren {
  level: string | null;
  items: UnitOption[];
}

interface StrukturData {
  unitInfo: Record<string, unknown> | null;
  unitLevel: string;
  periode: PeriodeOption | null;
  pengurusCount: number;
  memberCount: number;
  pengurus: Pengurus[];
}

const levelLabels: Record<Level, string> = {
  nasional: 'Nasional',
  distrik: 'Distrik',
  wilayah: 'Wilayah',
  ranting: 'Ranting',
};

export default function StrukturOrganisasiContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [level, setLevel] = useState<Level>((searchParams.get('level') as Level) || 'nasional');
  const [distrikId, setDistrikId] = useState(searchParams.get('distrikId') || '');
  const [wilayahId, setWilayahId] = useState(searchParams.get('wilayahId') || '');
  const [rantingId, setRantingId] = useState(searchParams.get('rantingId') || '');
  const [periodeId, setPeriodeId] = useState(searchParams.get('periodeId') || '');

  const [distriks, setDistriks] = useState<UnitOption[]>([]);
  const [wilayahs, setWilayahs] = useState<UnitOption[]>([]);
  const [rantings, setRantings] = useState<UnitOption[]>([]);
  const [periodes, setPeriodes] = useState<PeriodeOption[]>([]);
  const [strukturData, setStrukturData] = useState<StrukturData | null>(null);
  const [childUnits, setChildUnits] = useState<UnitChildren | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<Pengurus | null>(null);
  const [copied, setCopied] = useState(false);

  // Load distriks on mount
  useEffect(() => {
    apiClient
      .get('/public/struktur/distrik')
      .then(({ data }) => setDistriks(data.data || []))
      .catch(() => {});
  }, []);

  // Cascading: load wilayahs
  useEffect(() => {
    if (level === 'distrik' || level === 'nasional') {
      setWilayahs([]);
      setRantings([]);
      return;
    }
    if (!distrikId) {
      setWilayahs([]);
      return;
    }
    apiClient
      .get('/public/struktur/wilayah', { params: { distrikId } })
      .then(({ data }) => setWilayahs(data.data || []))
      .catch(() => {});
  }, [distrikId, level]);

  // Cascading: load rantings
  useEffect(() => {
    if (level !== 'ranting') {
      setRantings([]);
      return;
    }
    if (!wilayahId) {
      setRantings([]);
      return;
    }
    apiClient
      .get('/public/struktur/ranting', { params: { wilayahId } })
      .then(({ data }) => setRantings(data.data || []))
      .catch(() => {});
  }, [wilayahId, level]);

  // Load periodes
  useEffect(() => {
    const unitId =
      level === 'ranting' ? rantingId : level === 'wilayah' ? wilayahId : level === 'distrik' ? distrikId : undefined;

    if (level === 'nasional' || unitId) {
      apiClient
        .get('/public/struktur/periode', { params: { level, unitId } })
        .then(({ data }) => {
          setPeriodes(data.data || []);
          const active = (data.data || []).find((p: PeriodeOption) => p.isActive);
          if (active && !periodeId) setPeriodeId(active.id);
        })
        .catch(() => {});
    }
  }, [level, distrikId, wilayahId, rantingId]);

  const loadStruktur = useCallback(async () => {
    const unitId =
      level === 'ranting' ? rantingId : level === 'wilayah' ? wilayahId : level === 'distrik' ? distrikId : undefined;

    if (level !== 'nasional' && !unitId) return;

    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get('/public/struktur/members', {
        params: { level, unitId, periodeId: periodeId || undefined },
      });
      setStrukturData(data.data);

      const childRes = await apiClient.get('/public/struktur/children', {
        params: { level, unitId: unitId || 'root' },
      });
      setChildUnits(childRes.data.data);

      // Update URL
      const params = new URLSearchParams();
      params.set('level', level);
      if (distrikId) params.set('distrikId', distrikId);
      if (wilayahId) params.set('wilayahId', wilayahId);
      if (rantingId) params.set('rantingId', rantingId);
      if (periodeId) params.set('periodeId', periodeId);
      router.replace(`/struktur-organisasi?${params.toString()}`, { scroll: false });
    } catch {
      setError('Data struktur organisasi belum dapat dimuat. Silakan coba lagi.');
    }
    setLoading(false);
    setHasLoaded(true);
  }, [level, distrikId, wilayahId, rantingId, periodeId, router]);

  // Auto-load from URL params
  useEffect(() => {
    if (!hasLoaded && searchParams.get('level')) {
      loadStruktur();
    }
  }, []);

  const handleSearchSelect = (result: { level: string; unitId: string; periodeId: string }) => {
    setLevel(result.level as Level);
    setPeriodeId(result.periodeId);
    if (result.level === 'distrik') {
      setDistrikId(result.unitId);
      setWilayahId('');
      setRantingId('');
    } else if (result.level === 'wilayah') {
      apiClient
        .get(`/org-structure/wilayah/${result.unitId}`)
        .then(({ data }) => {
          setDistrikId(data.data?.distrikId || '');
          setWilayahId(result.unitId);
          setRantingId('');
        })
        .catch(() => setWilayahId(result.unitId));
    } else if (result.level === 'ranting') {
      apiClient
        .get(`/org-structure/ranting/${result.unitId}`)
        .then(({ data }) => {
          setRantingId(result.unitId);
          if (data.data?.wilayahId) {
            setWilayahId(data.data.wilayahId);
            apiClient
              .get(`/org-structure/wilayah/${data.data.wilayahId}`)
              .then(({ data: wData }) => setDistrikId(wData.data?.distrikId || ''))
              .catch(() => {});
          }
        })
        .catch(() => setRantingId(result.unitId));
    } else {
      setDistrikId('');
      setWilayahId('');
      setRantingId('');
    }
    setTimeout(() => loadStruktur(), 200);
  };

  const handleShow = () => loadStruktur();

  const handleReset = () => {
    setLevel('nasional');
    setDistrikId('');
    setWilayahId('');
    setRantingId('');
    setPeriodeId('');
    setStrukturData(null);
    setChildUnits(null);
    setError(null);
    setHasLoaded(false);
    router.replace('/struktur-organisasi', { scroll: false });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleChildNavigate = (childLevel: string, childId: string) => {
    if (childLevel === 'distrik') {
      setLevel('distrik');
      setDistrikId(childId);
      setWilayahId('');
      setRantingId('');
    } else if (childLevel === 'wilayah') {
      setLevel('wilayah');
      setWilayahId(childId);
      setRantingId('');
    } else if (childLevel === 'ranting') {
      setLevel('ranting');
      setRantingId(childId);
    }
    setTimeout(() => loadStruktur(), 200);
  };

  const unitName = strukturData?.unitInfo
    ? (strukturData.unitInfo as Record<string, unknown>).nama as string
    : null;

  return (
    <PublicLayout>
      {/* Header */}
      <div className="bg-gradient-to-r from-navy-700 to-navy-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-white/60 text-sm mb-2">
            <a href="/" className="hover:text-white transition-colors">Beranda</a>
            <ChevronRight size={14} />
            <span className="text-gold-400">Struktur Organisasi</span>
            {unitName && (
              <>
                <ChevronRight size={14} />
                <span className="text-white">{unitName}</span>
              </>
            )}
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white">Struktur Organisasi</h1>
          <p className="text-white/70 mt-2">
            Lihat susunan kepengurusan THS-THM berdasarkan Distrik, Wilayah, Ranting, dan Periode.
          </p>
          <div className="w-16 h-1 bg-gold-400 mt-4 rounded-full" />
        </div>
      </div>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search */}
        <div className="mb-8">
          <StrukturSearchBar onSelect={handleSearchSelect as any} />
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6 mb-8 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Level */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Level</label>
              <select
                value={level}
                onChange={(e) => { setLevel(e.target.value as Level); setWilayahId(''); setRantingId(''); }}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm dark:text-white focus:ring-2 focus:ring-navy-500 focus:outline-none"
              >
                <option value="nasional">Nasional</option>
                <option value="distrik">Distrik</option>
                <option value="wilayah">Wilayah</option>
                <option value="ranting">Ranting</option>
              </select>
            </div>

            {/* Distrik */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Distrik</label>
              <select
                value={distrikId}
                onChange={(e) => { setDistrikId(e.target.value); setWilayahId(''); setRantingId(''); }}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm dark:text-white focus:ring-2 focus:ring-navy-500 focus:outline-none"
              >
                <option value="">Semua Distrik</option>
                {distriks.map((d) => <option key={d.id} value={d.id}>{d.nama}</option>)}
              </select>
            </div>

            {/* Wilayah */}
            {(level === 'wilayah' || level === 'ranting') && (
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Wilayah</label>
                <select
                  value={wilayahId}
                  onChange={(e) => { setWilayahId(e.target.value); setRantingId(''); }}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm dark:text-white focus:ring-2 focus:ring-navy-500 focus:outline-none"
                >
                  <option value="">Semua Wilayah</option>
                  {wilayahs.map((w) => <option key={w.id} value={w.id}>{w.nama}</option>)}
                </select>
              </div>
            )}

            {/* Ranting */}
            {level === 'ranting' && (
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Ranting</label>
                <select
                  value={rantingId}
                  onChange={(e) => setRantingId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm dark:text-white focus:ring-2 focus:ring-navy-500 focus:outline-none"
                >
                  <option value="">Semua Ranting</option>
                  {rantings.map((r) => <option key={r.id} value={r.id}>{r.nama}</option>)}
                </select>
              </div>
            )}

            {/* Periode */}
            {periodes.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Periode</label>
                <select
                  value={periodeId}
                  onChange={(e) => setPeriodeId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm dark:text-white focus:ring-2 focus:ring-navy-500 focus:outline-none"
                >
                  {periodes.map((p) => <option key={p.id} value={p.id}>{p.nama} {p.isActive ? '(Aktif)' : ''}</option>)}
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={handleShow}
              disabled={loading || (level !== 'nasional' && !distrikId)}
              className="px-6 py-2.5 bg-navy-800 text-white rounded-xl text-sm font-semibold hover:bg-navy-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              Tampilkan
            </button>
            <button
              onClick={handleReset}
              className="px-6 py-2.5 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center mb-8">
            <p className="text-red-600 dark:text-red-400 mb-3">{error}</p>
            <button onClick={handleShow} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors flex items-center gap-2 mx-auto">
              <RefreshCw size={14} /> Coba Lagi
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="space-y-4">
            <div className="h-24 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
            <div className="h-96 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
          </div>
        )}

        {/* Data */}
        {!loading && strukturData && (
          <>
            {/* Unit Info Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6 mb-8 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-navy-800 dark:text-white">
                    KEPENGURUSAN {levelLabels[level]?.toUpperCase()} {unitName?.toUpperCase() || 'NASIONAL THS-THM'}
                  </h2>
                  {strukturData.periode && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
                      <Calendar size={14} />
                      Periode {strukturData.periode.nama}
                      {strukturData.periode.isActive && (
                        <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">Aktif</span>
                      )}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-navy-800 dark:text-white flex items-center gap-1">
                      <Users size={18} className="text-navy-400" /> {strukturData.pengurusCount}
                    </div>
                    <div className="text-xs text-gray-500">Pengurus</div>
                  </div>
                  {strukturData.memberCount > 0 && (
                    <div className="text-center">
                      <div className="text-2xl font-bold text-navy-800 dark:text-white flex items-center gap-1">
                        <Building2 size={18} className="text-gold-400" /> {strukturData.memberCount}
                      </div>
                      <div className="text-xs text-gray-500">Anggota</div>
                    </div>
                  )}
                  <button onClick={handleCopyLink} className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors" title="Salin Link">
                    <Link2 size={16} className={copied ? 'text-green-500' : 'text-gray-400'} />
                  </button>
                  {copied && <span className="text-xs text-green-600 dark:text-green-400">Link berhasil disalin!</span>}
                </div>
              </div>
            </div>

            {/* Org Chart */}
            <div className="mb-8">
              <OrgChart members={strukturData.pengurus} onMemberClick={(m) => setSelectedMember(m as any)} />
            </div>

            {/* Child Units */}
            {childUnits && childUnits.items.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
                <h3 className="text-lg font-bold text-navy-800 dark:text-white mb-4">
                  {childUnits.level === 'distrik' ? 'Distrik' : childUnits.level === 'wilayah' ? 'Wilayah' : 'Ranting'}{' '}
                  {childUnits.level === 'distrik' ? 'dalam Organisasi' : `dalam ${unitName || 'unit ini'}`}
                </h3>
                <div className="flex flex-wrap gap-3">
                  {childUnits.items.map((child) => (
                    <button
                      key={child.id}
                      onClick={() => handleChildNavigate(childUnits.level!, child.id)}
                      className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-medium text-navy-700 dark:text-navy-200 hover:bg-navy-50 dark:hover:bg-navy-900/30 hover:border-navy-300 transition-all"
                    >
                      {child.nama}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Empty state */}
        {!loading && !strukturData && !error && !hasLoaded && (
          <div className="text-center py-16">
            <Building2 size={48} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <p className="text-gray-400 dark:text-gray-500 text-lg">
              Pilih level dan unit organisasi, lalu klik &ldquo;Tampilkan&rdquo; untuk melihat struktur kepengurusan.
            </p>
          </div>
        )}
      </section>

      {selectedMember && <PengurusModal member={selectedMember as any} onClose={() => setSelectedMember(null)} />}
    </PublicLayout>
  );
}
