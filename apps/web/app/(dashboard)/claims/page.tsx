'use client';

import { useState } from 'react';
import apiClient from '@/lib/api-client';
import { usePaginatedList, buildEmptyMessage } from '@/lib/hooks/use-api';
import { useFilters } from '@/lib/hooks/use-filters';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { useRouter } from 'next/navigation';
import { Plus, FileText, CheckCircle, XCircle, Clock, ExternalLink } from 'lucide-react';
import { PermissionGuard } from '@/components/auth/permission-guard';
import PageHeader from '@/components/ui/page-header';
import PageContainer from '@/components/ui/page-container';
import DataTable from '@/components/ui/data-table';
import SummaryBar from '@/components/ui/summary-bar';
import SearchBar from '@/components/ui/search-bar';
import FilterSelect from '@/components/ui/filter-select';
import { STATUS_COLORS, STATUS_OPTIONS } from '@/components/claims/constants';
import { useToast } from '@/components/ui/toast';

interface ClaimRow {
  id: string;
  tipe: string;
  status: string;
  anggota?: { namaLengkap: string };
  createdAt: string;
}

export default function ClaimsPage() {
  const router = useRouter();
  const toast = useToast();
  const {
    page,
    setPage,
    search,
    setSearch,
    filters,
    setFilter,
    hasActiveFilters,
    getApiParams,
    resetFilters,
  } = useFilters({
    filters: [{ key: 'status', defaultValue: '' }],
  });
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const debouncedSearch = useDebounce(search, 300);

  const { data, meta, loading, refetch } = usePaginatedList<ClaimRow>(() => {
    const params = getApiParams({ limit: 10 });
    if (debouncedSearch) params.search = debouncedSearch;
    else delete params.search;
    if (filters.status) params.status = filters.status;
    return apiClient.get('/claims', { params }).then((r) => r.data);
  }, [page, debouncedSearch, filters.status]);

  const handleAction = async (id: string, action: string) => {
    setActionLoading(`${id}-${action}`);
    try {
      const body = action === 'reject' ? { reason: 'Ditolak oleh admin' } : {};
      await apiClient.post(`/claims/${id}/${action}`, body);
      await refetch();
    } catch {
      toast('error', `Gagal ${action} klaim`);
    } finally {
      setActionLoading(null);
    }
  };

  const handlePageChange = (p: number) => {
    if (p >= 1 && p <= meta.totalPages) setPage(p);
  };

  return (
    <PermissionGuard module="claims" action="view">
    <PageContainer>
      <PageHeader title="Manajemen Klaim" onRefresh={refetch}>
        <button
          onClick={() => router.push('/claims/new')}
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors"
        >
          <Plus size={14} /> Tambah
        </button>
      </PageHeader>

      <SummaryBar icon={FileText} label="Total Klaim" total={meta.total} />

      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Daftar Klaim</p>

      <SearchBar
        search={search}
        onSearchChange={setSearch}
        onReset={resetFilters}
        placeholder="Cari klaim..."
        debounceMs={300}
      >
        <FilterSelect
          value={filters.status}
          onChange={(v) => setFilter('status', v)}
          options={STATUS_OPTIONS}
          placeholder="Semua Status"
        />
      </SearchBar>

      <DataTable
        columns={[
          { label: 'Tipe' },
          { label: 'Anggota', hidden: 'hidden sm:table-cell' },
          { label: 'Status' },
          { label: 'Tanggal', hidden: 'hidden md:table-cell' },
          { label: 'Aksi', align: 'right' },
        ]}
        data={data}
        loading={loading}
        empty={{
          icon: FileText,
          ...buildEmptyMessage('klaim', hasActiveFilters, resetFilters),
        }}
        page={page}
        totalPages={meta.totalPages}
        total={meta.total}
        onPageChange={handlePageChange}
        colSpan={5}
        renderRow={(row: ClaimRow) => (
          <tr
            key={row.id}
            className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <td className="px-4 py-3">
              <span className="font-medium text-gray-900 dark:text-white capitalize">
                {row.tipe}
              </span>
            </td>
            <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden sm:table-cell">
              {row.anggota?.namaLengkap || '-'}
            </td>
            <td className="px-4 py-3">
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[row.status] || ''}`}
              >
                {row.status}
              </span>
            </td>
            <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden md:table-cell">
              {new Date(row.createdAt).toLocaleDateString('id-ID')}
            </td>
            <td className="px-4 py-3 text-right">
              <div className="flex items-center justify-end gap-1">
                <button
                  onClick={() => router.push(`/claims/${row.id}`)}
                  className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 rounded-md transition-colors"
                  title="Lihat Detail"
                >
                  <ExternalLink size={14} />
                </button>
                {row.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleAction(row.id, 'process')}
                      disabled={actionLoading === `${row.id}-process`}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 rounded-md transition-colors"
                      title="Proses"
                    >
                      <Clock size={15} />
                    </button>
                    <button
                      onClick={() => handleAction(row.id, 'approve')}
                      disabled={actionLoading === `${row.id}-approve`}
                      className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-950 rounded-md transition-colors"
                      title="Setujui"
                    >
                      <CheckCircle size={15} />
                    </button>
                    <button
                      onClick={() => handleAction(row.id, 'reject')}
                      disabled={actionLoading === `${row.id}-reject`}
                      className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950 rounded-md transition-colors"
                      title="Tolak"
                    >
                      <XCircle size={15} />
                    </button>
                  </>
                )}
                {row.status === 'diproses' && (
                  <>
                    <button
                      onClick={() => handleAction(row.id, 'approve')}
                      disabled={actionLoading === `${row.id}-approve`}
                      className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-950 rounded-md transition-colors"
                      title="Setujui"
                    >
                      <CheckCircle size={15} />
                    </button>
                    <button
                      onClick={() => handleAction(row.id, 'reject')}
                      disabled={actionLoading === `${row.id}-reject`}
                      className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950 rounded-md transition-colors"
                      title="Tolak"
                    >
                      <XCircle size={15} />
                    </button>
                  </>
                )}
              </div>
            </td>
          </tr>
        )}
      />
    </PageContainer>
    </PermissionGuard>
  );
}
