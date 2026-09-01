'use client';

import { useEffect, useState, useCallback } from 'react';
import { useConfirm } from '@/components/ui/confirm-modal';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { usePaginatedList } from '@/lib/hooks/use-api';
import { useFilters } from '@/lib/hooks/use-filters';
import DataTable from '@/components/ui/data-table';
import PageContainer from '@/components/ui/page-container';
import PageHeader from '@/components/ui/page-header';
import { StatCardGridSkeleton } from '@/components/ui/skeletons';
import DuesStatCards from '@/components/dues/DuesStatCards';
import DuesCharts from '@/components/dues/DuesCharts';
import { Plus, CreditCard, Trash2, ExternalLink } from 'lucide-react';
import ExportMenu from '@/components/ui/export-menu';
import { CanCreate, CanDelete, CanExport } from '@/components/auth/can';
import { PermissionGuard } from '@/components/auth/permission-guard';
import { useToast } from '@/components/ui/toast';

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
  return `Rp ${value.toLocaleString('id-ID')}`;
}

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── Page ───

export default function DuesPage() {
  const { confirm, confirmModal } = useConfirm();
  const toast = useToast();
  const router = useRouter();
  const [stats, setStats] = useState<DuesStats | null>(null);
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlyTrend[]>([]);
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
    await Promise.all([fetchStats(), fetchMonthlyTrend(), refetch()]);
  };

  return (
    <PermissionGuard module="dues" action="view">
    <PageContainer>
      {/* ── Header ── */}
      <PageHeader title="Manajemen Iuran" onRefresh={handleRefresh}>
        <CanExport module="dues">
          <ExportMenu serverType="dues" filename="iuran-export" />
        </CanExport>
        <CanCreate module="dues">
          <button
            onClick={() => router.push('/dues/new')}
            className="flex items-center gap-1.5 px-4 py-2 bg-gold-400 text-navy-900 rounded-xl text-sm font-bold hover:bg-gold-300 transition-all duration-200"
          >
            <Plus size={16} /> Tambah Iuran
          </button>
        </CanCreate>
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
        columns={[
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
          {
            key: 'actions',
            label: 'Aksi',
            align: 'right' as const,
            render: (d: DuesRow) => (
              <div className="flex items-center justify-end gap-1">
                <button
                  onClick={() => router.push(`/dues/${d.id}`)}
                  className="p-1.5 text-navy-600 hover:bg-navy-50 dark:hover:bg-navy-950 rounded-md transition-colors"
                  title="Lihat Detail"
                >
                  <ExternalLink size={14} />
                </button>
                <CanDelete module="dues">
                  <button
                    onClick={async () => {
                      if (!(await confirm('Hapus iuran ini?'))) return;
                      try {
                        await apiClient.delete(`/dues/${d.id}`);
                        refetch();
                      } catch { toast('error', 'Gagal menghapus iuran'); }
                    }}
                    className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-md transition-colors"
                    title="Hapus"
                  >
                    <Trash2 size={14} />
                  </button>
                </CanDelete>
              </div>
            ),
          },
        ]}
        empty={{
          icon: CreditCard,
          message: 'Belum ada data iuran',
        }}
      />
      {confirmModal}
    </PageContainer>
    </PermissionGuard>
  );
}
