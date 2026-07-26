'use client';

import { PermissionGuard } from '@/components/auth/permission-guard';

import { useState } from 'react';
import apiClient, { unwrap } from '@/lib/api-client';
import { useApi } from '@/lib/hooks/use-api';
import { useFilters } from '@/lib/hooks/use-filters';
import { BarChart3, CheckCircle, FileText, Activity, Download } from 'lucide-react';
import PageContainer from '@/components/ui/page-container';
import PageHeader from '@/components/ui/page-header';
import { StatCardGridSkeleton } from '@/components/ui/skeletons';
import ScanChart from '@/components/scan-stats/ScanChart';
import RecentAbsensiTable from '@/components/scan-stats/RecentAbsensiTable';


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
  const [refreshKey, setRefreshKey] = useState(0);

  const {
    search: searchQuery,
    setSearch: setSearchQuery,
    filters,
    setFilter,
    resetFilters: resetFilterState,
  } = useFilters({
    filters: [{ key: 'hadir', defaultValue: '' }],
  });

  const {
    data: stats,
    /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
    loading: _loading,
    refetch: fetchData,
  } = useApi<ScanStats>(
    () => apiClient.get('/reports/scan-stats').then((r) => unwrap<ScanStats>(r)),
    [],
  );

  const handleExportCSV = () => {
    if (!stats?.recentAbsensi?.length) return;
    setExporting(true);
    try {
      const headers = ['Nama', 'No. Anggota', 'Kegiatan', 'Status', 'Catatan', 'Tanggal'];
      const rows = stats.recentAbsensi.map((a) => [
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
    } catch {
      /* ignore */
    }
    setExporting(false);
  };

  const resetFilters = () => {
    resetFilterState();
    setRefreshKey((k) => k + 1);
  };

  const statCards = stats
    ? [
        {
          label: 'Total Absensi',
          value: stats.totalAbsensi,
          icon: CheckCircle,
          color: 'bg-blue-50 dark:bg-blue-950',
          iconColor: 'text-blue-600 dark:text-blue-400',
        },
        {
          label: 'Dokumen Terverifikasi',
          value: stats.totalDokumen,
          icon: FileText,
          color: 'bg-green-50 dark:bg-green-950',
          iconColor: 'text-green-600 dark:text-green-400',
        },
        {
          label: 'Kegiatan Aktif',
          value: stats.activeKegiatan,
          icon: Activity,
          color: 'bg-orange-50 dark:bg-orange-950',
          iconColor: 'text-orange-600 dark:text-orange-400',
        },
        {
          label: 'Absensi 30 Hari',
          value: stats.absensiHarian?.reduce((s, d) => s + d.count, 0) || 0,
          icon: BarChart3,
          color: 'bg-purple-50 dark:bg-purple-950',
          iconColor: 'text-purple-600 dark:text-purple-400',
        },
      ]
    : [];

  return (
      <PermissionGuard module="scanStats" action="view">
        <PageContainer>
              <PageHeader
                title="Statistik Scan"
                onRefresh={() => {
                  fetchData();
                  resetFilters();
                }}
              >
                <button
                  onClick={handleExportCSV}
                  disabled={exporting || !stats?.recentAbsensi?.length}
                  className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition disabled:opacity-50"
                >
                  <Download size={14} /> {exporting ? 'Exporting...' : 'Export CSV'}
                </button>
              </PageHeader>
        
              {/* Stat Cards */}
              {!stats ? (
                <StatCardGridSkeleton count={4} />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {statCards.map((s) => (
                    <div
                      key={s.label}
                      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 flex items-center gap-3"
                    >
                      <div className={`p-2.5 rounded-lg ${s.color}`}>
                        <s.icon size={18} className={s.iconColor} />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                          {s.value.toLocaleString('id-ID')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
        
              {/* Absensi Harian Chart */}
              {stats?.absensiHarian && <ScanChart key={refreshKey} data={stats.absensiHarian} />}
        
              {/* Recent Absensi */}
              {stats?.recentAbsensi && (
                <RecentAbsensiTable
                  data={stats.recentAbsensi}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  statusFilter={filters.hadir}
                  onStatusFilterChange={(v) => setFilter('hadir', v)}
                  onReset={() => {
                    setSearchQuery('');
                    setFilter('hadir', '');
                  }}
                />
              )}
            </PageContainer>
      </PermissionGuard>
    );
}
