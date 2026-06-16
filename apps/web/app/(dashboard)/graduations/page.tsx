'use client';

import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { usePaginatedList, buildEmptyMessage } from '@/lib/hooks/use-api';
import { useFilters } from '@/lib/hooks/use-filters';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { Plus, GraduationCap, Eye, MapPin, Users, Calendar } from 'lucide-react';
import PageHeader from '@/components/ui/page-header';
import PageContainer from '@/components/ui/page-container';
import DataTable from '@/components/ui/data-table';
import SummaryBar from '@/components/ui/summary-bar';
import SearchBar from '@/components/ui/search-bar';
import FilterSelect from '@/components/ui/filter-select';
import { ACTIVITY_STATUS_COLORS, ACTIVITY_STATUS_OPTIONS } from '@/components/activities/constants';

interface GraduationRow {
  id: string;
  nama: string;
  tanggalMulai: string;
  tanggalSelesai: string;
  lokasi: string;
  status: string;
  pesertaCount?: number;
}

export default function GraduationsPage() {
  const router = useRouter();
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
  const debouncedSearch = useDebounce(search, 300);

  const { data, meta, loading, refetch } = usePaginatedList<GraduationRow>(() => {
    const params = getApiParams({ limit: 10 });
    if (debouncedSearch) params.search = debouncedSearch;
    else delete params.search;
    if (filters.status) params.status = filters.status;
    return apiClient.get('/graduations', { params }).then((r) => r.data);
  }, [page, debouncedSearch, filters.status]);

  const handlePageChange = (p: number) => {
    if (p >= 1 && p <= meta.totalPages) setPage(p);
  };

  return (
    <PageContainer>
      <PageHeader title="Manajemen Pendadaran" onRefresh={refetch}>
        <button className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors">
          <Plus size={14} /> Jadwal Pendadaran
        </button>
      </PageHeader>

      <SummaryBar icon={GraduationCap} label="Total Pendadaran" total={meta.total} />

      <SearchBar
        search={search}
        onSearchChange={setSearch}
        onReset={resetFilters}
        placeholder="Cari pendadaran..."
        debounceMs={300}
      >
        <FilterSelect
          value={filters.status}
          onChange={(v) => setFilter('status', v)}
          options={ACTIVITY_STATUS_OPTIONS}
          placeholder="Semua Status"
        />
      </SearchBar>

      <DataTable
        columns={[
          { label: 'Nama Kegiatan' },
          { label: 'Tanggal', hidden: 'hidden sm:table-cell' },
          { label: 'Lokasi', hidden: 'hidden md:table-cell' },
          { label: 'Peserta', align: 'center', hidden: 'hidden lg:table-cell' },
          { label: 'Status' },
          { label: 'Aksi', align: 'right' },
        ]}
        data={data}
        loading={loading}
        empty={{
          icon: GraduationCap,
          ...buildEmptyMessage('jadwal pendadaran', hasActiveFilters, resetFilters),
        }}
        page={page}
        totalPages={meta.totalPages}
        total={meta.total}
        onPageChange={handlePageChange}
        colSpan={6}
        renderRow={(row: GraduationRow) => (
          <tr
            key={row.id}
            className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
          >
            <td className="px-4 py-3">
              <span className="font-medium text-gray-900 dark:text-white">{row.nama}</span>
            </td>
            <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden sm:table-cell whitespace-nowrap">
              <div className="flex items-center gap-1">
                <Calendar size={12} className="text-gray-400" />
                {new Date(row.tanggalMulai).toLocaleDateString('id-ID')}
                {row.tanggalSelesai &&
                  ` - ${new Date(row.tanggalSelesai).toLocaleDateString('id-ID')}`}
              </div>
            </td>
            <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden md:table-cell">
              <div className="flex items-center gap-1">
                <MapPin size={12} className="text-gray-400" />
                {row.lokasi || '-'}
              </div>
            </td>
            <td className="px-4 py-3 text-center hidden lg:table-cell">
              <div className="flex items-center justify-center gap-1">
                <Users size={12} className="text-gray-400" />
                <span className="text-gray-600 dark:text-gray-400">{row.pesertaCount ?? '-'}</span>
              </div>
            </td>
            <td className="px-4 py-3">
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${ACTIVITY_STATUS_COLORS[row.status] || ''}`}
              >
                {row.status}
              </span>
            </td>
            <td className="px-4 py-3 text-right">
              <button
                onClick={() => router.push(`/graduations/${row.id}`)}
                className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                title="Detail"
              >
                <Eye size={15} />
              </button>
            </td>
          </tr>
        )}
      />
    </PageContainer>
  );
}
