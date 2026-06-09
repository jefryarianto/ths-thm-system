'use client';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  colSpan?: number;
}

const WIDTHS = ['60%', '75%', '50%', '85%', '65%', '70%', '55%'];

export default function TableSkeleton({ rows = 5, columns = 5, colSpan }: TableSkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b border-gray-100 dark:border-gray-700/50">
          {Array.from({ length: colSpan || columns }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" style={{ width: WIDTHS[j % WIDTHS.length] }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
