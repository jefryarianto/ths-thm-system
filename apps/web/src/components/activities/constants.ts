export const ACTIVITY_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
  published: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400',
  closed: 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400',
  cancelled: 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400',
};

export const ACTIVITY_STATUS_OPTIONS = [
  { value: '', label: 'Semua Status' },
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'closed', label: 'Closed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export const ACTIVITY_TIPE_OPTIONS = [
  { value: '', label: 'Semua Tipe' },
  { value: 'latihan', label: 'Latihan' },
  { value: 'pendadaran', label: 'Pendadaran' },
  { value: 'sosialisasi', label: 'Sosialisasi' },
  { value: 'rapat', label: 'Rapat' },
  { value: 'lainnya', label: 'Lainnya' },
];
