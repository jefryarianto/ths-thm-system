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
  quickActions,
  formatRupiah,
  formatTime,
} from '@/components/dashboard/constants';

function DashboardError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex items-center justify-center h-64">
      <Breadcrumbs />
      <div className="text-center">
        <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-3" />
        <p className="text-red-600 font-medium">{message}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Periksa koneksi ke server API
        </p>
        <button
          onClick={onRetry}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition"
        >
          Coba Lagi
        </button>
      </div>
    </div>
  );
}

// ─── Page Component ───

export default function DashboardPage() {
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
              Terakhir:{' '}
              {lastUpdated.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
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
            onClick={refetch}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-400 hover:text-blue-600"
            title="Refresh data"
          >
            <RefreshCw size={16} />
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
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {displayValue}
                  </p>
                </div>
                <div
                  className={`p-3 rounded-xl ring-1 ${styles.ring} ${styles.bg} group-hover:scale-105 transition-transform`}
                >
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
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                Iuran 6 Bulan Terakhir
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Total iuran terkumpul per bulan
              </p>
            </div>
            <Link
              href="/dues"
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
            >
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
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid var(--tooltip-border)',
                    background: 'var(--tooltip-bg)',
                    color: 'var(--tooltip-color)',
                    boxShadow: 'var(--tooltip-shadow)',
                  }}
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
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                Status Keanggotaan
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Distribusi status anggota
              </p>
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
                      <span className="text-xs text-gray-600 dark:text-gray-400">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
                Belum ada data
              </div>
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
                <Link
                  href="/settings/email"
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
                >
                  Kelola <ExternalLink size={10} />
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-green-50 dark:bg-green-950 rounded-lg p-2.5 text-center">
                  <p className="text-lg font-bold text-green-600">
                    {data.emailSummary.totalSent.toLocaleString('id-ID')}
                  </p>
                  <p className="text-[10px] text-green-600 dark:text-green-400">Terkirim</p>
                </div>
                <div className="bg-red-50 dark:bg-red-950 rounded-lg p-2.5 text-center">
                  <p className="text-lg font-bold text-red-600">
                    {data.emailSummary.totalFailed.toLocaleString('id-ID')}
                  </p>
                  <p className="text-[10px] text-red-600 dark:text-red-400">Gagal</p>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-950 rounded-lg p-2.5 text-center">
                  <p className="text-lg font-bold text-yellow-600">
                    {data.emailSummary.totalSkipped.toLocaleString('id-ID')}
                  </p>
                  <p className="text-[10px] text-yellow-600 dark:text-yellow-400">Skip</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2.5 text-center">
                  <p className="text-lg font-bold text-gray-600 dark:text-gray-300">
                    {data.emailSummary.totalSuppressed.toLocaleString('id-ID')}
                  </p>
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
            <Link
              href="/notifications"
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
            >
              Lihat semua <ChevronRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-72 overflow-y-auto">
            {data.recentNotifications && data.recentNotifications.length > 0 ? (
              data.recentNotifications.map((n) => (
                <div
                  key={n.id}
                  className="px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-1.5 rounded-lg flex-shrink-0 mt-0.5 ${
                        n.isRead ? 'bg-gray-100 dark:bg-gray-700' : 'bg-blue-50 dark:bg-blue-950'
                      }`}
                    >
                      <Bell size={14} className={n.isRead ? 'text-gray-400' : 'text-blue-500'} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-xs ${n.isRead ? 'text-gray-600 dark:text-gray-400' : 'text-gray-900 dark:text-white font-medium'}`}
                      >
                        {n.judul}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                        {n.isi}
                      </p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-600 mt-0.5">
                        {formatTime(n.createdAt)}
                      </p>
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
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition group"
                >
                  <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950 group-hover:scale-105 transition-transform">
                    <Icon size={16} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {action.label}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                      {action.desc}
                    </p>
                  </div>
                  <ChevronRight
                    size={14}
                    className="text-gray-300 dark:text-gray-600 group-hover:text-blue-500 transition"
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
