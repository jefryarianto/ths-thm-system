'use client';

export const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-400',
  verified: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400',
  approved: 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400',
  rejected: 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400',
};

export const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  verified: 'Terverifikasi',
  approved: 'Disetujui',
  rejected: 'Ditolak',
};

export const STATUS_OPTIONS = [
  { value: '', label: 'Semua Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'verified', label: 'Terverifikasi' },
  { value: 'approved', label: 'Disetujui' },
  { value: 'rejected', label: 'Ditolak' },
];

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status] || 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
    >
      {STATUS_LABELS[status] || status}
    </span>
  );
}
