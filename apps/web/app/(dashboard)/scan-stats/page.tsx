'use client';

import { useState } from 'react';
import apiClient from '@/lib/api-client';
import { useApi } from '@/lib/hooks/use-api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import {
  BarChart3, CheckCircle, FileText, Activity, Download,
  Search, X,
} from 'lucide-react';

interface ScanStats {
  totalAbsensi: number;
  totalDokumen: number;
  activeKegiatan: number;
  absensiHarian: Array<{ tanggal: string; count: number }>;
  recentAbsensi: Array<{
    namaAnggota: string;
    nomorAnggota: string;
    kegiatan: string;
    hadir: boolean;
    catatan?: string;
    tanggal: string;
  }>;
}

export default function ScanStatsPage() {
  const [exporting, setExporting] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRangeStart, setDateRangeStart] = useState('');
  const [dateRangeEnd, setDateRangeEnd] = useState('');
  const [filterHadir, setFilterHadir] = useState('');

  const { data: stats, loading, refetch: fetchData } = useApi<ScanStats>(
    () => apiClient.get('/reports/scan-stats').then(r => r.data.data),
    []
  );

  // Filter recent absensi
  const filteredAbsensi = stats?.recentAbsensi?.filter((a) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!a.namaAnggota?.toLowerCase().includes(q) && !a.nomorAnggota?.toLowerCase().includes(q) && !a.kegiatan?.toLowerCase().includes(q)) return false;
    }
    if (filterHadir === 'hadir' && !a.hadir) return false;
    if (filterHadir === 'absen' && a.hadir) return false;
    return true;
  }) || [];

  // Filter chart data by date range
  const filteredChart = stats?.absensiHarian?.filter((d) => {
    if (dateRangeStart && d.tanggal < dateRangeStart) return false;
    if (dateRangeEnd && d.tanggal > dateRangeEnd) return false;
    return true;
  }) || [];

  const handleExportCSV = () => {
    if (!filteredAbsensi.length) return;
    setExporting(true);
    try {
      const headers = ['Nama', 'No. Anggota', 'Kegiatan', 'Status', 'Catatan', 'Tanggal'];
      const rows = filteredAbsensi.map((a) => [
        `"${(a.namaAnggota || '').replace(/"/g, '""')}"`,
        a.nomorAnggota || '',
        `"${(a.kegiatan || '').replace(/"/g, '""')}"`,
        a.hadir ? 'Hadir' : 'Absen',
        `"${(a.catatan || '-').replace(/"/g, '""')}"`,
        new Date(a.tanggal).toLocaleString('id-ID'),
      ]);
      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `absensi-scan-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch { /* ignore */ }
    setExporting(false);
  };

  const resetFilters = () => {
    setSearchQuery('');
    setDateRangeStart('');
    setDateRangeEnd('');
    setFilterHadir('');
  };

  const statCards = stats ? [
    { label: 'Total Absensi', value: stats.totalAbsensi, icon: CheckCircle, color: 'bg-blue-50 dark:bg-blue-950', iconColor: 'text-blue-600 dark:text-blue-400' },
    { label: 'Dokumen Terverifikasi', value: stats.totalDokumen, icon: FileText, color: 'bg-green-50 dark:bg-green-950', iconColor: 'text-green-600 dark:text-green-400' },
    { label: 'Kegiatan Aktif', value: stats.activeKegiatan, icon: Activity, color: 'bg-orange-50 dark:bg-orange-950', iconColor: 'text-orange-600 dark:text-orange-400' },
    { label: 'Absensi 30 Hari', value: filteredChart.reduce((s, d) => s + d.count, 0), icon: BarChart3, color: 'bg-purple-50 dark:bg-purple-950', iconColor: 'text-purple-600 dark:text-purple-400' },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Statistik Scan</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Statistik scan QR, absensi, dan verifikasi dokumen</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            disabled={exporting || !filteredAbsensi.length}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition disabled:opacity-50"
          >
            <Download size={14} /> {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
          <button
            onClick={() => { fetchData(); resetFilters(); }}
            disabled={loading}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition disabled:opacity-50"
          >
            {loading ? 'Memuat...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      {(loading && !stats) ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-3" />
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16" />
            </div>
          ))}
        </div>
      ) : stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((s) => (
            <div key={s.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 flex items-center gap-3">
              <div className={`p-2.5 rounded-lg ${s.color}`}>
                <s.icon size={18} className={s.iconColor} />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{s.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Absensi Harian Chart */}
      {stats?.absensiHarian && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Absensi 30 Hari Terakhir</h2>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateRangeStart}
                onChange={e => setDateRangeStart(e.target.value)}
                className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <span className="text-xs text-gray-400">–</span>
              <input
                type="date"
                value={dateRangeEnd}
                onChange={e => setDateRangeEnd(e.target.value)}
                className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
          {filteredChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={filteredChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis
                  dataKey="tanggal"
                  tickFormatter={(v: string) => {
                    const d = new Date(v);
                    return `${d.getDate()}/${d.getMonth() + 1}`;
                  }}
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} allowDecimals={false} />
                <Tooltip
                  labelFormatter={(v: string) => new Date(v).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  formatter={(value: number) => [`${value} scan`, 'Absensi']}
                />
                <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-sm text-gray-400 dark:text-gray-500">
              {dateRangeStart || dateRangeEnd ? 'Tidak ada data pada rentang tanggal ini' : 'Belum ada data absensi'}
            </div>
          )}
        </div>
      )}

      {/* Recent Absensi */}
      {stats?.recentAbsensi && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Absensi Terbaru</h2>
              <span className="text-xs text-gray-400">{filteredAbsensi.length} dari {stats.recentAbsensi.length}</span>
            </div>
            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-2 mt-3">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Cari anggota, kegiatan..."
                  className="w-full pl-8 pr-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <select
                value={filterHadir}
                onChange={e => setFilterHadir(e.target.value)}
                className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Semua Status</option>
                <option value="hadir">Hadir</option>
                <option value="absen">Absen</option>
              </select>
              {(searchQuery || filterHadir) && (
                <button
                  onClick={() => { setSearchQuery(''); setFilterHadir(''); }}
                  className="flex items-center gap-1 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <X size={12} /> Reset
                </button>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Anggota</th>
                  <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Kegiatan</th>
                  <th className="text-center px-5 py-2.5 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase hidden md:table-cell">Catatan</th>
                  <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase hidden sm:table-cell">Tanggal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredAbsensi.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-8 text-sm text-gray-400 dark:text-gray-500">
                    {searchQuery || filterHadir ? 'Tidak ada absensi yang cocok dengan filter' : 'Belum ada data'}
                  </td></tr>
                ) : (
                  filteredAbsensi.map((a, i) => (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                      <td className="px-5 py-3">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{a.namaAnggota}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">{a.nomorAnggota}</p>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-700 dark:text-gray-300">{a.kegiatan}</td>
                      <td className="px-5 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          a.hadir ? 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400'
                        }`}>
                          {a.hadir ? 'Hadir' : 'Absen'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400 max-w-[200px] truncate hidden md:table-cell">{a.catatan || '-'}</td>
                      <td className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400 hidden sm:table-cell">
                        {new Date(a.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
