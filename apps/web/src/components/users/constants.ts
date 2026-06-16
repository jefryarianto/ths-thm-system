export const ROLE_OPTIONS = [
  { value: '', label: 'Semua Role' },
  { value: 'superadmin', label: 'Superadmin' },
  { value: 'admin_distrik', label: 'Admin Distrik' },
  { value: 'admin_wilayah', label: 'Admin Wilayah' },
  { value: 'admin_ranting', label: 'Admin Ranting' },
  { value: 'admin_kegiatan', label: 'Admin Kegiatan' },
  { value: 'penguji', label: 'Penguji' },
  { value: 'anggota', label: 'Anggota' },
];

export const ROLE_BADGES: Record<string, string> = {
  superadmin: 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400',
  admin_distrik: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400',
  admin_wilayah: 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400',
  admin_ranting: 'bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-400',
  admin_kegiatan: 'bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-400',
  penguji: 'bg-pink-100 dark:bg-pink-950 text-pink-700 dark:text-pink-400',
  anggota: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
};

export const ROLE_LABELS: Record<string, string> = {
  superadmin: 'Superadmin',
  admin_distrik: 'Admin Distrik',
  admin_wilayah: 'Admin Wilayah',
  admin_ranting: 'Admin Ranting',
  admin_kegiatan: 'Admin Kegiatan',
  penguji: 'Penguji',
  anggota: 'Anggota',
};
