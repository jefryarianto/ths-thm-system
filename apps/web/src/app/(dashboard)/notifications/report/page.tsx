'use client';

import { useEffect, useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import {
  Download, Filter, Calendar, BarChart3, Bell, FileText,
} from 'lucide-react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

const TIPE_OPTIONS = [
  { value: '', label: 'Semua Tipe' },
  { value: 'umum', label: 'Umum' },
  { value: 'welcome', label: 'Selamat Datang' },
  { value: 'data_incomplete', label: 'Data Tidak Lengkap' },
  { value: 'reminder_latihan', label: 'Reminder Latihan' },
  { value: 'reminder_pendadaran', label: 'Reminder Pendadaran' },
  { value: 'reminder_iuran', label: 'Reminder Iuran' },
  { value: 'status_klaim', label: 'Status Klaim' },
  { value: 'dokumen_ready', label: 'Dokumen Ready' },
];

interface NotificationItem {
  id: string;
  judul: string;
  isi: string;
  tipe: string;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationReportPage() {
  const [data, setData] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterTipe, setFilterTipe] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [, setPage] = useState(1);
  const [, setMeta] = useState({ total: 0, totalPages: 0 });

  // Fetch stats from dedicated API endpoint
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: res } = await apiClient.get('/notifications/stats');
      const stats = res.data;

      // Build per-type stats from API response
      const byType = stats.byType || {};
      const statsByTypeArr = TIPE_OPTIONS.filter(t => t.value).map((tipe) => ({
        key: tipe.value,
        label: tipe.label,
        total: byType[tipe.value]?.total || 0,
        unread: byType[tipe.value]?.unread || 0,
      }));

      setStatsByType(statsByTypeArr);
      setTotalStats({ total: stats.total, unread: stats.unread, read: stats.read });

      // Still fetch paginated data for CSV export (respect filters)
      const listParams: Record<string, any> = { page: 1, limit: 50 };
      if (filterTipe) listParams.tipe = filterTipe;

      const { data: listRes } = await apiClient.get('/notifications', { params: listParams });
      const allData: NotificationItem[] = [...(listRes.data || [])];
      setMeta(listRes.meta || { total: 0, totalPages: 0 });

      const totalPages = listRes.meta?.totalPages || 1;
      if (totalPages > 1) {
        const promises = [];
        for (let p = 2; p <= totalPages; p++) {
          promises.push(
            apiClient.get('/notifications', { params: { ...listParams, page: p } })
              .then((r) => r.data?.data || [])
              .catch(() => [] as NotificationItem[])
          );
        }
        const remainingPages = await Promise.all(promises);
        for (const pageData of remainingPages) {
          allData.push(...pageData);
        }
      }

      // Apply date filter client-side
      const filtered = allData.filter((n) => {
        if (startDate && new Date(n.createdAt) < new Date(startDate)) return false;
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          if (new Date(n.createdAt) > end) return false;
        }
        return true;
      });

      setData(filtered);
    } catch {
      setError('Gagal memuat data notifikasi');
    }
    setLoading(false);
  }, [filterTipe, startDate, endDate]);

  useEffect(() => { fetchAllData(); }, [fetchAllData]);

  // Stats from API (computed from server-side aggregation)
  const [statsByType, setStatsByType] = useState<Array<{ key: string; label: string; total: number; unread: number }>>([]);
  const [totalStats, setTotalStats] = useState({ total: 0, unread: 0, read: 0 });

  const chartData = (statsByType.length > 0 ? statsByType : TIPE_OPTIONS.filter(t => t.value).map((tipe) => ({
    key: tipe.value,
    label: tipe.label,
    total: data.filter((n) => n.tipe === tipe.value).length,
    unread: data.filter((n) => n.tipe === tipe.value && !n.isRead).length,
  }))).map((s) => ({
    name: s.label,
    Total: s.total,
    BelumDibaca: s.unread,
  }));

  // CSV Export
  const handleExportCSV = () => {
    if (data.length === 0) return;
    setExporting(true);
    try {
      const headers = ['ID', 'Judul', 'Isi', 'Tipe', 'Dibaca', 'Tanggal'];
      const rows = data.map((n) => [
        n.id,
        JSON.stringify(n.judul || ''),
        JSON.stringify(n.isi || ''),
        n.tipe,
        n.isRead ? 'Ya' : 'Tidak',
        new Date(n.createdAt).toLocaleDateString('id-ID'),
      ]);
      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `laporan-notifikasi-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch { /* ignore */ }
    setExporting(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/notifications"
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-600 dark:text-gray-400"
        >
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText size={24} />
            Laporan Notifikasi
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Statistik dan ekspor data notifikasi
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter size={16} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
            <select
              value={filterTipe}
              onChange={(e) => { setFilterTipe(e.target.value); setPage(1); }}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              {TIPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Calendar size={16} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="flex-1 sm:flex-none px-3 py-1.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-gray-500 dark:text-gray-400 text-sm flex-shrink-0">s/d</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="flex-1 sm:flex-none px-3 py-1.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={fetchAllData}
              disabled={loading}
              className="flex-1 sm:flex-none px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? 'Memuat...' : 'Terapkan'}
            </button>
            {(filterTipe || startDate || endDate) && (
              <button
                onClick={() => { setFilterTipe(''); setStartDate(''); setEndDate(''); }}
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchAllData} className="text-red-700 dark:text-red-400 underline hover:no-underline text-xs">
            Coba lagi
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-3" />
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16" />
            </div>
          ))}
        </div>
      )}

      {!loading && (
        <>
          {/* Overview Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950">
                <Bell size={18} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Notifikasi</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{totalStats.total}</p>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-yellow-50 dark:bg-yellow-950">
                <Bell size={18} className="text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Belum Dibaca</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{totalStats.unread}</p>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-green-50 dark:bg-green-950">
                <BarChart3 size={18} className="text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Rata-rata per Hari</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {totalStats.total > 0
                    ? (totalStats.total / Math.max(1, Math.ceil(
                        (new Date(endDate || Date.now()).getTime() - new Date(startDate || Date.now() - 30 * 24 * 60 * 60 * 1000).getTime()) / (1000 * 60 * 60 * 24)
                      ))).toFixed(1)
                    : '0'}
                </p>
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Notifikasi per Tipe</h2>
            {chartData.some((d) => d.Total > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                  />
                  <Bar dataKey="Total" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={32} name="Total" />
                  <Bar dataKey="BelumDibaca" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={32} name="Belum Dibaca" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-48 text-gray-400 dark:text-gray-500 text-sm">
                Belum ada data notifikasi dengan filter ini
              </div>
            )}
          </div>

          {/* Stats Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Detail per Tipe</h2>
              <button
                onClick={handleExportCSV}
                disabled={exporting || data.length === 0}
                className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition disabled:opacity-50"
              >
                <Download size={14} />
                {exporting ? 'Exporting...' : 'Export CSV'}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Tipe</th>
                    <th className="text-center px-5 py-2.5 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total</th>
                    <th className="text-center px-5 py-2.5 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Belum Dibaca</th>
                    <th className="text-center px-5 py-2.5 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Sudah Dibaca</th>
                    <th className="text-center px-5 py-2.5 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">% Dibaca</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {(statsByType.length > 0 ? statsByType : TIPE_OPTIONS.filter(t => t.value).map((tipe) => ({
                    key: tipe.value,
                    label: tipe.label,
                    total: data.filter((n) => n.tipe === tipe.value).length,
                    unread: data.filter((n) => n.tipe === tipe.value && !n.isRead).length,
                  }))).map((s) => (
                    <tr key={s.key} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                      <td className="px-5 py-3 text-sm font-medium text-gray-900 dark:text-white">{s.label}</td>
                      <td className="px-5 py-3 text-center text-sm text-gray-700 dark:text-gray-300">{s.total}</td>
                      <td className="px-5 py-3 text-center text-sm text-gray-700 dark:text-gray-300">{s.unread}</td>
                      <td className="px-5 py-3 text-center text-sm text-gray-700 dark:text-gray-300">{s.total - s.unread}</td>
                      <td className="px-5 py-3 text-center text-sm text-gray-700 dark:text-gray-300">
                        {s.total > 0
                          ? `${Math.round(((s.total - s.unread) / s.total) * 100)}%`
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
