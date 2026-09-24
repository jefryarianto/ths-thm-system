'use client';

import { useState, useRef, useEffect } from 'react';
import { type LucideIcon, ArrowUp, ArrowDown } from 'lucide-react';
import TableSkeleton from './table-skeleton';
import EmptyState from './empty-state';
import Pagination from './pagination';

export interface Column<TRow = Record<string, unknown>> {
  /** Unique key for the column. Falls back to label if not provided. */
  key?: string;
  label: string;
  /** Optional custom header cell content (e.g. select-all checkbox). */
  header?: () => React.ReactNode;
  render?: (item: TRow) => React.ReactNode;
  /** Responsive visibility class e.g. 'hidden sm:table-cell' */
  hidden?: string;
  align?: 'left' | 'right' | 'center';
}

export interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
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
  /** Render function for mobile card view (shown on screens < md) */
  renderMobileCard?: (item: T, index: number) => React.ReactNode;
  /** Current sort state */
  sort?: SortConfig | null;
  /** Callback when sort changes */
  onSort?: (sort: SortConfig | null) => void;
  /** Data completeness indicator for rows */
  dataComplete?: (item: T) => boolean;
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
  renderMobileCard,
  sort,
  onSort,
  dataComplete,
}: DataTableProps<T>) {
  // Determine if we should auto-render rows using column render functions
  const hasColumnRender = columns.some((c) => c.render);
  const autoRender = hasColumnRender && !renderRow;
  const effectiveColSpan = colSpan || columns.length + (actions ? 1 : 0);
  const showDataComplete = typeof dataComplete === 'function';

  const handleSort = (colKey: string) => {
    if (!onSort) return;
    const newDirection = sort?.key === colKey 
      ? (sort.direction === 'asc' ? 'desc' : 'asc')
      : 'asc';
    onSort({ key: colKey, direction: newDirection });
  };

  // Keyboard navigation state
  const [activeRow, setActiveRow] = useState(0);
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const table = tableRef.current;
    if (!table) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!autoRender || !onRowClick) return;

      const currentIndex = activeRow;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          if (currentIndex < data.length - 1) {
            setActiveRow((prev: number) => prev + 1);
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (currentIndex > 0) {
            setActiveRow((prev: number) => prev - 1);
          }
          break;
        case 'Enter':
          e.preventDefault();
          onRowClick(data[currentIndex]);
          break;
        case 'Home':
          e.preventDefault();
          setActiveRow(0);
          break;
        case 'End':
          e.preventDefault();
          setActiveRow(data.length - 1);
          break;
      }
    };

    table.addEventListener('keydown', handleKeyDown);

    return () => {
      table.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeRow, data, autoRender, onRowClick]);

  useEffect(() => {
    if (activeRow > 0 && autoRender) {
      const row = tableRef.current?.querySelector(`[data-row-index="${activeRow}"]`);
      row?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeRow, autoRender]);

  // Reset active row when page changes
  useEffect(() => {
    setActiveRow(0);
  }, [page]);

  return (
    <div className="bg-surface rounded-2xl border border-border shadow-elegant">

      {/* Mobile Card View */}
      {renderMobileCard && (
        <div className="md:hidden divide-y divide-border">
          {loading ? (
            <div className="p-6 text-center text-muted text-sm">Memuat data...</div>
          ) : data.length === 0 ? (
            <div className="p-6 text-center text-muted text-sm">{empty.message}</div>
          ) : (
            data.map((item, idx) => (
              <div key={((item as Record<string, unknown>).id as string) || idx} className="p-4">
                {renderMobileCard(item, idx)}
              </div>
            ))
          )}
        </div>
      )}
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto overflow-y-visible">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-surface-variant">
            <tr className="border-b border-border">
              {columns.map((col, i) => (
                <th
                  key={col.key || i}
                  className={`px-4 py-3 font-medium text-muted whitespace-nowrap text-xs uppercase tracking-wider ${col.hidden || ''} ${
                    col.align === 'right'
                      ? 'text-right'
                      : col.align === 'center'
                        ? 'text-center'
                        : 'text-left'
                  }`}
                >
                  <div className={`flex items-center gap-2 group ${col.align === 'right' ? 'justify-end' : ''}`}>
                    {col.header ? col.header() : col.label}
                    {onSort && col.key && (
                      <button
                        onClick={() => handleSort(col.key as string)}
                        className="p-0.5 hover:bg-surface-variant rounded transition-colors"
                        title="Sort column"
                        aria-label={`Sort by ${col.label}`}
                      >
                        {sort?.key === col.key ? (
                          sort.direction === 'asc' ? (
                            <ArrowUp size={14} className="text-primary" />
                          ) : (
                            <ArrowDown size={14} className="text-primary" />
                          )
                        ) : (
                          <ArrowUp size={14} className="text-muted opacity-0 group-hover:opacity-100" />
                        )}
                      </button>
                    )}
                  </div>
                </th>
              ))}
              {actions && (
                <th className="px-4 py-3 font-medium text-muted whitespace-nowrap text-xs uppercase tracking-wider text-right">
                  Aksi
                </th>
              )}
              {showDataComplete && (
                <th className="px-4 py-3 font-medium text-muted whitespace-nowrap text-xs uppercase tracking-wider">
                  Data
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
                  className={`border-b border-border hover:bg-surface-variant transition-colors${onRowClick ? ' cursor-pointer' : ''}`}
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
                   {showDataComplete && (
                     <td className="px-4 py-3 text-center">
                       {dataComplete(item) ? (
                         <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
                           Lengkap
                         </span>
                       ) : (
                         <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400">
                           Belum Lengkap
                         </span>
                       )}
                     </td>
                   )}
                 </tr>
               ))
             ) : renderRow ? (
               data.map((item, i) => renderRow(item, i))
            ) : (
              <tr>
                <td
                  colSpan={effectiveColSpan}
                  className="px-4 py-12 text-center text-muted"
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
