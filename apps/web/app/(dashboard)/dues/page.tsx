'use client';

import { useEffect, useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { usePaginatedList } from '@/lib/hooks/use-api';
import { useFilters } from '@/lib/hooks/use-filters';
import DataTable from '@/components/ui/data-table';
import PageContainer from '@/components/ui/page-container';
import PageHeader from '@/components/ui/page-header';
import { StatCardGridSkeleton } from '@/components/ui/skeletons';
import DuesStatCards from '@/components/dues/DuesStatCards';
import DuesCharts from '@/components/dues/DuesCharts';
import { Plus, CreditCard, BarChart3, RefreshCw, Download } from 'lucide-react';

// ─── Types ───

interface DuesStats {
  totalIuran: number;
  totalTransaksi: number;
  totalLunas: number;
  totalMenunggak: number;
  iuranBulanIni: number;
  lunasBulanIni: number;
  belumBayarBulanIni: number;
  anggotaAktif: number;
}

interface MonthlyTrend {
  bulan: string;
  jumlah: number;
  transaksi: number;
}

interface DuesRow {
  id: string;
  anggota?: { namaLengkap: string };
  periode: string;
  jumlah: number;
  status: string;
  createdAt: string;
}

// ─── Constants ───

const STATUS_COLORS: Record<string, string> = {
  lunas: '#22c55e',
  menunggak: '#ef4444',
  belum_dibayar: '#9ca3af',
  menunggu_verifikasi: '#eab308',
};

const STATUS_LABELS: Record<string, string> = {
  lunas: 'Lunas',
  menunggak: 'Menunggak',
  belum_dibayar: 'Belum Dibayar',
  menunggu_verifikasi: 'Menunggu Verifikasi',
};

const statusColors: Record<string, string> = {
  lunas: 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400',
  menunggak: 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400',
  belum_dibayar: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
  menunggu_verifikasi: 'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-400',
};

// ─── Helpers ───

function formatRupiah(value: number) {
  if (value >= 1_000_000) return `Rp ${(value / 1_000_000).toFixed(1)}jt`;
  if (value >= 1_000) return `Rp ${(value / 1_000).toFixed(0)}rb`;
  return `Rp ${value.toLocaleString('id-ID')}`;
}

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

const columns = [
  {
    key: 'anggota',
    label: 'Anggota',
    render: (d: DuesRow) => <span className="font-medium">{d.anggota?.namaLengkap || '-'}</span>,
  },
  { key: 'periode', label: 'Periode' },
  { key: 'jumlah', label: 'Jumlah', render: (d: DuesRow) => formatRupiah(Number(d.jumlah)) },
  {
    key: 'status',
    label: 'Status',
    render: (d: DuesRow) => (
      <span
        className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[d.status] || ''}`}
      >
        {STATUS_LABELS[d.status] || d.status}
      </span>
    ),
  },
  { key: 'createdAt', label: 'Tanggal', render: (d: DuesRow) => formatShortDate(d.createdAt) },
];

// ─── Page ───

export default function DuesPage() {
  const [stats, setStats] = useState<DuesStats | null>(null);
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlyTrend[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { page, setPage } = useFilters();

  const { data, meta, loading, refetch } = usePaginatedList<DuesRow>(
    () => apiClient.get('/dues', { params: { page, limit: 10 } }).then((r) => r.data),
    [page],
  );

  const fetchStats = useCallback(async () => {
    try {
      const { data: res } = await apiClient.get('/dues/dashboard/stats');
      setStats(res.data);
    } catch {
      /* ignore */
    }
  }, []);

  const fetchMonthlyTrend = useCallback(async () => {
    try {
      const { data: res } = await apiClient.get('/reports/dashboard');
      const dashboardData = res.data;
      if (dashboardData.monthlyDues) {
        setMonthlyTrend(dashboardData.monthlyDues);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchMonthlyTrend();
  }, [fetchStats, fetchMonthlyTrend]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchStats(), fetchMonthlyTrend(), refetch()]);
    setIsRefreshing(false);
  };

  return (
    <PageContainer>
      {/* ── Header ── */}
      <PageHeader title="Manajemen Iuran" onRefresh={handleRefresh}>
        <button className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
          <Download size={14} /> Export
        </button>
        <button className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition">
          <Plus size={16} /> Tambah Iuran
        </button>
      </PageHeader>

      {/* ── Stat Cards ── */}
      {!stats ? <StatCardGridSkeleton count={4} /> : <DuesStatCards stats={stats} />}

      {/* ── Charts Row ── */}
      <DuesCharts stats={stats} monthlyTrend={monthlyTrend} />

      {/* ── Dues Table ── */}
      <DataTable
        data={data}
        loading={loading}
        page={page}
        totalPages={meta.totalPages}
        total={meta.total}
        onPageChange={setPage}
        columns={columns}
        empty={{
          icon: CreditCard,
          message: 'Belum ada data iuran',
        }}
      />
    </PageContainer>
  );
}
