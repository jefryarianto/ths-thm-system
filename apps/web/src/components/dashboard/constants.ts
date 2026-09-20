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
  History,
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
    bg: 'bg-primary-50 dark:bg-primary-950',
    icon: 'text-primary-600 dark:text-primary-400',
    ring: 'ring-primary-100 dark:ring-primary-800',
  },
  green: {
    bg: 'bg-success-50 dark:bg-success-950',
    icon: 'text-success-600 dark:text-success-400',
    ring: 'ring-success-100 dark:ring-success-800',
  },
  yellow: {
    bg: 'bg-warning-50 dark:bg-warning-950',
    icon: 'text-warning-600 dark:text-warning-400',
    ring: 'ring-warning-100 dark:ring-warning-800',
  },
  orange: {
    bg: 'bg-warning-50 dark:bg-warning-950',
    icon: 'text-warning-600 dark:text-warning-400',
    ring: 'ring-warning-100 dark:ring-warning-800',
  },
  red: {
    bg: 'bg-error-50 dark:bg-error-950',
    icon: 'text-error-600 dark:text-error-400',
    ring: 'ring-error-100 dark:ring-error-800',
  },
  purple: {
    bg: 'bg-secondary-50 dark:bg-secondary-950',
    icon: 'text-secondary-600 dark:text-secondary-400',
    ring: 'ring-secondary-100 dark:ring-secondary-800',
  },
  indigo: {
    bg: 'bg-primary-50 dark:bg-primary-950',
    icon: 'text-primary-600 dark:text-primary-400',
    ring: 'ring-primary-100 dark:ring-primary-800',
  },
  teal: {
    bg: 'bg-success-50 dark:bg-success-950',
    icon: 'text-success-600 dark:text-success-400',
    ring: 'ring-success-100 dark:ring-success-800',
  },
  pink: {
    bg: 'bg-gold-50 dark:bg-gold-950',
    icon: 'text-gold-600 dark:text-gold-400',
    ring: 'ring-gold-100 dark:ring-gold-800',
  },
  cyan: {
    bg: 'bg-primary-50 dark:bg-primary-950',
    icon: 'text-primary-600 dark:text-primary-400',
    ring: 'ring-primary-100 dark:ring-primary-800',
  },
  amber: {
    bg: 'bg-warning-50 dark:bg-warning-950',
    icon: 'text-warning-600 dark:text-warning-400',
    ring: 'ring-warning-100 dark:ring-warning-800',
  },
  slate: {
    bg: 'bg-surface-variant',
    icon: 'text-muted',
    ring: 'ring-border',
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

export { formatRupiah } from '@/lib/format';

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
  { label: 'Riwayat Email', href: '/settings/email/logs', icon: History, desc: 'Audit isi email terkirim' },
  { label: 'Laporan', href: '/reports', icon: TrendingUp, desc: 'Lihat laporan detail' },
];
