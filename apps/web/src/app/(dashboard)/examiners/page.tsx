'use client';

import { useEffect, useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import {
  Plus, Search, MoreVertical, UserCheck, RefreshCw, Users,
} from 'lucide-react';
import Pagination from '@/components/ui/pagination';
import TableSkeleton from '@/components/ui/table-skeleton';
import EmptyState from '@/components/ui/empty-state';

interface Examiner {
  id: string;
  email: string;
  namaLengkap: string;
  createdAt: string;
}

export default function ExaminersPage() {
  const [examiners, setExaminers] = useState<Examiner[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 0 });

  const fetchExaminers = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, limit: 10 };
      if (search) params.search = search;
      const { data } = await apiClient.get('/examiners', { params });
      setExaminers(data.data || []);
      setMeta(data.meta || { total: 0, totalPages: 0 });
    } catch { /* ignore */ }
    setLoading(false);
  }, [page, search]);

  useEffect(() => { fetchExaminers(); }, [fetchExaminers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const handlePageChange = (p: number) => {
    if (p >= 1 && p <= meta.totalPages) setPage(p);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Manajemen Penguji</h1>
        <div className="flex gap-2">
          <button
            onClick={() => fetchExaminers()}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <RefreshCw size={14} /> Refresh
          </button>
          <button className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors">
            <Plus size={14} /> Tambah Penguji
          </button>
        </div>
      </div>

      {/* Summary bar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users size={18} className="text-blue-500" />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Total Penguji: <strong className="text-gray-900 dark:text-white">{meta.total}</strong>
          </span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Cari penguji..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Cari
          </button>
          {search && (
            <button
              type="button"
              onClick={() => { setSearch(''); setPage(1); }}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Reset
            </button>
          )}
        </form>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">Nama</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap hidden sm:table-cell">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap hidden md:table-cell">Terdaftar</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton rows={5} columns={4} />
              ) : examiners.length === 0 ? (
                <EmptyState
                  icon={Users}
                  message={search ? 'Tidak ada penguji yang cocok dengan pencarian' : 'Belum ada penguji'}
                  action={search ? { label: 'Reset pencarian', onClick: () => { setSearch(''); setPage(1); } } : undefined}
                  colSpan={4}
                />
              ) : (
                examiners.map((ex) => (
                  <tr key={ex.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-2 font-medium text-gray-900 dark:text-white">
                        <UserCheck size={16} className="text-green-500" />
                        {ex.namaLengkap}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden sm:table-cell">{ex.email}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 hidden md:table-cell">
                      {new Date(ex.createdAt).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors">
                        <MoreVertical size={16} />
                      </button>
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
