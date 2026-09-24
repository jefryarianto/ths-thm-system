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

/**
 * Warna chart Command Center — HANYA dari semantic tokens Tahap 1.
 * - Aktif/Sukses → Success #1B7F4B · Nonaktif/Pending → Warning #8A6200
 * - Navigasi/pindah → Info #2B63E6 · Keluar/destruktif → Error #BA1A1A
 * - Netral → Border-dark #334155 (tetap terbaca di dua tema)
 */
export const STATUS_COLORS: Record<string, string> = {
  aktif: '#1B7F4B',
  nonaktif: '#8A6200',
  pindah: '#2B63E6',
  keluar: '#BA1A1A',
  meninggal: '#334155',
};

export const STATUS_LABELS: Record<string, string> = {
  aktif: 'Aktif',
  nonaktif: 'Nonaktif',
  pindah: 'Pindah',
  keluar: 'Keluar',
  meninggal: 'Meninggal',
};

/**
 * Enam accent semantik yang menjadi satu-satunya palet warna dashboard.
 * Alias lama (yellow/orange/amber/teal/cyan/indigo/pink) tetap diterima
 * untuk menjaga kompatibilitas konfig lama — semuanya dipetakan ke
 * salah satu dari token semantik di bawah.
 */
export type AccentKey =
  | 'primary'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'secondary'
  | 'gold'
  | 'slate';

export const colorMap: Record<string, { bg: string; icon: string; ring: string }> = {
  primary: {
    bg: 'bg-primary-50 dark:bg-primary-950',
    icon: 'text-primary-600 dark:text-primary-400',
    ring: 'ring-primary-100 dark:ring-primary-800',
  },
  success: {
    bg: 'bg-success-50 dark:bg-success-950',
    icon: 'text-success-600 dark:text-success-400',
    ring: 'ring-success-100 dark:ring-success-800',
  },
  warning: {
    bg: 'bg-warning-50 dark:bg-warning-950',
    icon: 'text-warning-600 dark:text-warning-400',
    ring: 'ring-warning-100 dark:ring-warning-800',
  },
  error: {
    bg: 'bg-error-50 dark:bg-error-950',
    icon: 'text-error-600 dark:text-error-400',
    ring: 'ring-error-100 dark:ring-error-800',
  },
  info: {
    bg: 'bg-info-50 dark:bg-info-950',
    icon: 'text-info-600 dark:text-info-400',
    ring: 'ring-info-100 dark:ring-info-800',
  },
  secondary: {
    bg: 'bg-secondary-50 dark:bg-secondary-950',
    icon: 'text-secondary-600 dark:text-secondary-400',
    ring: 'ring-secondary-100 dark:ring-secondary-800',
  },
  gold: {
    bg: 'bg-gold-50 dark:bg-gold-950',
    icon: 'text-gold-600 dark:text-gold-400',
    ring: 'ring-gold-100 dark:ring-gold-800',
  },
  slate: {
    bg: 'bg-surface-variant',
    icon: 'text-muted',
    ring: 'ring-border',
  },
};

// ── Alias nama warna lama → token semantik ──
const ACCENT_ALIASES: Record<string, AccentKey> = {
  blue: 'primary',
  indigo: 'primary',
  cyan: 'primary',
  green: 'success',
  teal: 'success',
  yellow: 'warning',
  orange: 'warning',
  amber: 'warning',
  red: 'error',
  purple: 'secondary',
  pink: 'gold',
};

/** Resolusi accent aman: kembali ke 'primary' bila key tak dikenal. */
export function resolveAccent(key: string | undefined): AccentKey {
  if (!key) return 'primary';
  if (key in colorMap) return key as AccentKey;
  return ACCENT_ALIASES[key] ?? 'primary';
}

/**
 * Kelas strip + ikon untuk SecondaryStats.
 * `pending` dibedakan dari `warning` (bar warning-300) agar kedua severity
 * tetap dapat dibedakan secara visual.
 */
export const ACCENT_CLASSES: Record<string, { icon: string; bar: string }> = {
  primary: { icon: 'bg-primary-container text-primary-700', bar: 'bg-primary' },
  success: { icon: 'bg-success-50 text-success-700', bar: 'bg-success' },
  warning: { icon: 'bg-warning-50 text-warning-700', bar: 'bg-warning' },
  error: { icon: 'bg-error-50 text-error-700', bar: 'bg-error' },
  info: { icon: 'bg-info-50 text-info-700', bar: 'bg-info' },
  slate: { icon: 'bg-surface-variant text-muted', bar: 'bg-border' },
  pending: { icon: 'bg-warning-50 text-warning-700', bar: 'bg-warning-300' },
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

/**
 * "Perlu Tindakan" — item yang benar-benar membutuhkan perhatian admin.
 * Semua data dari DashboardData (API /reports/dashboard).
 * Warna: error=red, warning=orange, pending=yellow, info=blue, success=green.
 *
 * `severity` menentukan urutan tampil & intensitas visual:
 *   1 = kritis (menghentikan operasional) … 4 = informatif.
 */
export type ActionItemKey =
  | 'pendingValidasi'
  | 'incompleteData'
  | 'totalPendaftaran'
  | 'totalKlaim'
  | 'totalDokumen';
export interface ActionItemConfig {
  key: ActionItemKey;
  label: string;
  detail: string;
  href: string;
  /** Semantic accent: error | warning | pending | info | success */
  accent: 'error' | 'warning' | 'pending' | 'info' | 'success';
  /** Urutan prioritas tampil (1 = paling mendesak) */
  severity: 1 | 2 | 3 | 4;
  /** Teks aksi spesifik (bukan generik "Lihat detail") */
  cta: string;
  icon: React.ElementType;
}

export const actionItems: ActionItemConfig[] = [
  {
    key: 'incompleteData',
    label: 'Data Tidak Lengkap',
    detail: 'anggota memiliki data belum lengkap',
    href: '/members/incomplete',
    accent: 'error',
    severity: 1,
    cta: 'Lengkapi data',
    icon: AlertCircle,
  },
  {
    key: 'pendingValidasi',
    label: 'Data Anggota',
    detail: 'menunggu validasi',
    href: '/members',
    accent: 'warning',
    severity: 2,
    cta: 'Validasi sekarang',
    icon: ClipboardCheck,
  },
  {
    key: 'totalPendaftaran',
    label: 'Calon Anggota',
    detail: 'pendaftaran menunggu verifikasi',
    href: '/candidates',
    accent: 'pending',
    severity: 3,
    cta: 'Verifikasi',
    icon: UserPlus,
  },
  {
    key: 'totalKlaim',
    label: 'Klaim Diproses',
    detail: 'klaim sedang diproses',
    href: '/claims',
    accent: 'info',
    severity: 4,
    cta: 'Proses klaim',
    icon: ClipboardCheck,
  },
];

export interface QuickActionConfig {
  label: string;
  href: string;
  icon: React.ElementType;
  desc: string;
  /** Module + action for permission gate */
  module: string;
  action: 'view' | 'create' | 'edit' | 'delete' | 'export' | 'admin';
  /** Pengelompokan: 'create' = aksi input harian, 'ops' = operasional/administratif */
  group: 'create' | 'ops';
}

export const quickActions: QuickActionConfig[] = [
  // ── Aksi input harian (form langsung, bukan halaman list) ──
  { label: 'Tambah Anggota', href: '/members/new', icon: Users, desc: 'Input anggota baru', module: 'members', action: 'create', group: 'create' },
  { label: 'Buat Kegiatan', href: '/activities/new', icon: Calendar, desc: 'Jadwalkan kegiatan baru', module: 'activities', action: 'create', group: 'create' },
  { label: 'Catat Iuran', href: '/dues/new', icon: CreditCard, desc: 'Input pembayaran iuran', module: 'dues', action: 'create', group: 'create' },
  { label: 'Kirim Notifikasi', href: '/notifications', icon: Bell, desc: 'Kirim pengumuman', module: 'notifications', action: 'create', group: 'create' },
  { label: 'Import Anggota', href: '/members/import', icon: UserPlus, desc: 'Import massal dari CSV', module: 'members', action: 'create', group: 'create' },
  { label: 'Buat Surat', href: '/letters/outgoing/new', icon: Mail, desc: 'Buat surat keluar', module: 'letters', action: 'create', group: 'create' },
  // ── Operasional (analitik & administratif) ──
  { label: 'Laporan', href: '/reports', icon: TrendingUp, desc: 'Lihat laporan detail', module: 'reports', action: 'view', group: 'ops' },
  { label: 'Email Admin', href: '/settings/email', icon: Mail, desc: 'Kelola pengiriman email', module: 'settings', action: 'admin', group: 'ops' },
  { label: 'Riwayat Email', href: '/settings/email/logs', icon: History, desc: 'Audit isi email terkirim', module: 'settings', action: 'admin', group: 'ops' },
];

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

/**
 * Command Center: 4 PRIMARY KPI (hero).
 * `color`: kunci colorMap — hanya token semantik.
 *
 * Catatan label: `totalKegiatan` adalah JUMLAH SELURUH kegiatan
 * (bukan hanya yang berstatus aktif), sehingga ditulis "Total Kegiatan"
 * agar tidak menyesatkan admin.
 */
export const statConfigs = [
  {
    key: 'totalMembers' as const,
    label: 'Total Anggota',
    icon: Users,
    color: 'primary' as const,
    cta: 'Kelola anggota',
    href: '/members',
  },
  {
    key: 'totalCandidates' as const,
    label: 'Calon Anggota',
    icon: UserPlus,
    color: 'secondary' as const,
    cta: 'Lihat calon',
    href: '/candidates',
  },
  {
    key: 'totalKegiatan' as const,
    label: 'Total Kegiatan',
    icon: Calendar,
    color: 'info' as const,
    cta: 'Lihat kegiatan',
    href: '/activities',
  },
  {
    key: 'totalDuesCollected' as const,
    label: 'Iuran Terkumpul',
    icon: CreditCard,
    color: 'success' as const,
    isCurrency: true,
    cta: 'Lihat iuran',
    href: '/dues',
  },
];

/**
 * Secondary statistics — indikator ringkas.
 *
 * Hanya metrik yang TIDAK sudah ditampilkan di "Perlu Tindakan"
 * (pendingValidasi, incompleteData, totalKlaim, totalPendaftaran
 * sudah ada di section tersebut — menampilkannya lagi di sini hanya
 * menambah noise tanpa informasi baru).
 * `accent`: primary | success | warning | error | info | slate.
 */
export const secondaryStats = [
  {
    key: 'totalGraduated' as const,
    label: 'Lulus Pendadaran',
    icon: GraduationCap,
    accent: 'success' as const,
    href: '/graduations',
  },
  {
    key: 'totalLatihan' as const,
    label: 'Total Latihan',
    icon: Dumbbell,
    accent: 'info' as const,
    href: '/trainings',
  },
  {
    key: 'totalDokumen' as const,
    label: 'Dokumen',
    icon: FileText,
    accent: 'primary' as const,
    href: '/documents',
  },
  {
    key: 'totalUsers' as const,
    label: 'Total Pengguna',
    icon: Shield,
    accent: 'slate' as const,
    href: '/users',
  },
];

/**
 * Format Rupiah ringkas untuk axis chart: "Rp 1,5 jt".
 * Recharts YAxis menempati lebar tetap; tanpa pemformatan ringkas,
 * label seperti "Rp 1.500.000" terpotong atau memaksa grafik menyempit.
 */
export function formatCompactRupiah(value: number | string): string {
  const num = Number(value);
  if (!Number.isFinite(num)) return String(value);
  if (num === 0) return '0';
  if (Math.abs(num) >= 1_000_000) return `${(num / 1_000_000).toFixed(1).replace('.', ',')} jt`;
  if (Math.abs(num) >= 1_000) return `${(num / 1_000).toFixed(0)} rb`;
  return String(num);
}

/**
 * Label peran untuk status bar — pengguna membaca "Admin Ranting",
 * bukan "ADMIN_RANTING".
 */
export const ROLE_LABELS: Record<string, string> = {
  anggota: 'Anggota',
  penguji: 'Penguji',
  admin_kegiatan: 'Admin Kegiatan',
  admin_ranting: 'Admin Ranting',
  admin_distrik: 'Admin Distrik',
  admin_wilayah: 'Admin Wilayah',
  superadmin: 'Superadmin',
};
