'use client';

import { PermissionGuard } from '@/components/auth/permission-guard';

import { useEffect, useState } from 'react';
import apiClient, { unwrap } from '@/lib/api-client';
import { Trophy, Zap, AlertCircle, Download, Calendar } from 'lucide-react';
import PageContainer from '@/components/ui/page-container';
import PageHeader from '@/components/ui/page-header';
import DataTable from '@/components/ui/data-table';


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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(
        `/gamification/admin/points-report?period=${period}&limit=20`,
      );
      setReport(unwrap(res) || []);
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
    const rows = report.map(
      (r) =>
        `${r.rank},"${r.namaLengkap}",${r.points},${r.level},${r.events},${new Date(r.lastActive).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}`,
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

  const columns = [
    {
      key: 'rank',
      label: 'Rank',
      render: (entry: ReportEntry) => (
        <span className="text-lg">{['🥇', '🥈', '🥉'][entry.rank - 1] || `#${entry.rank}`}</span>
      ),
    },
    {
      key: 'namaLengkap',
      label: 'Anggota',
      render: (entry: ReportEntry) => (
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          {entry.namaLengkap}
        </span>
      ),
    },
    {
      key: 'points',
      label: 'Poin',
      align: 'right' as const,
      render: (entry: ReportEntry) => (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-400 rounded-full text-xs font-semibold">
          <Zap size={10} />
          {entry.points.toLocaleString('id-ID')}
        </span>
      ),
    },
    {
      key: 'level',
      label: 'Level',
      align: 'center' as const,
      render: (entry: ReportEntry) => (
        <span className="text-sm">
          {LEVEL_ICONS[entry.level] || '❓'} {entry.level}
        </span>
      ),
    },
    {
      key: 'events',
      label: 'Event',
      align: 'right' as const,
      render: (entry: ReportEntry) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">{entry.events}</span>
      ),
    },
  ];

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            <p className="text-sm text-gray-500">Memuat laporan poin...</p>
          </div>
        </div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-3" />
            <p className="text-red-600 font-medium">{error}</p>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
      <PermissionGuard module="gamification" action="view">
        <PageContainer>
              <PageHeader title="Laporan Poin" onRefresh={fetchReport}>
                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900 rounded-lg transition"
                >
                  <Download size={14} />
                  CSV
                </button>
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-lg transition"
                >
                  <Download size={14} />
                  Print
                </button>
              </PageHeader>
        
              {/* Period Selector */}
              <div className="flex items-center gap-3">
                <Calendar size={16} className="text-gray-400" />
                <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
                  <button
                    onClick={() => setPeriod('weekly')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition ${
                      period === 'weekly'
                        ? 'bg-white dark:bg-gray-700 text-blue-700 dark:text-blue-400 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-800'
                    }`}
                  >
                    Mingguan
                  </button>
                  <button
                    onClick={() => setPeriod('monthly')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition ${
                      period === 'monthly'
                        ? 'bg-white dark:bg-gray-700 text-blue-700 dark:text-blue-400 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-800'
                    }`}
                  >
                    Bulanan
                  </button>
                </div>
              </div>
        
              {/* Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Peserta</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{report.length}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Total Poin ({period === 'weekly' ? 'Minggu' : 'Bulan'} Ini)
                  </p>
                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">
                    {totalPoints.toLocaleString('id-ID')}
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Rata-rata Poin</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {report.length > 0
                      ? Math.round(totalPoints / report.length).toLocaleString('id-ID')
                      : 0}
                  </p>
                </div>
              </div>
        
              {/* Table */}
              <DataTable
                columns={columns}
                data={report}
                loading={false}
                page={1}
                totalPages={1}
                total={report.length}
                empty={{ icon: Trophy, message: 'Belum ada data untuk periode ini' }}
              />
            </PageContainer>
      </PermissionGuard>
    );
}
