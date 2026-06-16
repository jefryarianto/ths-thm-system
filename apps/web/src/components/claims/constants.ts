export const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-400',
  diproses: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400',
  disetujui: 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400',
  ditolak: 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400',
};

export const STATUS_OPTIONS = [
  { value: '', label: 'Semua Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'diproses', label: 'Diproses' },
  { value: 'disetujui', label: 'Disetujui' },
  { value: 'ditolak', label: 'Ditolak' },
];
