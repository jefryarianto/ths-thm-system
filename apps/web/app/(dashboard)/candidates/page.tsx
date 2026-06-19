'use client';

import apiClient from '@/lib/api-client';
import { usePaginatedList, buildEmptyMessage } from '@/lib/hooks/use-api';
import { useFilters } from '@/lib/hooks/use-filters';
import { useDebounce } from '@/lib/hooks/use-debounce';
import type { Candidate } from '@/types';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { Plus, Upload, Download, UserPlus } from 'lucide-react';
import PageHeader from '@/components/ui/page-header';
import PageContainer from '@/components/ui/page-container';
import DataTable from '@/components/ui/data-table';
import SummaryBar from '@/components/ui/summary-bar';
import SearchBar from '@/components/ui/search-bar';
import CandidateActions from '@/components/candidates/CandidateActions';

const STATUS_COLORS: Record<string, string> = {
  diusulkan: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
  mengikuti_pendadaran: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400',
  lulus: 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400',
  gagal: 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400',
  dibatalkan: 'bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-400',
};

const STATUS_LABELS: Record<string, string> = {
  diusulkan: 'Diusulkan',
  mengikuti_pendadaran: 'Pendadaran',
  lulus: 'Lulus',
  gagal: 'Gagal',
  dibatalkan: 'Dibatalkan',
};

export default function CandidatesPage() {
  const router = useRouter();

  const handleExport = useCallback(async () => {
    try {
      const res = await apiClient.get('/candidates/export/csv', { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv;charset=utf-8' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'calon-anggota.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // Silent fail — export button is a convenience
    }
  }, []);

  const { page, setPage, search, setSearch, hasActiveFilters, getApiParams, resetFilters } =
    useFilters();
  const debouncedSearch = useDebounce(search, 300);

  const {
    data: candidates,
    meta,
    loading,
    refetch,
  } = usePaginatedList<Candidate>(() => {
    const params = getApiParams({ limit: 10 });
    if (debouncedSearch) params.search = debouncedSearch;
    else delete params.search;
    return apiClient.get('/candidates', { params }).then((r) => r.data);
  }, [page, debouncedSearch]);

  const handlePageChange = (p: number) => {
    if (p >= 1 && p <= meta.totalPages) setPage(p);
  };

  return (
    <PageContainer>
      <PageHeader title="Manajemen Calon Anggota" onRefresh={refetch}>          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <Download size={14} /> Export
          </button>
          <button
            onClick={() => router.push('/candidates/import')}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <Upload size={14} /> Import
          </button>
        <button
          onClick={() => router.push('/candidates/new')}
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
        >
          <Plus size={14} /> Tambah
        </button>
      </PageHeader>

      <SummaryBar icon={UserPlus} label="Total Calon" total={meta.total} />

      <SearchBar
        search={search}
        onSearchChange={setSearch}
        onReset={resetFilters}
        placeholder="Cari calon anggota..."
        debounceMs={300}
      />

      <DataTable
        columns={[
          { label: 'Nama' },
          { label: 'JK', hidden: 'hidden sm:table-cell' },
          { label: 'No. HP', hidden: 'hidden md:table-cell' },
          { label: 'Email', hidden: 'hidden lg:table-cell' },
          { label: 'Status' },
          { label: 'Aksi', align: 'right' },
        ]}
        data={candidates}
        loading={loading}
        empty={{
          icon: UserPlus,
          ...buildEmptyMessage('calon anggota', hasActiveFilters, resetFilters),
        }}
        page={page}
        totalPages={meta.totalPages}
        total={meta.total}
        onPageChange={handlePageChange}
        colSpan={6}
        renderRow={(c: Candidate) => (
          <tr
            key={c.id}
            className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
          >
            <td className="px-4 py-3">
              <span className="font-medium text-gray-900 dark:text-white">{c.namaLengkap}</span>
            </td>
            <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden sm:table-cell">
              {c.jenisKelamin}
            </td>
            <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden md:table-cell">
              {c.noHp || '-'}
            </td>
            <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden lg:table-cell">
              {c.email || '-'}
            </td>
            <td className="px-4 py-3">
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[c.status] || ''}`}
              >
                {STATUS_LABELS[c.status] || c.status}
              </span>
            </td>
            <td className="px-4 py-3 text-right">
              <CandidateActions candidate={c} onSuccess={refetch} />
            </td>
          </tr>
        )}
      />
    </PageContainer>
  );
}
