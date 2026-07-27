'use client';

import { PermissionGuard } from '@/components/auth/permission-guard';

import { useCallback } from 'react';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import { usePaginatedList, buildEmptyMessage } from '@/lib/hooks/use-api';
import { useFilters } from '@/lib/hooks/use-filters';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { Plus, ListOrdered, CheckCircle, XCircle, Trash2, Edit3 } from 'lucide-react';
import PageHeader from '@/components/ui/page-header';
import PageContainer from '@/components/ui/page-container';
import DataTable from '@/components/ui/data-table';
import SummaryBar from '@/components/ui/summary-bar';
import SearchBar from '@/components/ui/search-bar';
import { useToast } from '@/components/ui/toast';


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

export default function ItemsPage() {
  const toast = useToast();
  const { page, setPage, search, setSearch, hasActiveFilters, getApiParams, resetFilters } =
    useFilters();
  const debouncedSearch = useDebounce(search, 300);

  const { data, meta, loading, refetch } = usePaginatedList<ItemRow>(() => {
    const params = getApiParams({ limit: 10 });
    if (debouncedSearch) params.search = debouncedSearch;
    else delete params.search;
    return apiClient.get('/assessments/items', { params }).then((r) => r.data);
  }, [page, debouncedSearch]);

  const handlePageChange = useCallback(
    (p: number) => {
      if (p >= 1 && p <= meta.totalPages) setPage(p);
    },
    [meta.totalPages],
  );

  return (
      <PermissionGuard module="assessments" action="view">
        <PageContainer>
              <PageHeader title="Item Penilaian" onRefresh={refetch}>
                <Link
                  href="/assessments"
                  className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Kembali ke Aspek
                </Link>
                <Link
                  href="/assessments/items/new"
                  className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors"
                >
                  <Plus size={14} /> Tambah Item
                </Link>
              </PageHeader>
        
              <SummaryBar icon={ListOrdered} label="Total Item Penilaian" total={meta.total} />
        
              <SearchBar
                search={search}
                onSearchChange={setSearch}
                onReset={resetFilters}
                placeholder="Cari item penilaian..."
                debounceMs={300}
              />
        
              <DataTable
                columns={[
                  { label: 'Kode' },
                  { label: 'Item' },
                  { label: 'Skor Maks', align: 'right', hidden: 'hidden sm:table-cell' },
                  { label: 'Bobot', align: 'right', hidden: 'hidden sm:table-cell' },
                  { label: 'Aktif', align: 'center' },
                  { label: 'Aksi', align: 'right', hidden: 'hidden md:table-cell' },
                ]}
                data={data}
                loading={loading}
                empty={{
                  icon: ListOrdered,
                  ...buildEmptyMessage('item penilaian', hasActiveFilters, resetFilters),
                }}
                page={page}
                totalPages={meta.totalPages}
                total={meta.total}
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
                      <span className="text-gray-600 dark:text-gray-400">
                        {Number(row.bobot) * 100}%
                      </span>
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
                              refetch();
                            } catch {
                              toast('error', 'Gagal menghapus item');
                            }
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
            </PageContainer>
      </PermissionGuard>
    );
}
