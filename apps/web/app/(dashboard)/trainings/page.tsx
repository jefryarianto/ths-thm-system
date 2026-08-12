'use client';

import { useRouter } from 'next/navigation'; import Link from 'next/link';
import { useConfirm } from '@/components/ui/confirm-modal';
import apiClient from '@/lib/api-client';
import { usePaginatedList, buildEmptyMessage } from '@/lib/hooks/use-api';
import { useFilters } from '@/lib/hooks/use-filters';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { Plus, Calendar, Eye, MapPin, User, BookOpen, Trash2 } from 'lucide-react';
import ExportMenu from '@/components/ui/export-menu';
import { CanCreate, CanDelete, CanExport } from '@/components/auth/can';
import { PermissionGuard } from '@/components/auth/permission-guard';
import PageHeader from '@/components/ui/page-header';
import PageContainer from '@/components/ui/page-container';
import DataTable from '@/components/ui/data-table';
import SummaryBar from '@/components/ui/summary-bar';
import SearchBar from '@/components/ui/search-bar';
import FilterSelect from '@/components/ui/filter-select';
import { MATERI_OPTIONS } from '@/components/trainings/constants';
import { useToast } from '@/components/ui/toast';


interface TrainingRow {
  id: string;
  hariTanggal: string;
  ranting?: { nama: string };
  jenisMateri?: string;
  lokasi?: string;
  pelatih?: { namaLengkap: string };
  materi?: string;
}

export default function TrainingsPage() {
  const { confirm, confirmModal } = useConfirm();
  const toast = useToast();
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
    filters: [{ key: 'jenisMateri', defaultValue: '' }],
  });
  const debouncedSearch = useDebounce(search, 300);

  const { data, meta, loading, refetch } = usePaginatedList<TrainingRow>(() => {
    const params = getApiParams({ limit: 10 });
    if (debouncedSearch) params.search = debouncedSearch;
    else delete params.search;
    if (filters.jenisMateri) params.jenisMateri = filters.jenisMateri;
    return apiClient.get('/trainings', { params }).then((r) => r.data);
  }, [page, debouncedSearch, filters.jenisMateri]);

  const handlePageChange = (p: number) => {
    if (p >= 1 && p <= meta.totalPages) setPage(p);
  };

  return (
    <PermissionGuard module="trainings" action="view">
    <PageContainer>
      <PageHeader title="Manajemen Latihan" onRefresh={refetch}>
        <CanExport module="trainings">
          <ExportMenu serverType="trainings" filename="latihan-export" />
        </CanExport>
        <CanCreate module="trainings">
          <Link
            href="/trainings/new"
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors"
          >
            <Plus size={14} /> Jadwal Latihan
          </Link>
        </CanCreate>
      </PageHeader>

      <SummaryBar icon={Calendar} label="Total Latihan" total={meta.total} />

      <SearchBar
        search={search}
        onSearchChange={setSearch}
        onReset={resetFilters}
        placeholder="Cari latihan..."
        debounceMs={300}
      >
        <FilterSelect
          value={filters.jenisMateri}
          onChange={(v) => setFilter('jenisMateri', v)}
          options={MATERI_OPTIONS}
          placeholder="Semua Materi"
        />
      </SearchBar>

      <DataTable
        columns={[
          { label: 'Tanggal' },
          { label: 'Ranting', hidden: 'hidden sm:table-cell' },
          { label: 'Materi' },
          { label: 'Lokasi', hidden: 'hidden md:table-cell' },
          { label: 'Pelatih', hidden: 'hidden lg:table-cell' },
          { label: 'Aksi', align: 'right' },
        ]}
        data={data}
        loading={loading}
        empty={{
          icon: Calendar,
          ...buildEmptyMessage('jadwal latihan', hasActiveFilters, resetFilters),
        }}
        page={page}
        totalPages={meta.totalPages}
        total={meta.total}
        onPageChange={handlePageChange}
        colSpan={6}
        renderRow={(row: TrainingRow) => (
          <tr
            key={row.id}
            className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <td className="px-4 py-3 whitespace-nowrap">
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-gray-400" />
                <span className="font-medium text-gray-900 dark:text-white">
                  {new Date(row.hariTanggal).toLocaleDateString('id-ID')}
                </span>
              </div>
            </td>
            <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden sm:table-cell">
              <span className="px-2 py-0.5 rounded-full text-xs bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400">
                {row.ranting?.nama || '-'}
              </span>
            </td>
            <td className="px-4 py-3">
              <div className="flex items-center gap-1.5">
                <BookOpen size={14} className="text-gray-400" />
                <span className="text-gray-900 dark:text-white">
                  {row.jenisMateri || row.materi || '-'}
                </span>
              </div>
            </td>
            <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden md:table-cell">
              <div className="flex items-center gap-1">
                <MapPin size={12} className="text-gray-400" />
                {row.lokasi || '-'}
              </div>
            </td>
            <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden lg:table-cell">
              <div className="flex items-center gap-1.5">
                <User size={12} className="text-gray-400" />
                {row.pelatih?.namaLengkap || '-'}
              </div>
            </td>
            <td className="px-4 py-3 text-right">
              <div className="flex items-center justify-end gap-1">
                <button
                  onClick={() => router.push(`/trainings/${row.id}`)}
                  className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                  title="Detail"
                >
                  <Eye size={15} />
                </button>
                <CanDelete module="trainings">
                  <button
                    onClick={async () => {
                      if (!(await confirm(`Hapus data latihan ini?`))) return;
                      try {
                        await apiClient.delete(`/trainings/${row.id}`);
                        refetch();
                      } catch { toast('error', 'Gagal menghapus latihan'); }
                    }}
                    className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-md transition-colors"
                    title="Hapus"
                  >
                    <Trash2 size={14} />
                  </button>
                </CanDelete>
              </div>
            </td>
          </tr>
        )}
      />
      {confirmModal}
    </PageContainer>
    </PermissionGuard>
  );
}
