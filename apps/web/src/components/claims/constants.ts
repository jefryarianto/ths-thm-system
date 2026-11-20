export const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-400',
  diproses: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400',
  disetujui: 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400',
  ditolak: 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400',
};

export const STAGE_LABELS: Record<string, string> = {
  ranting: 'Menunggu Admin Ranting',
  wilayah: 'Menunggu Admin Wilayah',
  distrik: 'Menunggu Admin Distrik',
  nasional: 'Menunggu Admin Nasional',
  kta_processing: 'Proses KTA (Admin Distrik)',
};

export const STAGE_COLORS: Record<string, string> = {
  ranting: 'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-400',
  wilayah: 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400',
  distrik: 'bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-400',
  nasional: 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400',
  kta_processing: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400',
};

export const STATUS_OPTIONS = [
  { value: '', label: 'Semua Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'diproses', label: 'Diproses' },
  { value: 'disetujui', label: 'Disetujui' },
  { value: 'ditolak', label: 'Ditolak' },
];

export const STAGE_OPTIONS = [
  { value: '', label: 'Semua Tahap' },
  { value: 'ranting', label: 'Tahap Ranting' },
  { value: 'wilayah', label: 'Tahap Wilayah' },
  { value: 'distrik', label: 'Tahap Distrik' },
  { value: 'nasional', label: 'Tahap Nasional' },
  { value: 'kta_processing', label: 'Proses KTA' },
];
