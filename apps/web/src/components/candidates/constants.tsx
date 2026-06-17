import { UserPlus, BookOpen, Award, XCircle, AlertCircle } from 'lucide-react';
import DetailRow from '@/components/ui/detail-row';

export const STATUS_STYLES: Record<string, string> = {
  diusulkan:
    'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  mengikuti_pendadaran:
    'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800',
  lulus:
    'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  gagal:
    'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
  dibatalkan:
    'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700',
};

export const STATUS_LABELS: Record<string, string> = {
  diusulkan: 'Diusulkan',
  mengikuti_pendadaran: 'Mengikuti Pendadaran',
  lulus: 'Lulus',
  gagal: 'Gagal',
  dibatalkan: 'Dibatalkan',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const STATUS_ICONS: Record<string, any> = {
  diusulkan: UserPlus,
  mengikuti_pendadaran: BookOpen,
  lulus: Award,
  gagal: XCircle,
  dibatalkan: AlertCircle,
};

export function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function StatusBadge({ status, className = '' }: { status: string; className?: string }) {
  const Icon = STATUS_ICONS[status];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[status] || 'bg-gray-100 text-gray-600 border-gray-200'} ${className}`}
    >
      {Icon && <Icon size={12} />}
      {STATUS_LABELS[status] || status}
    </span>
  );
}

export { DetailRow as InfoRow };

export function DetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-36" />
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700" />
          <div className="flex-1 space-y-2">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32" />
          </div>
        </div>
      </div>
    </div>
  );
}
