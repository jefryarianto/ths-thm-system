'use client';

/**
 * Skeleton for a single stat card — used across dashboard pages (dues, scan-stats, etc.)
 */
export function StatCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2 flex-1">
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24" />
          <div className="h-7 bg-gray-200 dark:bg-gray-700 rounded w-16" />
        </div>
        <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-xl" />
      </div>
    </div>
  );
}

/**
 * Grid of stat card skeletons
 */
export function StatCardGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Skeleton for a chart/panel area — used for bar charts, pie charts, etc.
 */
export function ChartSkeleton({ height = 280 }: { height?: number }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 animate-pulse">
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-2" />
      <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded w-64 mb-6" />
      <div
        className="bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center"
        style={{ height }}
      >
        <div className="h-12 w-12 rounded-full bg-gray-200 dark:bg-gray-600" />
      </div>
    </div>
  );
}
