'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import {
  Trophy, Zap, AlertCircle, Download, Calendar,
} from 'lucide-react';

interface ReportEntry {
  rank: number;
  namaLengkap: string;
  points: number;
  level: string;
  events: number;
  lastActive: string;
}

const LEVEL_ICONS: Record<string, string> = {
  Bronze: '🥉',
  Silver: '🥈',
  Gold: '🥇',
  Platinum: '💎',
  Diamond: '🔥',
};

export default function PointsReportPage() {
  const [report, setReport] = useState<ReportEntry[]>([]);
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('monthly');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReport();
  }, [period]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/gamification/admin/points-report?period=${period}&limit=20`);
      setReport(res.data.data || []);
    } catch {
      setError('Gagal memuat laporan');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const headers = ['Rank,Nama,Poin,Level,Event,Last Active'];
    const rows = report.map((r) =>
      `${r.rank},"${r.namaLengkap}",${r.points},${r.level},${r.events},${new Date(r.lastActive).toLocaleDateString('id-ID')}`
    );
    const csv = [...headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `points-report-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalPoints = report.reduce((sum, r) => sum + r.points, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          <p className="text-sm text-gray-500">Memuat laporan poin...</p>
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
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Laporan Poin</h1>
          <p className="text-sm text-gray-500 mt-1">Top earners berdasarkan periode</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-green-50 text-green-700 hover:bg-green-100 rounded-lg transition"
          >
            <Download size={14} />
            CSV
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition"
          >
            <Download size={14} />
            Print
          </button>
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex items-center gap-3">
        <Calendar size={16} className="text-gray-400" />
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => setPeriod('weekly')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition ${
              period === 'weekly' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Mingguan
          </button>
          <button
            onClick={() => setPeriod('monthly')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition ${
              period === 'monthly' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Bulanan
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <p className="text-sm font-medium text-gray-500">Total Peserta</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{report.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <p className="text-sm font-medium text-gray-500">Total Poin ({period === 'weekly' ? 'Minggu' : 'Bulan'} Ini)</p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">{totalPoints.toLocaleString('id-ID')}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <p className="text-sm font-medium text-gray-500">Rata-rata Poin</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {report.length > 0 ? Math.round(totalPoints / report.length).toLocaleString('id-ID') : 0}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="mb-4 flex items-center gap-2">
          <Trophy size={20} className="text-yellow-500" />
          <h3 className="text-base font-semibold text-gray-900">Top Earners</h3>
        </div>
        {report.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">Rank</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">Anggota</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 uppercase">Poin</th>
                  <th className="text-center px-3 py-2 text-xs font-medium text-gray-500 uppercase">Level</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 uppercase">Event</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {report.map((entry) => (
                  <tr key={entry.rank} className={`hover:bg-gray-50 transition ${entry.rank <= 3 ? 'bg-yellow-50/30' : ''}`}>
                    <td className="px-3 py-3">
                      <span className="text-lg">{['🥇', '🥈', '🥉'][entry.rank - 1] || `#${entry.rank}`}</span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-sm font-medium text-gray-900">{entry.namaLengkap}</span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">
                        <Zap size={10} />
                        {entry.points.toLocaleString('id-ID')}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="text-sm">{LEVEL_ICONS[entry.level] || '❓'} {entry.level}</span>
                    </td>
                    <td className="px-3 py-3 text-right text-sm text-gray-600">{entry.events}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
            Belum ada data untuk periode ini
          </div>
        )}
      </div>
    </div>
  );
}
