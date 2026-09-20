'use client';

/**
 * Skeleton for a single stat card - used across dashboard pages (dues, scan-stats, etc.)
 */
export function StatCardSkeleton() {
  return (
    <div className="bg-surface rounded-xl border border-border shadow-sm p-5 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2 flex-1">
          <div className="h-3 bg-surface-variant rounded w-24" />
          <div className="h-7 bg-surface-variant rounded w-16" />
        </div>
        <div className="h-10 w-10 bg-surface-variant rounded-xl" />
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
