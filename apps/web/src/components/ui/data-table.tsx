'use client';

import { type LucideIcon } from 'lucide-react';
import TableSkeleton from './table-skeleton';
import EmptyState from './empty-state';
import Pagination from './pagination';

export interface Column<TRow = Record<string, unknown>> {
  /** Unique key for the column. Falls back to label if not provided. */
  key?: string;
  label: string;
  render?: (item: TRow) => React.ReactNode;
  /** Responsive visibility class e.g. 'hidden sm:table-cell' */
  hidden?: string;
  align?: 'left' | 'right' | 'center';
}

interface EmptyConfig {
  icon: LucideIcon;
  message: string;
  title?: string;
  action?: { label: string; onClick: () => void };
}

interface DataTableProps<T> {
  /** Column definitions. If render functions are provided, rows auto-generate. */
  columns: Column<T>[];
  data: T[];
  loading: boolean;
  empty: EmptyConfig;
  page: number;
  totalPages: number;
  total: number;
  /** Callback when page changes. Falls back to no-op if not provided. */
  onPageChange?: (page: number) => void;
  /** Fallback when columns don't have render functions. Receives item + index. */
  renderRow?: (item: T, index: number) => React.ReactNode;
  /** Row click handler (only works in column-based auto-render mode) */
  onRowClick?: (item: T) => void;
  /** Optional actions column rendered at the end of each row (only in column-based mode) */
  actions?: (item: T) => React.ReactNode;
  /** Override auto-calculated colSpan */
  colSpan?: number;
  skeletonRows?: number;
}

export default function DataTable<T>({
  columns,
  data,
  loading,
  empty,
  page,
  totalPages,
  total,
  onPageChange = () => {},
  renderRow,
  onRowClick,
  actions,
  colSpan,
  skeletonRows = 5,
}: DataTableProps<T>) {
  // Determine if we should auto-render rows using column render functions
  const hasColumnRender = columns.some((c) => c.render);
  const autoRender = hasColumnRender && !renderRow;
  const effectiveColSpan = colSpan || columns.length + (actions ? 1 : 0);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="overflow-x-auto overflow-y-visible">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              {columns.map((col, i) => (
                <th
                  key={col.key || i}
                  className={`px-4 py-3 font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap ${col.hidden || ''} ${
                    col.align === 'right'
                      ? 'text-right'
                      : col.align === 'center'
                        ? 'text-center'
                        : 'text-left'
                  }`}
                >
                  {col.label}
                </th>
              ))}
              {actions && (
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap text-right">
                  Aksi
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableSkeleton rows={skeletonRows} columns={effectiveColSpan} />
            ) : data.length === 0 ? (
              <EmptyState
                icon={empty.icon}
                title={empty.title}
                message={empty.message}
                action={empty.action}
                colSpan={effectiveColSpan}
              />
            ) : autoRender ? (
              data.map((item, idx) => (
                <tr
                  key={((item as Record<string, unknown>).id as string) || idx}
                  className={`border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors${onRowClick ? ' cursor-pointer' : ''}`}
                  onClick={() => onRowClick?.(item)}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key || col.label}
                      className={`px-4 py-3 ${col.hidden || ''} ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}
                    >
                      {col.render
                        ? col.render(item)
                        : col.key
                          ? String((item as Record<string, unknown>)[col.key] ?? '-')
                          : '-'}
                    </td>
                  ))}
                  {actions && <td className="px-4 py-3 text-right">{actions(item)}</td>}
                </tr>
              ))
            ) : renderRow ? (
              data.map((item, i) => renderRow(item, i))
            ) : (
              <tr>
                <td
                  colSpan={effectiveColSpan}
                  className="px-4 py-12 text-center text-gray-400 dark:text-gray-500"
                >
                  No render function provided
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} total={total} onPageChange={onPageChange} />
    </div>
  );
}
