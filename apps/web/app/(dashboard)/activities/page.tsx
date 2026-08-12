'use client';

import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { usePaginatedList, buildEmptyMessage } from '@/lib/hooks/use-api';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { useFilters } from '@/lib/hooks/use-filters';
import { Plus, Calendar, MapPin } from 'lucide-react';
import ExportMenu from '@/components/ui/export-menu';
import { CanCreate, CanExport } from '@/components/auth/can';
import { PermissionGuard } from '@/components/auth/permission-guard';
import PageHeader from '@/components/ui/page-header';
import PageContainer from '@/components/ui/page-container';
import DataTable from '@/components/ui/data-table';
import SummaryBar from '@/components/ui/summary-bar';
import SearchBar from '@/components/ui/search-bar';
import FilterSelect from '@/components/ui/filter-select';
import {

  ACTIVITY_STATUS_COLORS,
  ACTIVITY_STATUS_OPTIONS,
  ACTIVITY_TIPE_OPTIONS,
} from '@/components/activities/constants';
import ActivityActions from '@/components/activities/ActivityActions';

interface ActivityRow {
  id: string;
  nama: string;
  tipe: string;
  tanggalMulai: string;
  tanggalSelesai?: string;
  lokasi?: string;
  status: string;
  pesertaCount?: number;
}

export default function ActivitiesPage() {
  const router = useRouter();

  const {
    page,
    setPage,
    search,
    setSearch,
    filters,
    setFilter,
    resetFilters,
    hasActiveFilters,
    getApiParams,
  } = useFilters({
    filters: [
      { key: 'status', defaultValue: '' },
      { key: 'tipe', defaultValue: '' },
    ],
  });
  const debouncedSearch = useDebounce(search, 300);

  const { data, meta, loading, refetch } = usePaginatedList<ActivityRow>(() => {
    const params = getApiParams({ limit: 10 });
    if (debouncedSearch) params.search = debouncedSearch;
    else delete params.search;
    return apiClient.get('/activities', { params }).then((r) => r.data);
  }, [page, debouncedSearch, filters.status, filters.tipe]);

  const handlePageChange = (p: number) => {
    if (p >= 1 && p <= meta.totalPages) setPage(p);
  };

  return (
    <PermissionGuard module="activities" action="view">
    <PageContainer>
      <PageHeader title="Manajemen Kegiatan">
        <CanExport module="activities">
          <ExportMenu
            data={data.map((a: ActivityRow) => ({
              'Nama Kegiatan': a.nama,
              Tipe: a.tipe,
              Tanggal: new Date(a.tanggalMulai).toLocaleDateString('id-ID'),
              Lokasi: a.lokasi || '-',
              Peserta: a.pesertaCount ?? 0,
              Status: a.status,
            }))}
            headers={['Nama Kegiatan', 'Tipe', 'Tanggal', 'Lokasi', 'Peserta', 'Status']}
            filename="kegiatan-export"
          />
        </CanExport>
        <CanCreate module="activities">
          <button
            onClick={() => router.push('/activities/new')}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors"
          >
            <Plus size={14} /> Tambah
          </button>
        </CanCreate>
      </PageHeader>

      <SummaryBar icon={Calendar} label="Total Kegiatan" total={meta.total} onRefresh={refetch} />

      <SearchBar
        search={search}
        onSearchChange={setSearch}
        onReset={resetFilters}
        placeholder="Cari kegiatan..."
        debounceMs={300}
        onDebouncedSearch={() => {}}
      >
        <FilterSelect
          value={filters.tipe}
          onChange={(v) => setFilter('tipe', v)}
          options={ACTIVITY_TIPE_OPTIONS}
          placeholder="Semua Tipe"
        />
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
          { label: 'Tipe', hidden: 'hidden sm:table-cell' },
          { label: 'Tanggal', hidden: 'hidden md:table-cell' },
          { label: 'Lokasi', hidden: 'hidden lg:table-cell' },
          { label: 'Peserta', align: 'center', hidden: 'hidden xl:table-cell' },
          { label: 'Status' },
          { label: 'Aksi', align: 'right' },
        ]}
        data={data}
        loading={loading}
        empty={{
          icon: Calendar,
          ...buildEmptyMessage('kegiatan', hasActiveFilters, resetFilters),
        }}
        page={page}
        totalPages={meta.totalPages}
        total={meta.total}
        onPageChange={handlePageChange}
        colSpan={7}
        renderRow={(row: ActivityRow) => (
          <tr
            key={row.id}
            className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <td className="px-4 py-3">
              <span className="font-medium text-gray-900 dark:text-white">{row.nama}</span>
            </td>
            <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden sm:table-cell">
              <span className="px-2 py-0.5 rounded-full text-xs bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400">
                {row.tipe}
              </span>
            </td>
            <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden md:table-cell whitespace-nowrap">
              {new Date(row.tanggalMulai).toLocaleDateString('id-ID')}
              {row.tanggalSelesai &&
                ` - ${new Date(row.tanggalSelesai).toLocaleDateString('id-ID')}`}
            </td>
            <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden lg:table-cell">
              <div className="flex items-center gap-1">
                <MapPin size={12} className="text-gray-400" />
                {row.lokasi || '-'}
              </div>
            </td>
            <td className="px-4 py-3 text-center hidden xl:table-cell">
              <span className="text-gray-600 dark:text-gray-400">{row.pesertaCount ?? '-'}</span>
            </td>
            <td className="px-4 py-3">
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${ACTIVITY_STATUS_COLORS[row.status] || ''}`}
              >
                {row.status}
              </span>
            </td>
            <td className="px-4 py-3 text-right">
              <ActivityActions activity={row} onSuccess={refetch} />
            </td>
          </tr>
        )}
      />
    </PageContainer>
    </PermissionGuard>
  );
}
