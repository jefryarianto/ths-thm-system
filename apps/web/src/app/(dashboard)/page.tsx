'use client';

import { useEffect, useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import {
  Users, UserPlus, GraduationCap, CreditCard,
  AlertCircle, TrendingUp, Calendar, Dumbbell,
  ClipboardCheck, FileText, Bell, Mail, Activity,
  RefreshCw, Shield, ExternalLink, ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';

interface DashboardData {
  totalMembers: number;
  totalCandidates: number;
  totalGraduated: number;
  totalDuesCollected: number;
  pendingValidasi: number;
  incompleteData: number;
  totalKegiatan: number;
  totalLatihan: number;
  totalKlaim: number;
  totalDokumen: number;
  totalPendaftaran: number;
  totalUsers: number;
  memberStatus: Array<{ status: string; count: number }>;
  monthlyDues: Array<{ bulan: string; jumlah: number; transaksi: number }>;
  recentNotifications: Array<{
    id: string; judul: string; isi: string; tipe: string;
    isRead: boolean; createdAt: string;
  }>;
  emailSummary: {
    totalSent: number; totalFailed: number;
    totalSkipped: number; totalSuppressed: number;
  } | null;
}

const STATUS_COLORS: Record<string, string> = {
  aktif: '#22c55e',
  nonaktif: '#eab308',
  pindah: '#3b82f6',
  keluar: '#ef4444',
  meninggal: '#6b7280',
};

const STATUS_LABELS: Record<string, string> = {
  aktif: 'Aktif',
  nonaktif: 'Nonaktif',
  pindah: 'Pindah',
  keluar: 'Keluar',
  meninggal: 'Meninggal',
};

function formatRupiah(value: number) {
  if (value >= 1_000_000) return `Rp ${(value / 1_000_000).toFixed(1)}jt`;
  if (value >= 1_000) return `Rp ${(value / 1_000).toFixed(0)}rb`;
  return `Rp ${value.toLocaleString('id-ID')}`;
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Baru saja';
  if (mins < 60) return `${mins}m lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}j lalu`;
  const days = Math.floor(hours / 24);
  return `${days}h lalu`;
}

// ─── Stat Config ───

const statConfigs = [
  { key: 'totalMembers', label: 'Total Anggota', icon: Users, color: 'blue' as const, href: '/members' },
  { key: 'totalCandidates', label: 'Calon Anggota', icon: UserPlus, color: 'purple' as const, href: '/candidates' },
  { key: 'totalGraduated', label: 'Lulus Pendadaran', icon: GraduationCap, color: 'green' as const, href: '/graduations' },
  { key: 'totalDuesCollected', label: 'Iuran Terkumpul', icon: CreditCard, color: 'yellow' as const, isCurrency: true, href: '/dues' },
  { key: 'pendingValidasi', label: 'Menunggu Validasi', icon: AlertCircle, color: 'orange' as const, href: '/members' },
  { key: 'incompleteData', label: 'Data Tidak Lengkap', icon: AlertCircle, color: 'red' as const, href: '/members' },
  { key: 'totalKegiatan', label: 'Kegiatan Aktif', icon: Calendar, color: 'indigo' as const, href: '/activities' },
  { key: 'totalLatihan', label: 'Total Latihan', icon: Dumbbell, color: 'teal' as const, href: '/trainings' },
  { key: 'totalKlaim', label: 'Klaim Diproses', icon: ClipboardCheck, color: 'pink' as const, href: '/claims' },
  { key: 'totalDokumen', label: 'Dokumen Tersedia', icon: FileText, color: 'cyan' as const, href: '/documents' },
  { key: 'totalPendaftaran', label: 'Pendaftaran Baru', icon: UserPlus, color: 'amber' as const, href: '/registrations' },
  { key: 'totalUsers', label: 'Total Pengguna', icon: Shield, color: 'slate' as const, href: '/users' },
];

const colorMap: Record<string, { bg: string; icon: string; ring: string }> = {
  blue: { bg: 'bg-blue-50 dark:bg-blue-950', icon: 'text-blue-600 dark:text-blue-400', ring: 'ring-blue-100 dark:ring-blue-800' },
  green: { bg: 'bg-green-50 dark:bg-green-950', icon: 'text-green-600 dark:text-green-400', ring: 'ring-green-100 dark:ring-green-800' },
  yellow: { bg: 'bg-yellow-50 dark:bg-yellow-950', icon: 'text-yellow-600 dark:text-yellow-400', ring: 'ring-yellow-100 dark:ring-yellow-800' },
  orange: { bg: 'bg-orange-50 dark:bg-orange-950', icon: 'text-orange-600 dark:text-orange-400', ring: 'ring-orange-100 dark:ring-orange-800' },
  red: { bg: 'bg-red-50 dark:bg-red-950', icon: 'text-red-600 dark:text-red-400', ring: 'ring-red-100 dark:ring-red-800' },
  purple: { bg: 'bg-purple-50 dark:bg-purple-950', icon: 'text-purple-600 dark:text-purple-400', ring: 'ring-purple-100 dark:ring-purple-800' },
  indigo: { bg: 'bg-indigo-50 dark:bg-indigo-950', icon: 'text-indigo-600 dark:text-indigo-400', ring: 'ring-indigo-100 dark:ring-indigo-800' },
  teal: { bg: 'bg-teal-50 dark:bg-teal-950', icon: 'text-teal-600 dark:text-teal-400', ring: 'ring-teal-100 dark:ring-teal-800' },
  pink: { bg: 'bg-pink-50 dark:bg-pink-950', icon: 'text-pink-600 dark:text-pink-400', ring: 'ring-pink-100 dark:ring-pink-800' },
  cyan: { bg: 'bg-cyan-50 dark:bg-cyan-950', icon: 'text-cyan-600 dark:text-cyan-400', ring: 'ring-cyan-100 dark:ring-cyan-800' },
  amber: { bg: 'bg-amber-50 dark:bg-amber-950', icon: 'text-amber-600 dark:text-amber-400', ring: 'ring-amber-100 dark:ring-amber-800' },
  slate: { bg: 'bg-gray-50 dark:bg-gray-800', icon: 'text-gray-600 dark:text-gray-400', ring: 'ring-gray-100 dark:ring-gray-700' },
};

const quickActions = [
  { label: 'Tambah Anggota', href: '/members', icon: Users, desc: 'Input anggota baru' },
  { label: 'Buat Kegiatan', href: '/activities', icon: Calendar, desc: 'Jadwalkan kegiatan baru' },
  { label: 'Catat Iuran', href: '/dues', icon: CreditCard, desc: 'Input pembayaran iuran' },
  { label: 'Kirim Notifikasi', href: '/notifications', icon: Bell, desc: 'Kirim pengumuman' },
  { label: 'Email Admin', href: '/settings/email', icon: Mail, desc: 'Kelola pengiriman email' },
  { label: 'Laporan', href: '/reports', icon: TrendingUp, desc: 'Lihat laporan detail' },
];

// ─── Skeleton ───

function StatCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24" />
          <div className="h-7 bg-gray-200 dark:bg-gray-700 rounded w-16" />
        </div>
        <div className="h-12 w-12 bg-gray-200 dark:bg-gray-700 rounded-xl" />
      </div>
    </div>
  );
}

// ─── Page Component ───

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const { data: res } = await apiClient.get('/reports/dashboard');
      setData(res.data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error('Failed to fetch dashboard:', err);
      setError('Gagal memuat data dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 animate-pulse mb-1" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-64 animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 animate-pulse h-80" />
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 animate-pulse h-80" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-3" />
          <p className="text-red-600 font-medium">{error}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Periksa koneksi ke server API</p>
          <button
            onClick={fetchData}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

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
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <TrendingUp size={24} className="text-blue-600" />
            Dashboard
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Ringkasan data dan aktivitas sistem THS-THM
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:block">
              Terakhir: {lastUpdated.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
              autoRefresh
                ? 'bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
            }`}
          >
            {autoRefresh ? '🔄 Auto' : '⏸ Manual'}
          </button>
          <button
            onClick={fetchData}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-400 hover:text-blue-600"
            title="Refresh data"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {statConfigs.map(({ key, label, icon: Icon, color, isCurrency, href }) => {
          const styles = colorMap[color];
          const rawValue = data[key as keyof DashboardData];
          const rawNumber = Number(rawValue);
          const displayValue = isCurrency
            ? formatRupiah(rawNumber)
            : rawNumber.toLocaleString('id-ID');
          return (
            <Link
              key={key}
              href={href}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-200 group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{displayValue}</p>
                </div>
                <div className={`p-3 rounded-xl ring-1 ${styles.ring} ${styles.bg} group-hover:scale-105 transition-transform`}>
                  <Icon size={22} className={styles.icon} />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* ── Charts + Activity + Email + Quick Actions ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart - Monthly Dues */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Iuran 6 Bulan Terakhir</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Total iuran terkumpul per bulan</p>
            </div>
            <Link href="/dues" className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5">
              Detail <ChevronRight size={12} />
            </Link>
          </div>
          {data.monthlyDues && data.monthlyDues.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.monthlyDues} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="bulan"
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => formatRupiah(v)}
                />
                <Tooltip
                  formatter={(value: number) => [`Rp ${value.toLocaleString('id-ID')}`, 'Jumlah']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="jumlah" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400 dark:text-gray-500 text-sm">
              Belum ada data iuran
            </div>
          )}
        </div>

        {/* Right column - stacked */}
        <div className="space-y-6">
          {/* Pie Chart - Member Status */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
            <div className="mb-3">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Status Keanggotaan</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Distribusi status anggota</p>
            </div>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
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
                      <Cell key={index} fill={entry.color} stroke="white" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [value.toLocaleString('id-ID'), 'Anggota']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={30}
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => <span className="text-xs text-gray-600 dark:text-gray-400">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Belum ada data</div>
            )}
          </div>

          {/* Email Summary */}
          {data.emailSummary && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                  <Mail size={15} className="text-blue-500" />
                  Email Summary
                </h3>
                <Link href="/settings/email" className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5">
                  Kelola <ExternalLink size={10} />
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-green-50 dark:bg-green-950 rounded-lg p-2.5 text-center">
                  <p className="text-lg font-bold text-green-600">{data.emailSummary.totalSent.toLocaleString('id-ID')}</p>
                  <p className="text-[10px] text-green-600 dark:text-green-400">Terkirim</p>
                </div>
                <div className="bg-red-50 dark:bg-red-950 rounded-lg p-2.5 text-center">
                  <p className="text-lg font-bold text-red-600">{data.emailSummary.totalFailed.toLocaleString('id-ID')}</p>
                  <p className="text-[10px] text-red-600 dark:text-red-400">Gagal</p>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-950 rounded-lg p-2.5 text-center">
                  <p className="text-lg font-bold text-yellow-600">{data.emailSummary.totalSkipped.toLocaleString('id-ID')}</p>
                  <p className="text-[10px] text-yellow-600 dark:text-yellow-400">Skip</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2.5 text-center">
                  <p className="text-lg font-bold text-gray-600 dark:text-gray-300">{data.emailSummary.totalSuppressed.toLocaleString('id-ID')}</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">Supresi</p>
                </div>
              </div>
              {totalEmailSent > 0 && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 text-center">
                  {Math.round((data.emailSummary.totalSent / totalEmailSent) * 100)}% success rate
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom Row: Recent Activity + Quick Actions ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
              <Activity size={15} className="text-blue-500" />
              Aktivitas Terbaru
            </h3>
            <Link href="/notifications" className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5">
              Lihat semua <ChevronRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-72 overflow-y-auto">
            {data.recentNotifications && data.recentNotifications.length > 0 ? (
              data.recentNotifications.map((n) => (
                <div key={n.id} className="px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-750 transition">
                  <div className="flex items-start gap-3">
                    <div className={`p-1.5 rounded-lg flex-shrink-0 mt-0.5 ${
                      n.isRead ? 'bg-gray-100 dark:bg-gray-700' : 'bg-blue-50 dark:bg-blue-950'
                    }`}>
                      <Bell size={14} className={n.isRead ? 'text-gray-400' : 'text-blue-500'} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs ${n.isRead ? 'text-gray-600 dark:text-gray-400' : 'text-gray-900 dark:text-white font-medium'}`}>
                        {n.judul}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{n.isi}</p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-600 mt-0.5">{formatTime(n.createdAt)}</p>
                    </div>
                    {!n.isRead && (
                      <span className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0 mt-2" />
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="px-5 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
                <Bell size={20} className="mx-auto mb-1 opacity-50" />
                <p>Belum ada aktivitas</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5 mb-3">
            <Activity size={15} className="text-blue-500" />
            Aksi Cepat
          </h3>
          <div className="space-y-2">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-750 transition group"
                >
                  <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950 group-hover:scale-105 transition-transform">
                    <Icon size={16} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{action.label}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{action.desc}</p>
                  </div>
                  <ChevronRight size={14} className="text-gray-300 dark:text-gray-600 group-hover:text-blue-500 transition" />
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
