'use client';

import { type LucideIcon } from 'lucide-react';
import TableSkeleton from './table-skeleton';
import EmptyState from './empty-state';
import Pagination from './pagination';

interface Column {
  label: string;
  align?: 'left' | 'right' | 'center';
  /** Responsive visibility class e.g. 'hidden sm:table-cell' */
  hidden?: string;
}

interface EmptyConfig {
  icon: LucideIcon;
  message: string;
  title?: string;
  action?: { label: string; onClick: () => void };
}

interface DataTableProps<T> {
  columns: Column[];
  data: T[];
  loading: boolean;
  empty: EmptyConfig;
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
  colSpan: number;
  skeletonRows?: number;
  renderRow: (item: T, index: number) => React.ReactNode;
}

export default function DataTable<T>({
  columns,
  data,
  loading,
  empty,
  page,
  totalPages,
  total,
  onPageChange,
  colSpan,
  skeletonRows = 5,
  renderRow,
}: DataTableProps<T>) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              {columns.map((col, i) => (
                <th
                  key={i}
                  className={`px-4 py-3 font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap ${col.hidden || ''} ${
                    col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                  }`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableSkeleton rows={skeletonRows} columns={colSpan} />
            ) : data.length === 0 ? (
              <EmptyState icon={empty.icon} title={empty.title} message={empty.message} action={empty.action} colSpan={colSpan} />
            ) : (
              data.map((item, i) => renderRow(item, i))
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} total={total} onPageChange={onPageChange} />
    </div>
  );
}
