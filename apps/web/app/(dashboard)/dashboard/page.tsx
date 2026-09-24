'use client';

import { useState, useCallback, useEffect } from 'react';
import apiClient from '@/lib/api-client';
import { useApi } from '@/lib/hooks/use-api';
import {
  TrendingUp,
  RefreshCw,
  ChevronRight,
  Mail,
  ExternalLink,
  AlertCircle,
  Pause,
  BarChart3,
  MousePointerClick,
  GraduationCap,
  ClipboardCheck,
  CalendarCheck,
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
import ActionPanel from '@/components/dashboard/ActionPanel';
import KpiGrid from '@/components/dashboard/KpiGrid';
import SecondaryStats from '@/components/dashboard/SecondaryStats';
import QuickActions from '@/components/dashboard/QuickActions';
import SectionCard from '@/components/dashboard/SectionCard';
import ActivityFeed, {
  ActivityFeedHeader,
  type ActivityItem,
} from '@/components/dashboard/ActivityFeed';
import {
  type DashboardData,
  STATUS_COLORS,
  STATUS_LABELS,
  ROLE_LABELS,
  formatRupiah,
  formatCompactRupiah,
  formatTime,
} from '@/components/dashboard/constants';
import { useAuth } from '@/hooks/use-auth';
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

// ─── Activity-Scoped Dashboard (admin_kegiatan & penguji) ───

/**
 * Salam beranda: "Gloria, Selamat Datang, {nama}".
 * Menggunakan data `user` dari useAuth (sudah ada) — tidak ada lagi
 * panggilan API /members/me terpisah yang redundan.
 */
function GloriaGreeting({ className = '' }: { className?: string }) {
  const { user } = useAuth();
  return (
    <p className={`text-sm text-muted mt-1 ${className}`}>
      Gloria, Selamat Datang,{' '}
      <span className="font-medium text-text">
        {user?.namaLengkap || 'Anggota THS-THM'}
      </span>
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
              <GraduationCap size={22} className="text-success-700" />
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
              <CalendarCheck size={22} className="text-muted" />
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

  const unreadCount = (data.recentNotifications || []).filter((n) => !n.isRead).length;

  return (
    <div className="space-y-5">
      {/* ── 1. HEADER (Command Center) ── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-xl bg-primary-container text-primary-700 shrink-0">
            <TrendingUp size={20} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-text">Dashboard</h1>
            <GloriaGreeting />
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {lastUpdated && (
            <span className="text-xs text-muted">
              Terakhir:{' '}
              {lastUpdated.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            aria-pressed={autoRefresh}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
              autoRefresh
                ? 'bg-success-50 text-success-700'
                : 'bg-surface-variant text-muted'
            }`}
          >
            {autoRefresh ? (
              <RefreshCw size={12} aria-hidden="true" />
            ) : (
              <Pause size={12} aria-hidden="true" />
            )}
            {autoRefresh ? 'Auto' : 'Manual'}
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

      {/* ── 2. STATUS BAR — sapaan + scope aktif (mengganti welcome banner
            dekoratif & breadcrumbs yang redundan di halaman top-level) ── */}
      <div className="flex flex-wrap items-center gap-2.5">
        {user?.role && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-surface-variant text-text ring-1 ring-border">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
            {ROLE_LABELS[user.role] || user.role.replace('_', ' ')}
          </span>
        )}
        {user?.email && (
          <span className="text-xs text-muted truncate">{user.email}</span>
        )}
        <span className="ml-auto text-2xs text-muted">Sistem Informasi Manajemen THS-THM</span>
      </div>

      {/* ── 3. PERLU TINDAKAN — prioritas tertinggi, paling atas ── */}
      <ActionPanel
        values={{
          incompleteData: Number(data.incompleteData) || 0,
          pendingValidasi: Number(data.pendingValidasi) || 0,
          totalPendaftaran: Number(data.totalPendaftaran) || 0,
          totalKlaim: Number(data.totalKlaim) || 0,
        }}
      />

      {/* ── 4. PRIMARY KPI — 4 kartu hero ── */}
      <KpiGrid data={data} />

      {/* ── 5. CHARTS — Iuran Bulanan / Pertumbuhan Anggota + Status Keanggotaan ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main Chart Card with Tab Switcher */}
        <div className="lg:col-span-2 card-elegant p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <div
                role="tablist"
                aria-label="Periode grafik"
                className="flex items-center gap-1.5 p-1 bg-surface-variant rounded-lg w-fit"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={chartTab === 'dues'}
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
                  role="tab"
                  aria-selected={chartTab === 'growth'}
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
              <BarChart
                data={data.monthlyDues}
                margin={{ top: 5, right: 12, left: 4, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid, #e5e7eb)" />
                <XAxis
                  dataKey="bulan"
                  tick={{ fontSize: 11, fill: 'var(--chart-tick, #6b7280)' }}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--chart-grid, #e5e7eb)' }}
                />
                <YAxis
                  width={76}
                  tick={{ fontSize: 11, fill: 'var(--chart-tick, #6b7280)' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => formatCompactRupiah(v)}
                />
                <Tooltip
                  formatter={(value: number) => [formatRupiah(value), 'Iuran Terkumpul']}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid var(--tooltip-border)',
                    background: 'var(--tooltip-bg)',
                    color: 'var(--tooltip-color)',
                    boxShadow: 'var(--tooltip-shadow)',
                  }}
                />
                <Bar
                  name="Iuran Terkumpul"
                  dataKey="jumlah"
                  fill="var(--primary, #2563EB)"
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
            <LineChart
              data={growthData}
              margin={{ top: 5, right: 12, left: 12, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid, #e5e7eb)" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: 'var(--chart-tick, #6b7280)' }}
                tickLine={false}
                axisLine={{ stroke: 'var(--chart-grid, #e5e7eb)' }}
              />
              <YAxis
                width={48}
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
                stroke="var(--primary, #2563EB)"
                strokeWidth={2}
                dot={{ r: 3, fill: 'var(--primary, #2563EB)' }}
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
                    cy="50%"
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
        </div>
      </div>

      {/* ── 6. Aktivitas Terbaru + Quick Actions ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent Activity */}
        <div className="lg:col-span-2 card-elegant">
          <ActivityFeedHeader unread={unreadCount} />
          <div className="max-h-72 overflow-y-auto">
            <ActivityFeed items={(data.recentNotifications || []) as ActivityItem[]} />
          </div>
        </div>

        {/* 7. Quick Actions */}
        <div className="card-elegant">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="text-sm font-semibold text-text flex items-center gap-1.5">
              <MousePointerClick size={15} className="text-primary" aria-hidden="true" />
              Aksi Cepat
            </h3>
          </div>
          <QuickActions />
        </div>
      </div>

      {/* ── 7. OPERASIONAL — statistik sekunder & email audit (diciutkan
            secara default: informasi tersier, tidak boleh mendominasi) ── */}
      <SectionCard
        title="Operasional"
        icon={<BarChart3 size={15} aria-hidden="true" />}
        collapsible
        defaultCollapsed
        action={<span className="text-2xs text-muted">Detail &amp; audit</span>}
      >
        <div className="p-5 space-y-5">
          <div>
            <p className="text-2xs font-semibold uppercase tracking-wider text-muted mb-2">
              Statistik Lainnya
            </p>
            <SecondaryStats data={data} />
          </div>

          {data.emailSummary && (
            <div>
              <p className="text-2xs font-semibold uppercase tracking-wider text-muted mb-2">
                Ringkasan Email
              </p>
              <div className="card-elegant p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-text flex items-center gap-1.5">
                    <Mail size={14} className="text-primary" aria-hidden="true" />
                    Pengiriman Email
                  </h4>
                  <Link
                    href="/settings/email"
                    className="text-xs text-primary hover:underline flex items-center gap-0.5"
                  >
                    Kelola <ExternalLink size={10} />
                  </Link>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
