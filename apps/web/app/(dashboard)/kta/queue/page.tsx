'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import { usePaginatedList } from '@/lib/hooks/use-api';
import { useFilters } from '@/lib/hooks/use-filters';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { Check, X, CreditCard, Settings, Truck, Eye } from 'lucide-react';
import PageContainer from '@/components/ui/page-container';
import PageHeader from '@/components/ui/page-header';
import DataTable from '@/components/ui/data-table';
import SearchBar from '@/components/ui/search-bar';
import FilterSelect from '@/components/ui/filter-select';
import { useToast } from '@/components/ui/toast';
import { KtaStatusBadge } from '@/components/kta/KtaStatusBadge';
import { KTA_STATUS_LABELS, KTA_PROCESSING_STATUSES } from '@/components/kta/constants';

interface KtaApplication {
  id: string;
  anggotaId: string;
  nomorAnggota: string | null;
  status: string;
  biaya: number | null;
  rekeningTujuan: string | null;
  statusPembayaran: string;
  diterbitkanAt: string | null;
  submittedByRole: string;
  batchId: string | null;
  catatanAdmin: string | null;
  createdAt: string;
  updatedAt: string;
  anggota: {
    id: string;
    namaLengkap: string;
    nomorAnggota: string;
    ranting: { id: string; nama: string };
  };
}

export default function KtaQueuePage() {
  const toast = useToast();

  const {
    page,
    setPage,
    search,
    setSearch,
    filters,
    setFilter,
    sort,
    setSort,
    hasActiveFilters,
    getApiParams,
    resetFilters,
  } = useFilters({ filters: [{ key: 'status', defaultValue: '' }] });

  const debouncedSearch = useDebounce(search, 300);

  const {
    data: applications,
    meta,
    loading,
    error,
    refetch,
  } = usePaginatedList<KtaApplication>(() => {
    const params = getApiParams({ limit: 15 });
    if (debouncedSearch) params.search = debouncedSearch;
    else delete params.search;
    if (filters.status) params.status = filters.status;
    return apiClient.get('/kta-applications', { params }).then((r) => r.data);
  }, [page, debouncedSearch, sort?.key, sort?.direction, filters.status]);

  const statusOptions = useMemo(
    () => [
      { value: '', label: 'Semua Status' },
      ...Object.entries(KTA_STATUS_LABELS).map(([value, label]) => ({ value, label })),
    ],
    [],
  );

  const handleApprove = async (id: string) => {
    const catatan = window.prompt('Catatan persetujuan (opsional):') ?? '';
    try {
      await apiClient.patch(`/kta-applications/${id}/approve`, { catatan });
      toast('success', 'Aplikasi disetujui');
      refetch();
    } catch {
      toast('error', 'Gagal menyetujui aplikasi');
    }
  };

  const handleReject = async (id: string) => {
    const reason = window.prompt('Alasan penolakan (wajib):');
    if (!reason) return;
    try {
      await apiClient.patch(`/kta-applications/${id}/reject`, { reason });
      toast('success', 'Aplikasi ditolak');
      refetch();
    } catch {
      toast('error', 'Gagal menolak aplikasi');
    }
  };

  const handleGenerate = async (id: string) => {
    if (!window.confirm('Generate KTA untuk aplikasi ini?')) return;
    try {
      await apiClient.post(`/kta-applications/${id}/generate-card`, { reason: 'baru' });
      toast('success', 'KTA berhasil digenerate');
      refetch();
    } catch {
      toast('error', 'Gagal generate KTA');
    }
  };

  return (
    <PageContainer>
      <PageHeader title="Antrian KTA" onRefresh={refetch} />

      <SearchBar
        search={search}
        onSearchChange={setSearch}
        onClear={() => setSearch('')}
        onReset={resetFilters}
        placeholder="Cari nama / nomor anggota..."
      >
        <FilterSelect
          value={filters.status}
          onChange={(v) => setFilter('status', v)}
          options={statusOptions}
          placeholder="Semua Status"
        />
      </SearchBar>

      {error && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm px-4 py-3 rounded-xl flex items-center justify-between">
          <span>{error}</span>
          <button onClick={refetch} className="underline hover:no-underline text-xs">
            Coba lagi
          </button>
        </div>
      )}

      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 -mt-2 mb-2">
          {filters.status && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300 rounded-full text-xs">
              Status: {KTA_STATUS_LABELS[filters.status] || filters.status}
              <button onClick={() => setFilter('status', '')} className="p-0.5 hover:opacity-70" aria-label="Hapus filter">
                <X size={10} />
              </button>
            </span>
          )}
          <button onClick={resetFilters} className="text-xs text-primary hover:underline ml-1">
            Reset semua
          </button>
        </div>
      )}

      <DataTable
        columns={[
          {
            key: 'anggota.namaLengkap',
            label: 'Nama Anggota',
            render: (app: KtaApplication) => (
              <Link href={`/kta/${app.id}`} className="font-medium hover:underline">
                {app.anggota.namaLengkap}
              </Link>
            ),
          },
          {
            key: 'anggota.nomorAnggota',
            label: 'NRA',
            render: (app: KtaApplication) => (
              <span className="font-mono text-xs text-gray-600 dark:text-gray-400">
                {app.anggota.nomorAnggota || '-'}
              </span>
            ),
          },
          {
            key: 'status',
            label: 'Status',
            render: (app: KtaApplication) => <KtaStatusBadge status={app.status} />,
          },
          {
            key: 'submittedByRole',
            label: 'Diajukan Oleh',
            render: (app: KtaApplication) => (
              <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-700 dark:text-gray-300 capitalize">
                {app.submittedByRole.replace('_', ' ')}
              </span>
            ),
          },
          {
            key: 'createdAt',
            label: 'Diajukan',
            render: (app: KtaApplication) => (
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {new Date(app.createdAt).toLocaleDateString('id-ID', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            ),
          },
        ]}
        data={applications}
        loading={loading}
        sort={sort}
        onSort={setSort}
        empty={{
          icon: CreditCard,
          message: hasActiveFilters ? 'Tidak ada aplikasi yang cocok dengan filter' : 'Belum ada pengajuan KTA',
          action: hasActiveFilters ? { label: 'Reset filter', onClick: resetFilters } : undefined,
        }}
        page={page}
        totalPages={meta.totalPages}
        total={meta.total}
        onPageChange={(p) => {
          if (p >= 1 && p <= meta.totalPages) setPage(p);
        }}
        actions={(app: KtaApplication) => (
          <div className="flex items-center gap-1">
            <Link href={`/kta/${app.id}`} title="Lihat Detail">
              <button className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition" aria-label="Lihat Detail">
                <Eye size={14} />
              </button>
            </Link>
            {!KTA_PROCESSING_STATUSES.includes(app.status) &&
              !['REJECTED', 'CANCELLED'].includes(app.status) && (
                <>
                  <button
                    onClick={() => handleApprove(app.id)}
                    className="p-1.5 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition"
                    title="Setujui"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    onClick={() => handleReject(app.id)}
                    className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition"
                    title="Tolak"
                  >
                    <X size={14} />
                  </button>
                </>
              )}
            {app.status === 'APPROVED' && (
              <Link href={`/kta/distrik-process`} title="Proses Biaya & Generate">
                <button className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition" aria-label="Proses Biaya">
                  <Settings size={14} />
                </button>
              </Link>
            )}
            {app.status === 'PAYMENT_SETUP' && (
              <Link href={`/kta/distrik-process`} title="Atur Biaya & Rekening">
                <button className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition" aria-label="Ubah Biaya">
                  <Settings size={14} />
                </button>
              </Link>
            )}
            {app.status === 'PAYMENT_VERIFIED' && (
              <button
                onClick={() => handleGenerate(app.id)}
                className="p-1.5 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition"
                title="Generate KTA"
              >
                <CreditCard size={14} />
              </button>
            )}
            {app.status === 'PAYMENT_PENDING' && (
              <Link href={`/kta/distrik-process`} title="Verifikasi Pembayaran">
                <button className="p-1.5 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition" aria-label="Verifikasi Bayar">
                  <Truck size={14} />
                </button>
              </Link>
            )}
          </div>
        )}
      />
    </PageContainer>
  );
}
