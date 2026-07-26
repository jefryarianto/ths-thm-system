'use client';

import { useState } from 'react';
import apiClient from '@/lib/api-client';
import { useApi, usePaginatedList } from '@/lib/hooks/use-api';
import { useFilters } from '@/lib/hooks/use-filters';
import { BarChart3, Users, Activity, Download } from 'lucide-react';
import { PermissionGuard } from '@/components/auth/permission-guard';
import PageContainer from '@/components/ui/page-container';
import PageHeader from '@/components/ui/page-header';
import OverviewTab from '@/components/reports/OverviewTab';
import MembersTab from '@/components/reports/MembersTab';
import ScanTab from '@/components/reports/ScanTab';
import ExportTab from '@/components/reports/ExportTab';

// ─── Types ───


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
  emailSummary: {
    totalSent: number;
    totalFailed: number;
    totalSkipped: number;
    totalSuppressed: number;
  } | null;
}

interface MemberRow {
  id: string;
  namaLengkap: string;
  nomorAnggota: string;
  statusKeanggotaan: string;
  ranting?: { nama: string };
  createdAt: string;
}

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
    catatan: string;
    tanggal: string;
  }>;
}

// ─── Tabs ───

type ReportTab = 'overview' | 'members' | 'scan' | 'exports';

const tabs: Array<{ key: ReportTab; label: string; icon: typeof BarChart3 }> = [
  { key: 'overview', label: 'Ringkasan', icon: BarChart3 },
  { key: 'members', label: 'Anggota', icon: Users },
  { key: 'scan', label: 'Absensi', icon: Activity },
  { key: 'exports', label: 'Ekspor Data', icon: Download },
];

// ─── Page ───

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>('overview');

  // Overview data
  const { data: dashboard, loading } = useApi<DashboardData>(
    () => apiClient.get('/reports/dashboard').then((r) => r.data.data as DashboardData),
    [],
  );

  // Members data
  const {
    page: memberPage,
    setPage: setMemberPage,
    search: memberSearch,
    setSearch: setMemberSearch,
    getApiParams: memberApiParams,
  } = useFilters();

  const {
    data: members,
    meta: memberMeta,
    loading: membersLoading,
    refetch: fetchMembers,
  } = usePaginatedList<MemberRow>(
    () => {
      const params = memberApiParams({ limit: 15 });
      return apiClient.get('/members', { params }).then((r) => r.data);
    },
    [memberPage, memberSearch],
    activeTab === 'members',
  );

  // Scan data
  const {
    data: scanStats,
    loading: scanLoading,
    refetch: fetchScanStats,
  } = useApi<ScanStats>(
    () => apiClient.get('/reports/scan-stats').then((r) => r.data.data as ScanStats),
    [],
    activeTab === 'scan',
  );

  // Export
  const [exportType, setExportType] = useState('members');
  const [exportLoading, setExportLoading] = useState(false);

  // Export handler
  const handleExport = async () => {
    setExportLoading(true);
    try {
      const { data: res } = await apiClient.get(`/reports/export/${exportType}`);
      const rows = res.data || [];
      if (rows.length === 0) {
        setExportLoading(false);
        return;
      }

      const headers = Object.keys(rows[0]);
      const csv = [
        headers.join(','),
        ...rows.map((r: Record<string, unknown>) =>
          headers
            .map((h) => {
              const v = String(r[h] ?? '');
              return v.includes(',') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v;
            })
            .join(','),
        ),
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `laporan-${exportType}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      /* ignore */
    }
    setExportLoading(false);
  };

  return (
    <PermissionGuard module="reports" action="view">
    <PageContainer className="space-y-6 max-w-6xl">
      <PageHeader
        title="Laporan & Statistik"
        onRefresh={() => {
          if (activeTab === 'members') fetchMembers();
          if (activeTab === 'scan') fetchScanStats();
        }}
      />

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <OverviewTab dashboard={dashboard as DashboardData | null} loading={loading} />
      )}

      {activeTab === 'members' && (
        <MembersTab
          members={members}
          loading={membersLoading}
          search={memberSearch}
          onSearchChange={setMemberSearch}
          page={memberPage}
          totalPages={memberMeta?.totalPages ?? 1}
          total={memberMeta?.total ?? 0}
          onPrevPage={() => setMemberPage(memberPage - 1)}
          onNextPage={() => setMemberPage(memberPage + 1)}
        />
      )}

      {activeTab === 'scan' && (
        <ScanTab scanStats={scanStats as ScanStats | null} loading={scanLoading} />
      )}

      {activeTab === 'exports' && (
        <ExportTab
          exportType={exportType}
          onExportTypeChange={setExportType}
          exportLoading={exportLoading}
          onExport={handleExport}
        />
      )}

      {/* Footer */}
      <div className="text-center text-xs text-gray-400 dark:text-gray-600 py-4 border-t border-gray-100 dark:border-gray-800">
        Data diperbarui secara real-time. Terakhir dimuat:{' '}
        {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
      </div>
    </PageContainer>
    </PermissionGuard>
  );
}
