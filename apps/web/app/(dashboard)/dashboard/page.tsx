'use client';

import { useState, useCallback, useEffect } from 'react';
import apiClient from '@/lib/api-client';
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
  formatRupiah,
  formatTime,
} from '@/components/dashboard/constants';
import { useAuth } from '@/hooks/use-auth';
import Breadcrumbs from '@/components/ui/breadcrumbs';

// ── Design tokens untuk accent strip sekunder ─────────────────────
const ACCENT_CLASSES: Record<string, { icon: string; bar: string }> = {
  primary: { icon: 'bg-primary-container text-primary-700', bar: 'bg-primary' },
  success: { icon: 'bg-success-50 text-success-700', bar: 'bg-success' },
  warning: { icon: 'bg-warning-50 text-warning-700', bar: 'bg-warning' },
  error: { icon: 'bg-error-50 text-error-700', bar: 'bg-error' },
  info: { icon: 'bg-info-50 text-info-700', bar: 'bg-info' },
  slate: { icon: 'bg-surface-variant text-muted', bar: 'bg-border' },
};

function DashboardError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex items-center justify-center h-64">
      <Breadcrumbs />
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

// ─── Panel "Perlu Perhatian" — HANYA dari data nyata API ──────────
// Tidak ada kalkulasi karangan: panel ini murni meneruskan 3 angka
// (pendingValidasi, incompleteData, totalKlaim) yang disediakan backend.
// Jika semuanya 0 → empty state informatif, tanpa alarm berlebihan.
function AttentionPanel({
  pendingValidasi,
  incompleteData,
  totalKlaim,
}: {
  pendingValidasi: number;
  incompleteData: number;
  totalKlaim: number;
}) {
  const items = [
    {
      key: 'pending',
      label: 'Pending Validasi',
      value: pendingValidasi,
      href: '/members',
      chip: 'bg-warning-50 text-warning-700',
      icon: <AlertCircle size={16} aria-hidden="true" />,
      empty: 'Tidak ada antrean validasi.',
    },
    {
      key: 'incomplete',
      label: 'Data Tidak Lengkap',
      value: incompleteData,
      href: '/members/incomplete',
      chip: 'bg-error-50 text-error-700',
      icon: <AlertTriangle size={16} aria-hidden="true" />,
      empty: 'Seluruh data anggota lengkap.',
    },
    {
      key: 'klaim',
      label: 'Klaim Diproses',
      value: totalKlaim,
      href: '/claims',
      chip: 'bg-info-50 text-info-700',
      icon: <ClipboardCheck size={16} aria-hidden="true" />,
      empty: 'Tidak ada klaim menunggu.',
    },
  ];

  const total = pendingValidasi + incompleteData + totalKlaim;

  return (
    <section aria-label="Perlu perhatian" className="card-elegant p-5 sm:p-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-text flex items-center gap-1.5">
          <AlertTriangle size={15} className="text-warning-600" aria-hidden="true" />
          Perlu Perhatian
        </h2>
        <span className="text-2xs text-muted">
          {total > 0 ? `${total.toLocaleString('id-ID')} item menunggu` : 'Semua clear'}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {items.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className={`flex items-center gap-3 rounded-xl border p-3.5 transition ${
              item.value > 0
                ? 'border-border hover:border-warning-300 hover:shadow-elegant-md'
                : 'border-border bg-surface-variant/40'
            }`}
          >
            <span className={`p-2 rounded-lg shrink-0 ${item.chip}`}>{item.icon}</span>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted truncate">{item.label}</p>
              {item.value > 0 ? (
                <p className="text-xl font-bold text-text leading-6">
                  {item.value.toLocaleString('id-ID')}
                </p>
              ) : (
                <p className="text-xs text-success-600 font-medium mt-0.5">{item.empty}</p>
              )}
            </div>
            {item.value > 0 && (
              <ChevronRight size={16} className="text-muted shrink-0" aria-hidden="true" />
            )}
          </Link>
        ))}
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
  const { isActivityScoped } = useAuth();
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchDashboard = useCallback(
    () =>
      apiClient.get('/reports/dashboard').then(({ data }) => {
        setLastUpdated(new Date());
        return data.data as DashboardData;
      }),
    [],
  );

  const { data, loading, error, refetch } = useApi<DashboardData>(fetchDashboard, []);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(refetch, 60000);
    return () => clearInterval(interval);
  }, [autoRefresh, refetch]);

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
        <div className="relative flex flex-wrap items-center gap-x-8 gap-y-3">
          <div className="min-w-0">
            <p className="text-sm text-secondary-100/80">Selamat datang kembali,</p>
            <p className="text-lg font-bold truncate">
              {user?.namaLengkap || 'Anggota THS-THM'}
            </p>
            <p className="mt-0.5 font-mono text-xs text-primary-100">No. {nomorAnggota}</p>
          ) : null}
          {!nomorAnggota && (
            <p className="mt-0.5 text-xs text-primary-100/70">
              Data keanggotaan Anda akan tampil di sini setelah terhubung.
            </p>
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

      {/* ── 4. PERLU PERHATIAN — hanya dari data nyata API ── */}
      <AttentionPanel
        pendingValidasi={Number(data.pendingValidasi) || 0}
        incompleteData={Number(data.incompleteData) || 0}
        totalKlaim={Number(data.totalKlaim) || 0}
      />

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

      {/* ── 5. CHARTS — Iuran 6 bulan + Status Keanggotaan ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Bar Chart - Monthly Dues */}
        <div className="lg:col-span-2 card-elegant p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-text">
                Iuran 6 Bulan Terakhir
              </h3>
              <p className="text-xs text-muted mt-0.5">
                Total iuran terkumpul per bulan
              </p>
            </div>
            <Link
              href="/dues"
              className="text-xs text-primary hover:underline flex items-center gap-0.5"
            >
              Detail <ChevronRight size={12} />
            </Link>
          </div>
          {data.monthlyDues && data.monthlyDues.length > 0 ? (
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
                <Link
                  key={action.href}
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
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
