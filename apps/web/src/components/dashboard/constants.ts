import {
  Users,
  UserPlus,
  GraduationCap,
  CreditCard,
  AlertCircle,
  Calendar,
  Dumbbell,
  ClipboardCheck,
  FileText,
  Bell,
  Mail,
  TrendingUp,
  Shield,
} from 'lucide-react';

export const STATUS_COLORS: Record<string, string> = {
  aktif: '#22c55e',
  nonaktif: '#eab308',
  pindah: '#3b82f6',
  keluar: '#ef4444',
  meninggal: '#6b7280',
};

export const STATUS_LABELS: Record<string, string> = {
  aktif: 'Aktif',
  nonaktif: 'Nonaktif',
  pindah: 'Pindah',
  keluar: 'Keluar',
  meninggal: 'Meninggal',
};

export const colorMap: Record<string, { bg: string; icon: string; ring: string }> = {
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-950',
    icon: 'text-blue-600 dark:text-blue-400',
    ring: 'ring-blue-100 dark:ring-blue-800',
  },
  green: {
    bg: 'bg-green-50 dark:bg-green-950',
    icon: 'text-green-600 dark:text-green-400',
    ring: 'ring-green-100 dark:ring-green-800',
  },
  yellow: {
    bg: 'bg-yellow-50 dark:bg-yellow-950',
    icon: 'text-yellow-600 dark:text-yellow-400',
    ring: 'ring-yellow-100 dark:ring-yellow-800',
  },
  orange: {
    bg: 'bg-orange-50 dark:bg-orange-950',
    icon: 'text-orange-600 dark:text-orange-400',
    ring: 'ring-orange-100 dark:ring-orange-800',
  },
  red: {
    bg: 'bg-red-50 dark:bg-red-950',
    icon: 'text-red-600 dark:text-red-400',
    ring: 'ring-red-100 dark:ring-red-800',
  },
  purple: {
    bg: 'bg-purple-50 dark:bg-purple-950',
    icon: 'text-purple-600 dark:text-purple-400',
    ring: 'ring-purple-100 dark:ring-purple-800',
  },
  indigo: {
    bg: 'bg-indigo-50 dark:bg-indigo-950',
    icon: 'text-indigo-600 dark:text-indigo-400',
    ring: 'ring-indigo-100 dark:ring-indigo-800',
  },
  teal: {
    bg: 'bg-teal-50 dark:bg-teal-950',
    icon: 'text-teal-600 dark:text-teal-400',
    ring: 'ring-teal-100 dark:ring-teal-800',
  },
  pink: {
    bg: 'bg-pink-50 dark:bg-pink-950',
    icon: 'text-pink-600 dark:text-pink-400',
    ring: 'ring-pink-100 dark:ring-pink-800',
  },
  cyan: {
    bg: 'bg-cyan-50 dark:bg-cyan-950',
    icon: 'text-cyan-600 dark:text-cyan-400',
    ring: 'ring-cyan-100 dark:ring-cyan-800',
  },
  amber: {
    bg: 'bg-amber-50 dark:bg-amber-950',
    icon: 'text-amber-600 dark:text-amber-400',
    ring: 'ring-amber-100 dark:ring-amber-800',
  },
  slate: {
    bg: 'bg-gray-50 dark:bg-gray-800',
    icon: 'text-gray-600 dark:text-gray-400',
    ring: 'ring-gray-100 dark:ring-gray-700',
  },
};

export interface DashboardData {
  totalMembers: number;
  totalCandidates: number;
  totalGraduated: number;
  totalDuesCollected: number;
  pendingValidasi: number;
  incompleteData: number;
  totalKegiatan: number;
  totalLatihan: number;
  totalKlaim: number;
  totalDokumen: number;
  totalPendaftaran: number;
  totalUsers: number;
  memberStatus: Array<{ status: string; count: number }>;
  monthlyDues: Array<{ bulan: string; jumlah: number; transaksi: number }>;
  recentNotifications: Array<{
    id: string;
    judul: string;
    isi: string;
    tipe: string;
    isRead: boolean;
    createdAt: string;
  }>;
  emailSummary: {
    totalSent: number;
    totalFailed: number;
    totalSkipped: number;
    totalSuppressed: number;
  } | null;
}

export function formatRupiah(value: number) {
  if (value >= 1_000_000) return `Rp ${(value / 1_000_000).toFixed(1)}jt`;
  if (value >= 1_000) return `Rp ${(value / 1_000).toFixed(0)}rb`;
  return `Rp ${value.toLocaleString('id-ID')}`;
}

export function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Baru saja';
  if (mins < 60) return `${mins}m lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}j lalu`;
  const days = Math.floor(hours / 24);
  return `${days}h lalu`;
}

export const statConfigs = [
  {
    key: 'totalMembers' as const,
    label: 'Total Anggota',
    icon: Users,
    color: 'blue' as const,
    href: '/members',
  },
  {
    key: 'totalCandidates' as const,
    label: 'Calon Anggota',
    icon: UserPlus,
    color: 'purple' as const,
    href: '/candidates',
  },
  {
    key: 'totalGraduated' as const,
    label: 'Lulus Pendadaran',
    icon: GraduationCap,
    color: 'green' as const,
    href: '/graduations',
  },
  {
    key: 'totalDuesCollected' as const,
    label: 'Iuran Terkumpul',
    icon: CreditCard,
    color: 'yellow' as const,
    isCurrency: true,
    href: '/dues',
  },
  {
    key: 'pendingValidasi' as const,
    label: 'Menunggu Validasi',
    icon: AlertCircle,
    color: 'orange' as const,
    href: '/members',
  },
  {
    key: 'incompleteData' as const,
    label: 'Data Tidak Lengkap',
    icon: AlertCircle,
    color: 'red' as const,
    href: '/members/incomplete',
  },
  {
    key: 'totalKegiatan' as const,
    label: 'Kegiatan Aktif',
    icon: Calendar,
    color: 'indigo' as const,
    href: '/activities',
  },
  {
    key: 'totalLatihan' as const,
    label: 'Total Latihan',
    icon: Dumbbell,
    color: 'teal' as const,
    href: '/trainings',
  },
  {
    key: 'totalKlaim' as const,
    label: 'Klaim Diproses',
    icon: ClipboardCheck,
    color: 'pink' as const,
    href: '/claims',
  },
  {
    key: 'totalDokumen' as const,
    label: 'Dokumen Tersedia',
    icon: FileText,
    color: 'cyan' as const,
    href: '/documents',
  },
  {
    key: 'totalPendaftaran' as const,
    label: 'Pendaftaran Baru',
    icon: UserPlus,
    color: 'amber' as const,
    href: '/registrations',
  },
  {
    key: 'totalUsers' as const,
    label: 'Total Pengguna',
    icon: Shield,
    color: 'slate' as const,
    href: '/users',
  },
];

export const quickActions = [
  { label: 'Tambah Anggota', href: '/members', icon: Users, desc: 'Input anggota baru' },
  { label: 'Buat Kegiatan', href: '/activities', icon: Calendar, desc: 'Jadwalkan kegiatan baru' },
  { label: 'Catat Iuran', href: '/dues', icon: CreditCard, desc: 'Input pembayaran iuran' },
  { label: 'Kirim Notifikasi', href: '/notifications', icon: Bell, desc: 'Kirim pengumuman' },
  { label: 'Email Admin', href: '/settings/email', icon: Mail, desc: 'Kelola pengiriman email' },
  { label: 'Laporan', href: '/reports', icon: TrendingUp, desc: 'Lihat laporan detail' },
];
