'use client';

import { useEffect, useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import {
  BarChart3, CheckCircle, FileText, Activity, Download,
} from 'lucide-react';

export default function ScanStatsPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await apiClient.get('/reports/scan-stats');
      setStats(res.data);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleExportCSV = () => {
    if (!stats?.recentAbsensi?.length) return;
    setExporting(true);
    try {
      const headers = ['Nama', 'No. Anggota', 'Kegiatan', 'Status', 'Catatan', 'Tanggal'];
      const rows = stats.recentAbsensi.map((a: any) => [
        `"${(a.namaAnggota || '').replace(/"/g, '""')}"`,
        a.nomorAnggota || '',
        `"${(a.kegiatan || '').replace(/"/g, '""')}"`,
        a.hadir ? 'Hadir' : 'Absen',
        `"${(a.catatan || '-').replace(/"/g, '""')}"`,
        new Date(a.tanggal).toLocaleString('id-ID'),
      ]);
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
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

  const statCards = stats ? [
    { label: 'Total Absensi', value: stats.totalAbsensi, icon: CheckCircle, color: 'bg-blue-50', iconColor: 'text-blue-600' },
    { label: 'Dokumen Terverifikasi', value: stats.totalDokumen, icon: FileText, color: 'bg-green-50', iconColor: 'text-green-600' },
    { label: 'Kegiatan Aktif', value: stats.activeKegiatan, icon: Activity, color: 'bg-orange-50', iconColor: 'text-orange-600' },
    { label: 'Absensi 30 Hari', value: stats.absensiHarian?.reduce((s: number, d: any) => s + d.count, 0) || 0, icon: BarChart3, color: 'bg-purple-50', iconColor: 'text-purple-600' },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Statistik Scan</h1>
          <p className="text-sm text-gray-500 mt-1">Statistik scan QR, absensi, dan verifikasi dokumen</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            disabled={exporting || !stats?.recentAbsensi?.length}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition disabled:opacity-50"
          >
            <Download size={14} /> {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
          <button
            onClick={fetchData}
            disabled={loading}
            className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition disabled:opacity-50"
          >
            {loading ? 'Memuat...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      {loading && !stats ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-24 mb-3" />
              <div className="h-8 bg-gray-200 rounded w-16" />
            </div>
          ))}
        </div>
      ) : stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
              <div className={`p-2.5 rounded-lg ${s.color}`}>
                <s.icon size={18} className={s.iconColor} />
              </div>
              <div>
                <p className="text-xs text-gray-500">{s.label}</p>
                <p className="text-lg font-bold text-gray-900">{s.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Absensi Harian Chart */}
      {stats?.absensiHarian && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Absensi 30 Hari Terakhir</h2>
          {stats.absensiHarian.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stats.absensiHarian}>
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
            <div className="h-48 flex items-center justify-center text-sm text-gray-400">Belum ada data absensi</div>
          )}
        </div>
      )}

      {/* Recent Absensi Table */}
      {stats?.recentAbsensi && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">Absensi Terbaru</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500 uppercase">Anggota</th>
                  <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500 uppercase">Kegiatan</th>
                  <th className="text-center px-5 py-2.5 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500 uppercase">Catatan</th>
                  <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stats.recentAbsensi.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-8 text-sm text-gray-400">Belum ada data</td></tr>
                ) : (
                  stats.recentAbsensi.map((a: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-50 transition">
                      <td className="px-5 py-3">
                        <p className="text-sm font-medium text-gray-900">{a.namaAnggota}</p>
                        <p className="text-xs text-gray-400">{a.nomorAnggota}</p>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-700">{a.kegiatan}</td>
                      <td className="px-5 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          a.hadir ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {a.hadir ? 'Hadir' : 'Absen'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-500 max-w-[200px] truncate">{a.catatan || '-'}</td>
                      <td className="px-5 py-3 text-sm text-gray-500">
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
