export function StatCardSkeleton() {
  return (
    <div className="bg-surface rounded-xl border border-border p-5 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-3 bg-surface-variant rounded w-24" />
          <div className="h-7 bg-surface-variant rounded w-16" />
        </div>
        <div className="h-12 w-12 bg-surface-variant rounded-xl" />
      </div>
    </div>
  );
}

export default function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 bg-surface-variant rounded w-48 animate-pulse mb-1" />
          <div className="h-4 bg-surface-variant rounded w-64 animate-pulse" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-surface rounded-xl border border-border p-6 animate-pulse h-80" />
        <div className="bg-surface rounded-xl border border-border p-6 animate-pulse h-80" />
      </div>
    </div>
  );
}
