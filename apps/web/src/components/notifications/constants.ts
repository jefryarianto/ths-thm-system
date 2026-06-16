export const TIPE_OPTIONS = [
  { value: '', label: 'Semua Tipe' },
  { value: 'umum', label: 'Umum' },
  { value: 'welcome', label: 'Selamat Datang' },
  { value: 'data_incomplete', label: 'Data Tidak Lengkap' },
  { value: 'reminder_latihan', label: 'Reminder Latihan' },
  { value: 'reminder_pendadaran', label: 'Reminder Pendadaran' },
  { value: 'reminder_iuran', label: 'Reminder Iuran' },
  { value: 'status_klaim', label: 'Status Klaim' },
  { value: 'dokumen_ready', label: 'Dokumen Ready' },
];

/** Filtered list of notification types (excludes the empty filter placeholder). */
export const NOTIF_TYPES = TIPE_OPTIONS.filter((t) => t.value);

export const tipeColors: Record<string, string> = {
  umum: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
  welcome: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400',
  data_incomplete: 'bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-400',
  reminder_latihan: 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400',
  reminder_pendadaran: 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400',
  reminder_iuran: 'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-400',
  status_klaim: 'bg-pink-100 dark:bg-pink-950 text-pink-700 dark:text-pink-400',
  dokumen_ready: 'bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-400',
};
