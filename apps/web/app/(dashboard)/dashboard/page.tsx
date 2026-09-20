'use client';

import { useState, useCallback, useEffect } from 'react';
import apiClient, { unwrap } from '@/lib/api-client';
import { useApi } from '@/lib/hooks/use-api';
import Breadcrumbs from '@/components/ui/breadcrumbs';
import {
  TrendingUp,
  Bell,
  Activity,
  RefreshCw,
  ChevronRight,
  Mail,
  ExternalLink,
  AlertCircle,
  AlertTriangle,
  GraduationCap,
  ClipboardCheck,
  Calendar,
} from 'lucide-react';
import Link from 'next/link';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import DashboardSkeleton from '@/components/dashboard/DashboardSkeleton';
import {
  type DashboardData,
  STATUS_COLORS,
  STATUS_LABELS,
  colorMap,
  statConfigs,
  secondaryStats,
  quickActions,
  actionItems,
  type QuickActionConfig,
  formatRupiah,
  formatTime,
} from '@/components/dashboard/constants';
import { useAuth } from '@/hooks/use-auth';
import { Can } from '@/components/auth/can';
import { ChartSkeleton } from '@/components/ui/skeleton';

// ── Design tokens untuk accent strip sekunder ─────────────────────
const ACCENT_CLASSES: Record<string, { icon: string; bar: string }> = {
  primary: { icon: 'bg-primary-container text-primary-700', bar: 'bg-primary' },
  success: { icon: 'bg-success-50 text-success-700', bar: 'bg-success' },
  warning: { icon: 'bg-warning-50 text-warning-700', bar: 'bg-warning' },
  error: { icon: 'bg-error-50 text-error-700', bar: 'bg-error' },
  info: { icon: 'bg-info-50 text-info-700', bar: 'bg-info' },
  slate: { icon: 'bg-surface-variant text-muted', bar: 'bg-border' },
  pending: { icon: 'bg-warning-50 text-warning-700', bar: 'bg-warning-300' },
};

/** Warna latar icon per item "Perlu Tindakan" sesuai semantic token */
const ACTION_ICON_BG: Record<string, string> = {
  error: 'bg-error-50 dark:bg-error-950',
  warning: 'bg-warning-50 dark:bg-warning-950',
  pending: 'bg-warning-50 dark:bg-warning-950',
  info: 'bg-info-50 dark:bg-info-950',
  success: 'bg-success-50 dark:bg-success-950',
};

const ACTION_ICON_COLOR: Record<string, string> = {
  error: 'text-error-700 dark:text-error-300',
  warning: 'text-warning-700 dark:text-warning-300',
  pending: 'text-warning-700 dark:text-warning-300',
  info: 'text-info-700 dark:text-info-300',
  success: 'text-success-700 dark:text-success-300',
};

function DashboardError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <AlertCircle className="h-12 w-12 text-error-400 mx-auto mb-3" aria-hidden="true" />
        <p className="text-error font-medium">{message}</p>
        <p className="text-sm text-muted mt-1">Periksa koneksi ke server API</p>
        <button
          onClick={onRetry}
          className="btn-primary mt-4"
        >
          Coba Lagi
        </button>
      </div>
    </div>
  );
}

// ─── Panel "Perlu Tindakan" ─ HANYA dari data nyata API ───
// Menggunakan konfigurasi actionItems dari constants.ts.
// Semua nilai berasal dari DashboardData (API /reports/dashboard).
// Jika semua 0 → empty state informatif, tanpa alarm berlebihan.
function ActionPanel({ data }: { data: DashboardData }) {
  const total = actionItems.reduce((sum, item) => sum + (Number(data[item.key]) || 0), 0);

  // Helper: map accent → border/hover classes (semantic, no rainbow)
  const getBorderHover = (accent: string) => {
    switch (accent) {
      case 'error':
        return 'border-border hover:border-error-300 dark:hover:border-error-800 hover:shadow-elegant-md';
      case 'warning':
        return 'border-border hover:border-warning-300 dark:hover:border-warning-800 hover:shadow-elegant-md';
      case 'pending':
        return 'border-border hover:border-warning-300 dark:hover:border-warning-800 hover:shadow-elegant-md';
      case 'info':
        return 'border-border hover:border-info-300 dark:hover:border-info-800 hover:shadow-elegant-md';
      case 'success':
        return 'border-border hover:border-success-300 dark:hover:border-success-800 hover:shadow-elegant-md';
      default:
        return 'border-border hover:border-border';
    }
  };

  return (
    <section aria-label="Perlu tindakan" className="card-elegant p-5 sm:p-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-text flex items-center gap-1.5">
          <AlertTriangle size={15} className="text-warning-600" aria-hidden="true" />
          Perlu Tindakan
        </h2>
        <span className="text-2xs text-muted">
          {total > 0 ? `${total.toLocaleString('id-ID')} item menunggu` : 'Semua clear'}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {actionItems.map((item) => {
          const value = Number(data[item.key]) || 0;
          const Icon = item.icon;
          const isEmpty = value === 0;
          return (
            <Link
              key={item.key}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl border p-3.5 transition ${
                !isEmpty ? getBorderHover(item.accent) : 'border-border bg-surface-variant/40'
              }`}
            >
              <span className={`p-2 rounded-lg shrink-0 ${ACTION_ICON_BG[item.accent]}`}>
                <Icon size={16} className={ACTION_ICON_COLOR[item.accent]} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted truncate">{item.label}</p>
                {value > 0 ? (
                  <>
                    <p className="text-xl font-bold text-text leading-6">
                      {value.toLocaleString('id-ID')}
                    </p>
                    <p className="text-[10px] text-muted mt-0.5 truncate">
                      {item.detail}
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-success-600 dark:text-success-400 font-medium mt-0.5">
                    Tidak ada yang perlu ditindaklanjuti.
                  </p>
                )}
              </div>
              {!isEmpty && (
                <ChevronRight size={16} className="text-muted shrink-0" aria-hidden="true" />
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

// ─── Activity-Scoped Dashboard (admin_kegiatan & penguji) ───

/** Salam beranda: "Gloria, Selamat Datang, {nama}" + nomor anggota di bawah nama. */
function GloriaGreeting({ className = '' }: { className?: string }) {
  const { user } = useAuth();
  const [nomorAnggota, setNomorAnggota] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    apiClient
      .get('/members/me')
      .then(({ data }) => {
        const member = data?.data || data;
        if (active) setNomorAnggota(member?.nomorAnggota || null);
      })
      .catch(() => {
        if (active) setNomorAnggota(null);
      });
    return () => {
      active = false;
    };
  }, []);
  return (
    <p className="text-sm text-muted mt-1">
      Gloria, Selamat Datang,{' '}
      <span className="font-medium text-text">
        {user?.namaLengkap || 'Anggota THS-THM'}
      </span>
      {nomorAnggota ? <span className="ml-2 font-mono text-xs text-muted">{nomorAnggota}</span> : null}
    </p>
  );
}

interface AssignedKegiatan {
  id: string;
  nama: string;
  status: string;
  tanggalMulai: string;
  lokasi: string | null;
  pesertaCount?: number;
}

function ActivityScopedDashboard() {
  const { isActivityAdmin } = useAuth();
  const [kegiatan, setKegiatan] = useState<AssignedKegiatan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchKegiatan = async () => {
      try {
        const { data } = await apiClient.get('/graduations', { params: { limit: 50 } });
        setKegiatan(data.data || []);
      } catch {
        // Ignore errors
      } finally {
        setLoading(false);
      }
    };
    fetchKegiatan();
  }, []);

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text flex items-center gap-2">
          {isActivityAdmin ? <GraduationCap size={24} className="text-primary" /> : <ClipboardCheck size={24} className="text-primary" />}
          {isActivityAdmin ? 'Kegiatan Saya' : 'Penilaian Saya'}
        </h1>
        <GloriaGreeting />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card-elegant p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted">Total Kegiatan</p>
              <p className="text-2xl font-bold text-text mt-1">{kegiatan.length}</p>
            </div>
            <div className="p-3 rounded-xl ring-1 ring-primary-200 bg-primary-50">
              <GraduationCap size={22} className="text-primary" />
            </div>
          </div>
        </div>
        <div className="card-elegant p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted">Aktif</p>
              <p className="text-2xl font-bold text-success-700 mt-1">{kegiatan.filter(k => k.status === 'published' || k.status === 'draft').length}</p>
            </div>
            <div className="p-3 rounded-xl ring-1 ring-success-200 bg-success-50">
              <Activity size={22} className="text-success-700" />
            </div>
          </div>
        </div>
        <div className="card-elegant p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted">Selesai</p>
              <p className="text-2xl font-bold text-muted mt-1">{kegiatan.filter(k => k.status === 'closed').length}</p>
            </div>
            <div className="p-3 rounded-xl ring-1 ring-border bg-surface-variant">
              <Calendar size={22} className="text-muted" />
            </div>
          </div>
        </div>
      </div>

      {/* Kegiatan List */}
      <div className="card-elegant">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-text flex items-center gap-1.5">
            <GraduationCap size={15} className="text-primary" />
            Daftar Kegiatan
          </h3>
        </div>
        <div className="divide-y divide-border">
          {kegiatan.length > 0 ? (
            kegiatan.map((k) => (
              <Link
                key={k.id}
                href={isActivityAdmin ? `/graduations/${k.id}` : `/graduations/${k.id}/assessments`}
                className="px-5 py-4 hover:bg-surface-variant transition flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary-container">
                    <GraduationCap size={16} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text">{k.nama}</p>
                    <p className="text-xs text-muted mt-0.5">
                      {k.lokasi || 'Lokasi tidak ditentukan'} ? {new Date(k.tanggalMulai).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    k.status === 'published' ? 'bg-success-50 text-success-700 dark:bg-success-900 dark:text-success-300' :
                    k.status === 'draft' ? 'bg-warning-50 text-warning-700 dark:bg-warning-900 dark:text-warning-300' :
                    'bg-surface-variant text-muted'
                  }`}>
                    {k.status === 'published' ? 'Aktif' : k.status === 'draft' ? 'Draft' : k.status === 'closed' ? 'Selesai' : k.status}
                  </span>
                  <ChevronRight size={14} className="text-muted" />
                </div>
              </Link>
            ))
          ) : (
            <div className="px-5 py-8 text-center text-sm text-muted">
              <GraduationCap size={20} className="mx-auto mb-1 opacity-50" />
              <p>Belum ada kegiatan yang ditugaskan</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page Component ───

export default function DashboardPage() {
  const { user, isActivityScoped } = useAuth();
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [chartTab, setChartTab] = useState<'dues' | 'growth'>('dues');
  const [growthData, setGrowthData] = useState<
    Array<{ month: string; count: number; total: number; label: string }>
  >([]);
  const [growthLoading, setGrowthLoading] = useState(false);

  const fetchDashboard = useCallback(
    () =>
      apiClient.get('/reports/dashboard').then(({ data }) => {
        setLastUpdated(new Date());
        return data.data as DashboardData;
      }),
    [],
  );

  const { data, loading, error, refetch } = useApi<DashboardData>(fetchDashboard, []);

  const fetchGrowthData = useCallback(async () => {
    setGrowthLoading(true);
    try {
      const res = await apiClient.get('/reports/chart/members-over-time');
      const raw = (res.data?.data || res.data || []) as Array<{ month: string; count: number }>;
      let cumulative = 0;
      const formatted = raw.map((item) => {
        cumulative += item.count;
        const [year, month] = item.month.split('-');
        const monthNames = [
          'Jan',
          'Feb',
          'Mar',
          'Apr',
          'Mei',
          'Jun',
          'Jul',
          'Agu',
          'Sep',
          'Okt',
          'Nov',
          'Des',
        ];
        const mIndex = parseInt(month, 10) - 1;
        const label = `${monthNames[mIndex] || month} '${year ? year.slice(2) : ''}`;
        return {
          ...item,
          total: cumulative,
          label,
        };
      });
      setGrowthData(formatted);
    } catch {
      setGrowthData([]);
    } finally {
      setGrowthLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isActivityScoped) {
      fetchGrowthData();
    }
  }, [isActivityScoped, fetchGrowthData]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      refetch();
      fetchGrowthData();
    }, 60000);
    return () => clearInterval(interval);
  }, [autoRefresh, refetch, fetchGrowthData]);

  // Activity-scoped roles get their own dashboard (AFTER all hooks)
  if (isActivityScoped) {
    return <ActivityScopedDashboard />;
  }

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError message={error} onRetry={refetch} />;
  if (!data) return null;

  const pieData = (data.memberStatus || []).map((s) => ({
    name: STATUS_LABELS[s.status] || s.status,
    value: s.count,
    color: STATUS_COLORS[s.status] || '#6b7280',
  }));

  const totalEmailSent = data.emailSummary
    ? data.emailSummary.totalSent + data.emailSummary.totalFailed + data.emailSummary.totalSkipped
    : 0;

  return (
    <div className="space-y-5">
      {/* ── 1. HEADER (Command Center) ── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          {/* Breadcrumbs di atas judul sesuai pola PageHeader */}
          <Breadcrumbs />
          <div className="flex items-center gap-2.5 mt-2">
            <span className="p-2 rounded-xl bg-primary-container text-primary-700">
              <TrendingUp size={20} aria-hidden="true" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-text">
                Organizational Command Center
              </h1>
              <GloriaGreeting />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {lastUpdated && (
            <span className="text-xs text-muted hidden sm:block">
              Terakhir:{' '}
              {lastUpdated.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            aria-pressed={autoRefresh}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
              autoRefresh
                ? 'bg-success-50 text-success-700'
                : 'bg-surface-variant text-muted'
            }`}
          >
            {autoRefresh ? '🔄 Auto' : '⏸ Manual'}
          </button>
          <button
            onClick={refetch}
            className="p-2 rounded-lg text-muted hover:bg-surface-variant hover:text-primary transition"
            title="Refresh data"
            aria-label="Refresh data"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* ── 2. WELCOME SECTION (status snapshot, bukan sekadar sapaan) ── */}
      <div className="relative overflow-hidden rounded-xl bg-secondary text-white px-5 py-5 sm:px-6">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-primary/25 blur-3xl"
        />
        <div className="relative flex flex-wrap items-center justify-between gap-x-8 gap-y-3">
          <div className="min-w-0">
            <p className="text-sm text-secondary-100/80">Selamat datang kembali,</p>
            <p className="text-lg font-bold truncate">
              {user?.namaLengkap || 'Anggota THS-THM'}
            </p>
            <p className="mt-0.5 text-xs text-primary-100/80">
              {user?.email || 'Sistem Informasi Manajemen THS-THM'}
            </p>
          </div>
          {user?.role && (
            <div className="shrink-0">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-white/15 text-white backdrop-blur-sm border border-white/20">
                {user.role.replace('_', ' ').toUpperCase()}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── 3. PRIMARY KPI — 4 kartu hero ── */}
      <section aria-label="Indikator utama">
        <h2 className="sr-only">Indikator Utama</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {statConfigs.map(({ key, label, icon: Icon, color, isCurrency, href }) => {
            const styles = colorMap[color];
            const rawValue = data[key as keyof DashboardData];
            const rawNumber = Number(rawValue) || 0;
            const displayValue = isCurrency
              ? formatRupiah(rawNumber)
              : rawNumber.toLocaleString('id-ID');
            return (
              <Link
                key={key}
                href={href}
                className="card-elegant p-5 group hover:border-primary-300 transition-all duration-200"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                      {label}
                    </p>
                    <p className="text-[28px] leading-8 font-bold text-text mt-1.5 truncate">
                      {displayValue}
                    </p>
                  </div>
                  <div
                    className={`p-3 rounded-xl ring-1 shrink-0 ${styles.ring} ${styles.bg} group-hover:scale-105 transition-transform`}
                  >
                    <Icon size={22} className={styles.icon} aria-hidden="true" />
                  </div>
                </div>
                <p className="mt-2 text-xs font-medium text-primary group-hover:underline">
                  Lihat detail →
                </p>
              </Link>
            );
          })}
        </div>
      </section>

            {/* ── 4. PERLU TINDAKAN — hanya dari data nyata API ── */}
      <ActionPanel data={data} />

      {/* ── 8 secondary statistics — strip kompak, tidak ada yang dihapus ── */}
      <section aria-label="Statistik lainnya">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-sm font-semibold text-text">Statistik Lainnya</h2>
          <span className="text-2xs text-muted">Seluruh indikator tetap tersedia</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {secondaryStats.map(({ key, label, icon: Icon, accent, href }) => {
            const styles = ACCENT_CLASSES[accent];
            const rawNumber = Number(data[key as keyof DashboardData]) || 0;
            return (
              <Link
                key={key}
                href={href}
                className="card-elegant relative overflow-hidden p-3.5 group"
              >
                <span
                  aria-hidden="true"
                  className={`absolute left-0 top-0 h-full w-1 ${styles.bar}`}
                />
                <div className="flex items-center gap-2.5 pl-1.5">
                  <span className={`p-1.5 rounded-lg shrink-0 ${styles.icon}`}>
                    <Icon size={15} aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-base font-bold text-text leading-5 truncate">
                      {rawNumber.toLocaleString('id-ID')}
                    </p>
                    <p className="text-[11px] text-muted truncate">{label}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── 5. CHARTS — Iuran Bulanan / Pertumbuhan Anggota + Status Keanggotaan ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main Chart Card with Tab Switcher */}
        <div className="lg:col-span-2 card-elegant p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-1.5 p-1 bg-surface-variant rounded-lg w-fit">
                <button
                  type="button"
                  onClick={() => setChartTab('dues')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                    chartTab === 'dues'
                      ? 'bg-surface text-primary shadow-elegant-sm'
                      : 'text-muted hover:text-text'
                  }`}
                >
                  Iuran 6 Bulan
                </button>
                <button
                  type="button"
                  onClick={() => setChartTab('growth')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                    chartTab === 'growth'
                      ? 'bg-surface text-primary shadow-elegant-sm'
                      : 'text-muted hover:text-text'
                  }`}
                >
                  Pertumbuhan Anggota
                </button>
              </div>
              <p className="text-xs text-muted mt-1.5">
                {chartTab === 'dues'
                  ? 'Total iuran terkumpul per bulan'
                  : 'Tren anggota baru dan total akumulasi'}
              </p>
            </div>
            <Link
              href={chartTab === 'dues' ? '/dues' : '/reports'}
              className="text-xs text-primary hover:underline flex items-center gap-0.5"
            >
              Detail <ChevronRight size={12} />
            </Link>
          </div>
          {chartTab === 'dues' ? (
            data.monthlyDues && data.monthlyDues.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.monthlyDues} margin={{ top: 5, right: 12, left: 12, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid, #e5e7eb)" />
                <XAxis
                  dataKey="bulan"
                  tick={{ fontSize: 11, fill: 'var(--chart-tick, #6b7280)' }}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--chart-grid, #e5e7eb)' }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'var(--chart-tick, #6b7280)' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => formatRupiah(v)}
                />
                <Tooltip
                  formatter={(value: number) => [`Rp ${value.toLocaleString('id-ID')}`, 'Jumlah']}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid var(--tooltip-border)',
                    background: 'var(--tooltip-bg)',
                    color: 'var(--tooltip-color)',
                    boxShadow: 'var(--tooltip-shadow)',
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={28}
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => (
                    <span className="text-xs text-muted">{value}</span>
                  )}
                />
                <Bar
                  name="Iuran Terkumpul"
                  dataKey="jumlah"
                  fill="var(--primary, #072AC8)"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-56 text-sm text-muted">
              Belum ada data iuran
            </div>
          )
        ) : growthLoading ? (
          <ChartSkeleton height={240} />
        ) : growthData.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={growthData} margin={{ top: 5, right: 12, left: 12, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid, #e5e7eb)" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: 'var(--chart-tick, #6b7280)' }}
                tickLine={false}
                axisLine={{ stroke: 'var(--chart-grid, #e5e7eb)' }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'var(--chart-tick, #6b7280)' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => Number(v).toLocaleString('id-ID')}
              />
              <Tooltip
                formatter={(value: number, name: string) => [
                  `${value.toLocaleString('id-ID')} Anggota`,
                  name,
                ]}
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid var(--tooltip-border)',
                  background: 'var(--tooltip-bg)',
                  color: 'var(--tooltip-color)',
                  boxShadow: 'var(--tooltip-shadow)',
                }}
              />
              <Legend
                verticalAlign="bottom"
                height={28}
                iconType="circle"
                iconSize={8}
                formatter={(value) => (
                  <span className="text-xs text-muted">{value}</span>
                )}
              />
              <Line
                type="monotone"
                name="Anggota Baru"
                dataKey="count"
                stroke="var(--primary, #072AC8)"
                strokeWidth={2}
                dot={{ r: 3, fill: 'var(--primary, #072AC8)' }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                name="Total Kumulatif"
                dataKey="total"
                stroke="var(--success, #1B7F4B)"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-56 text-sm text-muted">
            Belum ada data pertumbuhan anggota
          </div>
        )}
        </div>

        {/* Right column - stacked */}
        <div className="space-y-6">
          {/* 5b. Status Keanggotaan (dari data.memberStatus API, tanpa persentase karangan) */}
          <div className="card-elegant p-5 sm:p-6">
            <div className="mb-3">
              <h3 className="text-base font-semibold text-text">
                Status Keanggotaan
              </h3>
              <p className="text-xs text-muted mt-0.5">
                Distribusi status anggota
              </p>
            </div>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={210}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="45%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} stroke="var(--surface, #fff)" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [value.toLocaleString('id-ID'), 'Anggota']}
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid var(--tooltip-border)',
                      background: 'var(--tooltip-bg)',
                      color: 'var(--tooltip-color)',
                      boxShadow: 'var(--tooltip-shadow)',
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={30}
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => (
                      <span className="text-xs text-muted">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-48 text-sm text-muted">
                Belum ada data
              </div>
            )}
          </div>

          {/* Email Summary (data.emailSummary dari API bila tersedia) */}
          {data.emailSummary && (
            <div className="card-elegant p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-text flex items-center gap-1.5">
                  <Mail size={15} className="text-primary" aria-hidden="true" />
                  Email Summary
                </h3>
                <Link
                  href="/settings/email"
                  className="text-xs text-primary hover:underline flex items-center gap-0.5"
                >
                  Kelola <ExternalLink size={10} />
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-success-50 dark:bg-success-950 rounded-lg p-2.5 text-center">
                  <p className="text-lg font-bold text-success-600">
                    {data.emailSummary.totalSent.toLocaleString('id-ID')}
                  </p>
                  <p className="text-2xs text-success-600 dark:text-success-400">Terkirim</p>
                </div>
                <div className="bg-error-50 dark:bg-error-950 rounded-lg p-2.5 text-center">
                  <p className="text-lg font-bold text-error-600">
                    {data.emailSummary.totalFailed.toLocaleString('id-ID')}
                  </p>
                  <p className="text-2xs text-error-600 dark:text-error-400">Gagal</p>
                </div>
                <div className="bg-warning-50 dark:bg-warning-950 rounded-lg p-2.5 text-center">
                  <p className="text-lg font-bold text-warning-600">
                    {data.emailSummary.totalSkipped.toLocaleString('id-ID')}
                  </p>
                  <p className="text-2xs text-warning-600 dark:text-warning-400">Skip</p>
                </div>
                <div className="bg-surface-variant rounded-lg p-2.5 text-center">
                  <p className="text-lg font-bold text-muted">
                    {data.emailSummary.totalSuppressed.toLocaleString('id-ID')}
                  </p>
                  <p className="text-2xs text-muted">Supresi</p>
                </div>
              </div>
              {totalEmailSent > 0 && (
                <p className="text-xs text-muted mt-2 text-center">
                  {Math.round((data.emailSummary.totalSent / totalEmailSent) * 100)}% success rate
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── 6. Aktivitas Terbaru (data.recentNotifications bila tersedia) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent Activity */}
        <div className="lg:col-span-2 card-elegant">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text flex items-center gap-1.5">
              <Activity size={15} className="text-primary" aria-hidden="true" />
              Aktivitas Terbaru
            </h3>
            <Link
              href="/notifications"
              className="text-xs text-primary hover:underline flex items-center gap-0.5"
            >
              Lihat semua <ChevronRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-border max-h-72 overflow-y-auto">
            {data.recentNotifications && data.recentNotifications.length > 0 ? (
              data.recentNotifications.map((n) => (
                <div
                  key={n.id}
                  className="px-5 py-3 hover:bg-surface-variant transition"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-1.5 rounded-lg flex-shrink-0 mt-0.5 ${
                        n.isRead ? 'bg-surface-variant' : 'bg-primary-container'
                      }`}
                    >
                      <Bell size={14} className={n.isRead ? 'text-muted' : 'text-primary'} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-xs ${n.isRead ? 'text-muted' : 'text-text font-medium'}`}
                      >
                        {n.judul}
                      </p>
                      <p className="text-xs text-muted mt-0.5 truncate">
                        {n.isi}
                      </p>
                      <p className="text-2xs text-muted mt-0.5">
                        {formatTime(n.createdAt)}
                      </p>
                    </div>
                    {!n.isRead && (
                      <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="px-5 py-8 text-center text-sm text-muted">
                <Bell size={20} className="mx-auto mb-1 opacity-50" aria-hidden="true" />
                <p>Belum ada aktivitas</p>
              </div>
            )}
          </div>
        </div>

        {/* 7. Quick Actions (fungsi existing dari quickActions — href tidak diubah) */}
        <div className="card-elegant p-5">
          <h3 className="text-sm font-semibold text-text flex items-center gap-1.5 mb-3">
            <Activity size={15} className="text-primary" aria-hidden="true" />
            Aksi Cepat
          </h3>
          <div className="space-y-2">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Can key={action.href} module={action.module} action={action.action}>
                  <Link
                    href={action.href}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-surface-variant transition group"
                  >
                    <div className="p-2 rounded-lg bg-primary-container group-hover:scale-105 transition-transform">
                      <Icon size={16} className="text-primary" aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text">
                        {action.label}
                      </p>
                      <p className="text-xs text-muted truncate">
                        {action.desc}
                      </p>
                    </div>
                    <ChevronRight
                      size={14}
                      className="text-muted group-hover:text-primary transition"
                    />
                  </Link>
                </Can>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
