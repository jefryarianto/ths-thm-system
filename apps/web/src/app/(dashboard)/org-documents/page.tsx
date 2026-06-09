'use client';

import { useEffect, useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import {
  Plus, RefreshCw, FolderOpen,
  Eye, Download,
} from 'lucide-react';
import Pagination from '@/components/ui/pagination';
import TableSkeleton from '@/components/ui/table-skeleton';
import EmptyState from '@/components/ui/empty-state';
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
  const [data, setData] = useState<OrgDocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState<{ id: string; nama: string }[]>([]);
  const [filterCategory, setFilterCategory] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, limit: 10 };
      if (search) params.search = search;
      if (filterCategory) params.kategoriId = filterCategory;
      const { data: res } = await apiClient.get('/org-documents', { params });
      setData(res.data || []);
      setMeta(res.meta || { total: 0, totalPages: 0 });
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, filterCategory]);

  const fetchCategories = useCallback(async () => {
    try {
      const { data: res } = await apiClient.get('/org-documents/categories/list');
      setCategories(res.data || []);
    } catch {
      // Categories not critical
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const handlePageChange = (p: number) => {
    if (p >= 1 && p <= meta.totalPages) setPage(p);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Dokumen Organisasi</h1>
        <div className="flex gap-2">
          <button
            onClick={() => fetchData()}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <RefreshCw size={14} /> Refresh
          </button>
          <button className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors">
            <Plus size={14} /> Tambah
          </button>
        </div>
      </div>

      <SummaryBar icon={FolderOpen} label="Total Dokumen" total={meta.total} />

      <SearchBar
        search={search}
        onSearchChange={v => { setSearch(v); setPage(1); }}
        onReset={() => { setSearch(''); setFilterCategory(''); setPage(1); }}
        placeholder="Cari dokumen..."
      >
        <FilterSelect
          value={filterCategory}
          onChange={v => { setFilterCategory(v); setPage(1); }}
          options={categories.map(c => ({ value: c.id, label: c.nama }))}
          placeholder="Semua Kategori"
        />
      </SearchBar>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">Judul</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap hidden sm:table-cell">Kategori</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap hidden md:table-cell">Uploader</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap hidden lg:table-cell">Tanggal</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton rows={5} columns={5} />
              ) : data.length === 0 ? (
                <EmptyState
                  icon={FolderOpen}
                  message={search || filterCategory ? 'Tidak ada dokumen yang cocok dengan filter' : 'Belum ada dokumen organisasi'}
                  action={(search || filterCategory) ? { label: 'Reset filter', onClick: () => { setSearch(''); setFilterCategory(''); setPage(1); } } : undefined}
                  colSpan={5}
                />
              ) : (
                data.map((row) => (
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
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination page={page} totalPages={meta.totalPages} total={meta.total} onPageChange={handlePageChange} />
      </div>
    </div>
  );
}
