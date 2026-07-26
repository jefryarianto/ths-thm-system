'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import { usePaginatedList, buildEmptyMessage } from '@/lib/hooks/use-api';
import { useFilters } from '@/lib/hooks/use-filters';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { Plus, ClipboardList, Eye, CheckCircle, XCircle, Trash2, Edit3, ListOrdered } from 'lucide-react';
import { PermissionGuard } from '@/components/auth/permission-guard';
import PageHeader from '@/components/ui/page-header';
import PageContainer from '@/components/ui/page-container';
import DataTable from '@/components/ui/data-table';
import SummaryBar from '@/components/ui/summary-bar';
import SearchBar from '@/components/ui/search-bar';


interface AssessmentRow {
  id: string;
  kodeAspek: string;
  namaAspek: string;
  bobot: number;
  isActive: boolean;
}

interface ItemRow {
  id: string;
  aspekId: string;
  aspek?: { namaAspek: string };
  kodeItem: string;
  namaItem: string;
  skorMaksimal: number;
  bobot: number;
  isActive: boolean;
}

type Tab = 'aspek' | 'item';

export default function AssessmentsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('aspek');
  const { page, setPage, search, setSearch, hasActiveFilters, getApiParams, resetFilters } =
    useFilters();
  const debouncedSearch = useDebounce(search, 300);

  const { data: aspekData, meta: aspekMeta, loading: aspekLoading, refetch: refetchAspek } =
    usePaginatedList<AssessmentRow>(() => {
      const params = getApiParams({ limit: 10 });
      if (debouncedSearch) params.search = debouncedSearch;
      else delete params.search;
      return apiClient.get('/assessments/aspects', { params }).then((r) => r.data);
    }, [page, debouncedSearch, tab]);

  const { data: itemsData, meta: itemsMeta, loading: itemsLoading, refetch: refetchItems } =
    usePaginatedList<ItemRow>(() => {
      const params = getApiParams({ limit: 10 });
      if (debouncedSearch) params.search = debouncedSearch;
      else delete params.search;
      return apiClient.get('/assessments/items', { params }).then((r) => r.data);
    }, [page, debouncedSearch, tab]);

  const meta = tab === 'aspek' ? aspekMeta : itemsMeta;

  const handlePageChange = useCallback(
    (p: number) => {
      if (p >= 1 && p <= meta.totalPages) setPage(p);
    },
    [meta.totalPages],
  );

  const refetch = tab === 'aspek' ? refetchAspek : refetchItems;

  return (
    <PermissionGuard module="assessments" action="view">
    <PageContainer>
      <PageHeader title="Aspek & Item Penilaian" onRefresh={refetch}>
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5 mr-3">
          <button
            onClick={() => { setTab('aspek'); setPage(1); }}
            className={`px-3 py-1.5 text-sm rounded-md transition ${
              tab === 'aspek'
                ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white font-medium'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            Aspek
          </button>
          <button
            onClick={() => { setTab('item'); setPage(1); }}
            className={`px-3 py-1.5 text-sm rounded-md transition ${
              tab === 'item'
                ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white font-medium'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            Item
          </button>
        </div>
        {tab === 'aspek' && (
          <button
            onClick={() => router.push('/assessments/aspects/new')}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors"
          >
            <Plus size={14} /> Tambah Aspek
          </button>
        )}
      </PageHeader>

      <SummaryBar
        icon={tab === 'aspek' ? ClipboardList : ListOrdered}
        label={tab === 'aspek' ? 'Total Aspek' : 'Total Item'}
        total={meta.total}
      />

      <SearchBar
        search={search}
        onSearchChange={setSearch}
        onReset={resetFilters}
        placeholder={tab === 'aspek' ? 'Cari aspek penilaian...' : 'Cari item penilaian...'}
        debounceMs={300}
      />

      {tab === 'aspek' ? (
        <DataTable
          columns={[
            { label: 'Kode' },
            { label: 'Aspek' },
            { label: 'Bobot', align: 'right', hidden: 'hidden sm:table-cell' },
            { label: 'Aktif', align: 'center' },
            { label: 'Aksi', align: 'right', hidden: 'hidden md:table-cell' },
          ]}
          data={aspekData}
          loading={aspekLoading}
          empty={{
            icon: ClipboardList,
            ...buildEmptyMessage('aspek penilaian', hasActiveFilters, resetFilters),
          }}
          page={page}
          totalPages={aspekMeta.totalPages}
          total={aspekMeta.total}
          onPageChange={handlePageChange}
          colSpan={5}
          renderRow={(row: AssessmentRow) => (
            <tr
              key={row.id}
              className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
            >
              <td className="px-4 py-3">
                <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
                  {row.kodeAspek}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className="font-medium text-gray-900 dark:text-white">{row.namaAspek}</span>
              </td>
              <td className="px-4 py-3 text-right hidden sm:table-cell">
                <span className="text-gray-600 dark:text-gray-400">{Number(row.bobot) * 100}%</span>
              </td>
              <td className="px-4 py-3 text-center">
                {row.isActive ? (
                  <CheckCircle size={16} className="text-green-500 mx-auto" />
                ) : (
                  <XCircle size={16} className="text-red-500 mx-auto" />
                )}
              </td>
              <td className="px-4 py-3 text-right hidden md:table-cell">
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={async () => {
                      try {
                        const newStatus = !row.isActive;
                        await apiClient.patch(`/assessments/aspects/${row.id}`, { isActive: newStatus });
                        refetchAspek();
                      } catch { alert('Gagal mengubah status aspek'); }
                    }}
                    className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950 rounded-md transition-colors"
                    title={row.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                  >
                    <Eye size={15} />
                  </button>
                  <button
                    onClick={async () => {
                      if (!confirm(`Hapus aspek "${row.namaAspek}"?`)) return;
                      try {
                        await apiClient.delete(`/assessments/aspects/${row.id}`);
                        refetchAspek();
                      } catch { alert('Gagal menghapus aspek'); }
                    }}
                    className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-md transition-colors"
                    title="Hapus"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </td>
            </tr>
          )}
        />
      ) : (
        <DataTable
          columns={[
            { label: 'Kode' },
            { label: 'Item' },
            { label: 'Skor Maks', align: 'right', hidden: 'hidden sm:table-cell' },
            { label: 'Bobot', align: 'right', hidden: 'hidden sm:table-cell' },
            { label: 'Aktif', align: 'center' },
            { label: 'Aksi', align: 'right', hidden: 'hidden md:table-cell' },
          ]}
          data={itemsData}
          loading={itemsLoading}
          empty={{
            icon: ListOrdered,
            ...buildEmptyMessage('item penilaian', hasActiveFilters, resetFilters),
          }}
          page={page}
          totalPages={itemsMeta.totalPages}
          total={itemsMeta.total}
          onPageChange={handlePageChange}
          colSpan={6}
          renderRow={(row: ItemRow) => (
            <tr
              key={row.id}
              className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
            >
              <td className="px-4 py-3">
                <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
                  {row.kodeItem}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-col">
                  <span className="font-medium text-gray-900 dark:text-white">{row.namaItem}</span>
                  {row.aspek && (
                    <span className="text-xs text-gray-400">{row.aspek.namaAspek}</span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-right hidden sm:table-cell">
                <span className="text-gray-600 dark:text-gray-400 font-mono text-sm">
                  {row.skorMaksimal}
                </span>
              </td>
              <td className="px-4 py-3 text-right hidden sm:table-cell">
                <span className="text-gray-600 dark:text-gray-400">{Number(row.bobot) * 100}%</span>
              </td>
              <td className="px-4 py-3 text-center">
                {row.isActive ? (
                  <CheckCircle size={16} className="text-green-500 mx-auto" />
                ) : (
                  <XCircle size={16} className="text-red-500 mx-auto" />
                )}
              </td>
              <td className="px-4 py-3 text-right hidden md:table-cell">
                <div className="flex items-center justify-end gap-1">
                  <Link
                    href={`/assessments/items/${row.id}/edit`}
                    className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950 rounded-md transition-colors inline-flex"
                    title="Edit"
                  >
                    <Edit3 size={14} />
                  </Link>
                  <button
                    onClick={async () => {
                      if (!confirm(`Hapus item "${row.namaItem}"?`)) return;
                      try {
                        await apiClient.delete(`/assessments/items/${row.id}`);
                        refetchItems();
                      } catch { alert('Gagal menghapus item'); }
                    }}
                    className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-md transition-colors"
                    title="Hapus"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </td>
            </tr>
          )}
        />
      )}
    </PageContainer>
    </PermissionGuard>
  );
}
