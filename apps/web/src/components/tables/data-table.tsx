'use client';

import { useState } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';

interface DataTableProps<T> {
  data: T[];
  columns: { key: string; label: string; render?: (item: T) => React.ReactNode }[];
  loading?: boolean;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  page?: number;
  totalPages?: number;
  total?: number;
  onPageChange?: (page: number) => void;
  actions?: (item: T) => React.ReactNode;
  onRowClick?: (item: T) => void;
  emptyText?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function DataTable<T extends Record<string, any>>({
  data, columns, loading, searchPlaceholder = 'Cari...', onSearch,
  page = 1, totalPages = 1, total = 0, onPageChange, actions, onRowClick, emptyText = 'Tidak ada data',
}: DataTableProps<T>) {
  const [query, setQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(query);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      {onSearch && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
              <input
                type="text" value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="pl-9 pr-3 py-1.5 w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button type="submit" className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md text-sm hover:bg-gray-200 dark:hover:bg-gray-600">Cari</button>
          </form>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              {columns.map((col) => (
                <th key={col.key} className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{col.label}</th>
              ))}
              {actions && <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Aksi</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              <tr><td colSpan={columns.length + (actions ? 1 : 0)} className="text-center py-12 text-gray-400 dark:text-gray-500 text-sm">Memuat data...</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={columns.length + (actions ? 1 : 0)} className="text-center py-12 text-gray-400 dark:text-gray-500 text-sm">{emptyText}</td></tr>
            ) : (
              data.map((item, idx) => (
                <tr key={item.id || idx} className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition${onRowClick ? ' cursor-pointer' : ''}`} onClick={() => onRowClick?.(item)}>
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300">
                      {col.render ? col.render(item) : item[col.key]}
                    </td>
                  ))}
                  {actions && <td className="px-4 py-2.5 text-right">{actions(item)}</td>}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-200 dark:border-gray-700">
          <span className="text-xs text-gray-500 dark:text-gray-400">Total {total} data</span>
          <div className="flex items-center gap-1">
            <button onClick={() => onPageChange?.(Math.max(1, page - 1))} disabled={page === 1} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 text-gray-600 dark:text-gray-400"><ChevronLeft size={16} /></button>
            <span className="text-xs text-gray-600 dark:text-gray-400 px-2">{page} / {totalPages}</span>
            <button onClick={() => onPageChange?.(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 text-gray-600 dark:text-gray-400"><ChevronRight size={16} /></button>
          </div>
        </div>
      )}
    </div>
  );
}