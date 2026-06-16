'use client';

import { useState } from 'react';
import apiClient from '@/lib/api-client';
import { usePaginatedList, buildEmptyMessage } from '@/lib/hooks/use-api';
import { useFilters } from '@/lib/hooks/use-filters';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { CreditCard, CheckCircle, Clock, ArrowUpRight, Building2, XCircle } from 'lucide-react';
import PageHeader from '@/components/ui/page-header';
import PageContainer from '@/components/ui/page-container';
import DataTable from '@/components/ui/data-table';
import SearchBar from '@/components/ui/search-bar';

interface DuesRecord {
  id: string;
  anggotaId: string;
  jumlah: number;
  status: string;
  tanggalBayar: string | null;
  buktiBayarPath: string | null;
  anggota?: { namaLengkap: string; nomorAnggota: string };
}

interface StatsData {
  totalCollected: number;
  pendingCount: number;
  paidCount: number;
  totalDues: number;
}

interface BankInfo {
  bankName: string;
  accountNumber: string;
  accountName: string;
  qrisImageUrl: string | null;
}

export default function PaymentsPage() {
  const [stats, setStats] = useState<StatsData>({
    totalCollected: 0,
    pendingCount: 0,
    paidCount: 0,
    totalDues: 0,
  });
  const [bankInfo, setBankInfo] = useState<BankInfo | null>(null);
  const { page, setPage, search, setSearch, hasActiveFilters, getApiParams, resetFilters } =
    useFilters();
  const debouncedSearch = useDebounce(search, 300);

  const {
    data: dues,
    meta,
    loading,
    refetch,
  } = usePaginatedList<DuesRecord>(async () => {
    const params = getApiParams({ limit: 10 });
    if (debouncedSearch) params.search = debouncedSearch;
    else delete params.search;
    const [duesRes, statsRes, bankRes] = await Promise.all([
      apiClient.get('/dues', { params }),
      apiClient.get('/dues/dashboard/stats'),
      apiClient.get('/payments/bank-info'),
    ]);
    const { success, data: statsData } = statsRes.data;
    if (success) setStats(statsData);
    if (bankRes.data) setBankInfo(bankRes.data);
    return duesRes.data;
  }, [page, debouncedSearch]);

  const handleVerify = async (id: string) => {
    try {
      await apiClient.patch(`/payments/${id}/verify`);
      refetch();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Gagal verifikasi');
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm('Tolak pembayaran ini? Status akan dikembalikan ke belum dibayar.')) return;
    try {
      await apiClient.patch(`/payments/${id}/reject`);
      refetch();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Gagal menolak');
    }
  };

  const handlePageChange = (p: number) => {
    if (p >= 1 && p <= meta.totalPages) setPage(p);
  };

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
  };

  return (
    <PageContainer>
      <PageHeader title="Manajemen Pembayaran" onRefresh={refetch} />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Terkumpul',
            value: formatRupiah(stats.totalCollected),
            icon: CreditCard,
            bg: 'bg-blue-100 dark:bg-blue-950',
            iconColor: 'text-blue-600 dark:text-blue-400',
          },
          {
            label: 'Lunas',
            value: stats.paidCount,
            icon: CheckCircle,
            bg: 'bg-green-100 dark:bg-green-950',
            iconColor: 'text-green-600 dark:text-green-400',
          },
          {
            label: 'Belum Lunas',
            value: stats.pendingCount,
            icon: Clock,
            bg: 'bg-yellow-100 dark:bg-yellow-950',
            iconColor: 'text-yellow-600 dark:text-yellow-400',
          },
          {
            label: 'Total Iuran',
            value: stats.totalDues,
            icon: ArrowUpRight,
            bg: 'bg-purple-100 dark:bg-purple-950',
            iconColor: 'text-purple-600 dark:text-purple-400',
          },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
          >
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-lg ${s.bg}`}>
                <s.icon size={20} className={s.iconColor} />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{s.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bank Info + QRIS */}
      {bankInfo && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Building2 size={18} className="text-blue-600 dark:text-blue-400" />
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Informasi Rekening</h3>
          </div>
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1 space-y-2">
              <div className="flex gap-2">
                <span className="text-sm text-gray-500 dark:text-gray-400 w-28">Bank</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{bankInfo.bankName}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-sm text-gray-500 dark:text-gray-400 w-28">No. Rekening</span>
                <span className="text-sm font-mono font-bold text-blue-600 dark:text-blue-400">{bankInfo.accountNumber}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-sm text-gray-500 dark:text-gray-400 w-28">Atas Nama</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{bankInfo.accountName}</span>
              </div>
            </div>
            {bankInfo.qrisImageUrl && (
              <div className="flex flex-col items-center">
                <img src={bankInfo.qrisImageUrl} alt="QRIS" className="w-36 h-36 object-contain border rounded-lg" />
                <span className="text-xs text-gray-500 mt-1">Scan QRIS</span>
              </div>
            )}
          </div>
        </div>
      )}

      <SearchBar
        search={search}
        onSearchChange={setSearch}
        onReset={resetFilters}
        placeholder="Cari pembayaran (nama, no. anggota)..."
        debounceMs={300}
      />

      <DataTable
        columns={[
          { label: 'Anggota' },
          { label: 'No. Anggota', hidden: 'hidden sm:table-cell' },
          { label: 'Jumlah', align: 'right' },
          { label: 'Status' },
          { label: 'Tanggal Bayar', hidden: 'hidden md:table-cell' },
          { label: 'Aksi' },
        ]}
        data={dues}
        loading={loading}
        empty={{
          icon: CreditCard,
          ...buildEmptyMessage('data pembayaran', hasActiveFilters, resetFilters),
        }}
        page={page}
        totalPages={meta.totalPages}
        total={meta.total}
        onPageChange={handlePageChange}
        colSpan={6}
        renderRow={(due: DuesRecord) => (
          <tr
            key={due.id}
            className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
          >
            <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
              {due.anggota?.namaLengkap || '-'}
            </td>
            <td className="px-4 py-3 font-mono text-gray-600 dark:text-gray-400 hidden sm:table-cell">
              {due.anggota?.nomorAnggota || '-'}
            </td>
            <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">
              {formatRupiah(due.jumlah)}
            </td>
            <td className="px-4 py-3">
              {due.status === 'lunas' ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400">
                  <CheckCircle size={12} /> Lunas
                </span>
              ) : due.status === 'menunggu_verifikasi' ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-400">
                  <Clock size={12} /> Menunggu
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                  <Clock size={12} /> Belum Dibayar
                </span>
              )}
            </td>
            <td className="px-4 py-3 text-gray-500 dark:text-gray-400 hidden md:table-cell">
              {due.tanggalBayar ? new Date(due.tanggalBayar).toLocaleDateString('id-ID') : '-'}
            </td>
            <td className="px-4 py-3">
              <div className="flex items-center gap-2">
                {due.status === 'menunggu_verifikasi' && (
                  <>
                    <button
                      onClick={() => handleVerify(due.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors"
                    >
                      <CheckCircle size={12} /> Verifikasi
                    </button>
                    <button
                      onClick={() => handleReject(due.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg transition-colors"
                    >
                      <XCircle size={12} /> Tolak
                    </button>
                  </>
                )}
                {due.buktiBayarPath && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[120px]" title={due.buktiBayarPath}>
                    {due.buktiBayarPath.length > 30 ? due.buktiBayarPath.substring(0, 30) + '...' : due.buktiBayarPath}
                  </span>
                )}
              </div>
            </td>
          </tr>
        )}
      />
    </PageContainer>
  );
}