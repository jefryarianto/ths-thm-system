'use client';

import { useState, useCallback, useEffect } from 'react';
import apiClient from '@/lib/api-client';
import { usePaginatedList, buildEmptyMessage } from '@/lib/hooks/use-api';
import { useDebounce } from '@/lib/hooks/use-debounce';
import {
  Plus, FolderOpen,
  Eye, Download,
} from 'lucide-react';
import PageHeader from '@/components/ui/page-header';
import DataTable from '@/components/ui/data-table';
import SummaryBar from '@/components/ui/summary-bar';
import SearchBar from '@/components/ui/search-bar';
import FilterSelect from '@/components/ui/filter-select';

interface OrgDocumentRow {
  id: string;
  judul: string;
  kategori?: { nama: string };
  uploader?: { namaLengkap: string };
  createdAt: string;
}

export default function OrgDocumentsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState<{ id: string; nama: string }[]>([]);
  const [filterCategory, setFilterCategory] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const { data, meta, loading, refetch } = usePaginatedList<OrgDocumentRow>(
    () => {
      const params: Record<string, unknown> = { page, limit: 10 };
      if (debouncedSearch) params.search = debouncedSearch;
      if (filterCategory) params.kategoriId = filterCategory;
      return apiClient.get('/org-documents', { params }).then(r => r.data);
    },
    [page, debouncedSearch, filterCategory]
  );

  const fetchCategories = useCallback(async () => {
    try {
      const { data: res } = await apiClient.get('/org-documents/categories/list');
      setCategories(res.data || []);
    } catch {
      // Categories not critical
    }
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const handlePageChange = (p: number) => {
    if (p >= 1 && p <= meta.totalPages) setPage(p);
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Dokumen Organisasi" onRefresh={refetch}>
        <button className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors">
          <Plus size={14} /> Tambah
        </button>
      </PageHeader>

      <SummaryBar icon={FolderOpen} label="Total Dokumen" total={meta.total} />

      <SearchBar
        search={search}
        onSearchChange={setSearch}
        onReset={() => { setSearch(''); setFilterCategory(''); setPage(1); }}
        placeholder="Cari dokumen..."
        debounceMs={300}
        onDebouncedSearch={() => setPage(1)}
      >
        <FilterSelect
          value={filterCategory}
          onChange={v => { setFilterCategory(v); setPage(1); }}
          options={categories.map(c => ({ value: c.id, label: c.nama }))}
          placeholder="Semua Kategori"
        />
      </SearchBar>

      <DataTable
        columns={[
          { label: 'Judul' },
          { label: 'Kategori', hidden: 'hidden sm:table-cell' },
          { label: 'Uploader', hidden: 'hidden md:table-cell' },
          { label: 'Tanggal', hidden: 'hidden lg:table-cell' },
          { label: 'Aksi', align: 'right' },
        ]}
        data={data}
        loading={loading}
        empty={{
          icon: FolderOpen,
          ...buildEmptyMessage('dokumen organisasi', !!(search || filterCategory), () => { setSearch(''); setFilterCategory(''); setPage(1); }),
        }}
        page={page}
        totalPages={meta.totalPages}
        total={meta.total}
        onPageChange={handlePageChange}
        colSpan={5}
        renderRow={(row: OrgDocumentRow) => (
          <tr key={row.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
            <td className="px-4 py-3">
              <span className="font-medium text-gray-900 dark:text-white">{row.judul}</span>
            </td>
            <td className="px-4 py-3 hidden sm:table-cell">
              <span className="px-2 py-0.5 rounded-full text-xs bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400">
                {row.kategori?.nama || '-'}
              </span>
            </td>
            <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden md:table-cell">
              {row.uploader?.namaLengkap || '-'}
            </td>
            <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden lg:table-cell">
              {new Date(row.createdAt).toLocaleDateString('id-ID')}
            </td>
            <td className="px-4 py-3 text-right">
              <div className="flex items-center justify-end gap-1">
                <button
                  className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 rounded-md transition-colors"
                  title="Download"
                >
                  <Download size={15} />
                </button>
                <button
                  className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                  title="Detail"
                >
                  <Eye size={15} />
                </button>
              </div>
            </td>
          </tr>
        )}
      />
    </div>
  );
}
