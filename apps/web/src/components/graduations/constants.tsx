export const STATUS_STYLES: Record<string, string> = {
  draft:
    'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700',
  published:
    'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  closed:
    'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
  cancelled:
    'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
};

export const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  published: 'Published',
  closed: 'Selesai',
  cancelled: 'Dibatalkan',
};

export function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatShort(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function DetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-5 bg-gray-200 rounded w-36" />
      <div className="bg-white rounded-2xl border p-6">
        <div className="h-8 bg-gray-200 rounded w-64 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-gray-200 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
