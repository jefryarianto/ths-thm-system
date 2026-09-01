'use client';

import { useState } from 'react';
import { useConfirm } from '@/components/ui/confirm-modal';
import apiClient from '@/lib/api-client';
import { usePaginatedList, buildEmptyMessage } from '@/lib/hooks/use-api';
import { useFilters } from '@/lib/hooks/use-filters';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { CreditCard, CheckCircle, Clock, ArrowUpRight, Building2, XCircle, Trash2, Settings, Eye } from 'lucide-react';
import { PermissionGuard } from '@/components/auth/permission-guard';
import { CanAdmin } from '@/components/auth/can';
import PageHeader from '@/components/ui/page-header';
import PageContainer from '@/components/ui/page-container';
import DataTable from '@/components/ui/data-table';
import SearchBar from '@/components/ui/search-bar';
import { useToast } from '@/components/ui/toast';
import Link from 'next/link';
import BuktiPreviewModal, { type BuktiImage } from '@/components/bukti-preview-modal';


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
  const { confirm, confirmModal } = useConfirm();
  const toast = useToast();
  const [stats, setStats] = useState<StatsData>({
    totalCollected: 0,
    pendingCount: 0,
    paidCount: 0,
    totalDues: 0,
  });
  const [bankInfo, setBankInfo] = useState<BankInfo | null>(null);
  const [buktiPreview, setBuktiPreview] = useState<{ index: number } | null>(null);
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
    if (success) setStats({
      totalCollected: statsData.totalIuran || 0,
      pendingCount: statsData.pendingCount || 0,
      paidCount: statsData.paidCount || 0,
      totalDues: statsData.totalTransaksi || 0,
    });
    // bankRes.data.data adalah ARRAY rekening aktif - ambil yang pertama (satu-satunya yg aktif)
    const bankList = bankRes.data?.data;
    if (Array.isArray(bankList) && bankList.length > 0) setBankInfo(bankList[0]);
    else setBankInfo(null);
    return duesRes.data;
  }, [page, debouncedSearch]);

  const handleVerify = async (id: string) => {
    try {
      await apiClient.patch(`/payments/${id}/verify`);
      refetch();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast('error', err?.response?.data?.message || 'Gagal verifikasi');
    }
  };

  const handleReject = async (id: string) => {
    if (!(await confirm({ title: 'Tolak Pembayaran', message: 'Tolak pembayaran ini? Status akan dikembalikan ke belum dibayar.', confirmLabel: 'Ya, Tolak', variant: 'warning' }))) return;
    try {
      await apiClient.patch(`/payments/${id}/reject`);
      refetch();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast('error', err?.response?.data?.message || 'Gagal menolak');
    }
  };

  const handlePageChange = (p: number) => {
    if (p >= 1 && p <= meta.totalPages) setPage(p);
  };

  const formatRupiah = (amount: number) => {
    return `Rp ${amount.toLocaleString('id-ID')}`;
  };

  return (
    <PermissionGuard module="payments" action="view">
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
            label: 'Total Transaksi',
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
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Building2 size={18} className="text-blue-600 dark:text-blue-400" />
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                Informasi Rekening
              </h3>
            </div>
            <CanAdmin module="payments">
              <Link
                href="/payments/bank-info"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-400 border border-blue-300 dark:border-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950 transition"
              >
                <Settings size={13} />
                Kelola Rekening
              </Link>
            </CanAdmin>
          </div>
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1 space-y-2">
              <div className="flex gap-2">
                <span className="text-sm text-gray-500 dark:text-gray-400 w-28">Bank</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {bankInfo.bankName}
                </span>
              </div>
              <div className="flex gap-2">
                <span className="text-sm text-gray-500 dark:text-gray-400 w-28">No. Rekening</span>
                <span className="text-sm font-mono font-bold text-blue-600 dark:text-blue-400">
                  {bankInfo.accountNumber}
                </span>
              </div>
              <div className="flex gap-2">
                <span className="text-sm text-gray-500 dark:text-gray-400 w-28">Atas Nama</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {bankInfo.accountName}
                </span>
              </div>
            </div>
            {bankInfo.qrisImageUrl && (
              <div className="flex flex-col items-center">
                <img
                  src={bankInfo.qrisImageUrl}
                  alt="QRIS"
                  className="w-36 h-36 object-contain border rounded-lg"
                />
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
            className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
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
                {due.status === 'belum_dibayar' && (
                  <button
                    onClick={async () => {
                      if (!(await confirm('Hapus catatan iuran ini?'))) return;
                      try {
                        await apiClient.delete(`/dues/${due.id}`);
                        refetch();
                      } catch { toast('error', 'Gagal menghapus iuran'); }
                    }}
                    className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-md transition-colors"
                    title="Hapus"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
                {due.buktiBayarPath && (
                  <button
                    onClick={() => {
                      // Build gallery of all bukti on this page
                      const buktiImages: BuktiImage[] = (dues || [])
                        .filter((d) => d.buktiBayarPath)
                        .map((d) => ({
                          path: d.buktiBayarPath!,
                          name: d.anggota?.namaLengkap || '',
                        }));
                      const idx = buktiImages.findIndex((b) => b.path === due.buktiBayarPath);
                      setBuktiPreview({ index: idx >= 0 ? idx : 0 });
                    }}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-700 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
                    title="Lihat bukti pembayaran"
                  >
                    <Eye size={12} />
                    Bukti
                  </button>
                )}
              </div>
            </td>
          </tr>
        )}
      />
      {confirmModal}
      <BuktiPreviewModal
        open={!!buktiPreview}
        onClose={() => setBuktiPreview(null)}
        images={
          (dues || [])
            .filter((d) => d.buktiBayarPath)
            .map((d) => ({
              path: d.buktiBayarPath!,
              name: d.anggota?.namaLengkap || '',
            }))
        }
        initialIndex={buktiPreview?.index ?? 0}
      />
    </PageContainer>
    </PermissionGuard>
  );
}
