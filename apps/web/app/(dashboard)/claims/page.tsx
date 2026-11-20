'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { usePaginatedList, buildEmptyMessage } from '@/lib/hooks/use-api';
import { useFilters } from '@/lib/hooks/use-filters';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { useRouter } from 'next/navigation';
import { Plus, FileText, CheckCircle, XCircle, Clock, ExternalLink, Trash2 } from 'lucide-react';
import { PermissionGuard } from '@/components/auth/permission-guard';
import PageHeader from '@/components/ui/page-header';
import PageContainer from '@/components/ui/page-container';
import DataTable from '@/components/ui/data-table';
import SummaryBar from '@/components/ui/summary-bar';
import SearchBar from '@/components/ui/search-bar';
import FilterSelect from '@/components/ui/filter-select';
import { STATUS_COLORS, STATUS_OPTIONS, STAGE_LABELS, STAGE_COLORS, STAGE_OPTIONS } from '@/components/claims/constants';
import { useToast } from '@/components/ui/toast';

interface ClaimRow {
  id: string;
  tipe: string;
  status: string;
  currentStage?: string;
  anggota?: { namaLengkap: string };
  namaLengkap?: string;
  ranting?: { nama: string };
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
    filters: [
      { key: 'status', defaultValue: '' },
      { key: 'currentStage', defaultValue: '' },
    ],
  });
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    try {
      const token = localStorage.getItem('accessToken');
      const encodedPayload = token?.split('.')[1];
      if (!encodedPayload) return;
      const payload = JSON.parse(atob(encodedPayload.replace(/-/g, '+').replace(/_/g, '/'))) as { role?: string };
      setCurrentRole(payload.role || null);
    } catch {
      setCurrentRole(null);
    }
  }, []);

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
      if (action === 'delete') {
        if (!window.confirm('Hapus pengajuan klaim yang ditolak? Tindakan ini tidak dapat dibatalkan.')) return;
        await apiClient.delete(`/claims/${id}`);
      } else {
        const body = action === 'reject' ? { reason: 'Ditolak oleh admin' } : {};
        await apiClient.post(`/claims/${id}/${action}`, body);
      }
      await refetch();
      toast('success', action === 'delete' ? 'Klaim ditolak berhasil dihapus' : 'Tahap klaim berhasil diperbarui');
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast('error', message || `Gagal ${action} klaim`);
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
          <FilterSelect
            value={filters.currentStage}
            onChange={(v) => setFilter('currentStage', v)}
            options={STAGE_OPTIONS}
            placeholder="Semua Tahap"
          />
        </SearchBar>

        <DataTable
          columns={[
            { label: 'Tipe' },
            { label: 'Pelapor', hidden: 'hidden sm:table-cell' },
            { label: 'Ranting', hidden: 'hidden md:table-cell' },
            { label: 'Status' },
            { label: 'Tahap Verifikasi', hidden: 'hidden md:table-cell' },
            { label: 'Tanggal', hidden: 'hidden lg:table-cell' },
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
          colSpan={7}
          renderRow={(row: ClaimRow) => {
            const stageLabel = STAGE_LABELS[row.currentStage || ''] || row.currentStage || '-';
            const stageColor = STAGE_COLORS[row.currentStage || ''] || '';
            return (
              <tr
                key={row.id}
                className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <td className="px-4 py-3">
                  <span className="font-medium text-gray-900 dark:text-white capitalize">
                    {row.tipe === 'keanggotaan' ? 'Keanggotaan' : 'Dokumen'}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden sm:table-cell">
                  {row.namaLengkap || row.anggota?.namaLengkap || '-'}
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden md:table-cell">
                  {row.ranting?.nama || '-'}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[row.status] || ''}`}
                  >
                    {row.status}
                  </span>
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${stageColor}`}
                  >
                    {stageLabel}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden lg:table-cell">
                  {new Date(row.createdAt).toLocaleDateString('id-ID', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
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
                    {row.status === 'pending' && (row.tipe !== 'keanggotaan' || currentRole === 'superadmin' || currentRole === ({ ranting: 'admin_ranting', wilayah: 'admin_wilayah', distrik: 'admin_distrik', nasional: 'admin_nasional' } as Record<string, string>)[row.currentStage || '']) && (
                      <>
                        {row.tipe !== 'keanggotaan' && (
                          <button onClick={() => handleAction(row.id, 'process')} disabled={actionLoading === `${row.id}-process`} className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 rounded-md transition-colors" title="Proses"><Clock size={15} /></button>
                        )}
                        <button onClick={() => handleAction(row.id, 'approve')} disabled={actionLoading === `${row.id}-approve`} className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-950 rounded-md transition-colors" title={row.tipe === 'keanggotaan' ? 'Verifikasi & eskalasi' : 'Setujui'}><CheckCircle size={15} /></button>
                        <button onClick={() => handleAction(row.id, 'reject')} disabled={actionLoading === `${row.id}-reject`} className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950 rounded-md transition-colors" title="Tolak"><XCircle size={15} /></button>
                      </>
                    )}
                    {row.tipe !== 'keanggotaan' && row.status === 'diproses' && (
                      <>
                        <button onClick={() => handleAction(row.id, 'approve')} disabled={actionLoading === `${row.id}-approve`} className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-950 rounded-md transition-colors" title="Setujui"><CheckCircle size={15} /></button>
                        <button onClick={() => handleAction(row.id, 'reject')} disabled={actionLoading === `${row.id}-reject`} className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950 rounded-md transition-colors" title="Tolak"><XCircle size={15} /></button>
                      </>
                    )}
                    {row.status === 'ditolak' && (
                      <button onClick={() => handleAction(row.id, 'delete')} disabled={actionLoading === `${row.id}-delete`} className="p-1.5 text-red-700 hover:bg-red-50 dark:hover:bg-red-950 rounded-md transition-colors" title="Hapus klaim ditolak"><Trash2 size={15} /></button>
                    )}
                  </div>
                </td>
              </tr>
            );
          }}
        />
      </PageContainer>
    </PermissionGuard>
  );
}
