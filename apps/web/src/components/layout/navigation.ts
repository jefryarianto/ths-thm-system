import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  GraduationCap,
  Dumbbell,
  Calendar,
  FileText,
  Mail,
  CreditCard,
  Bell,
  Settings,
  BadgeCheck,
  ClipboardCheck,
  Wallet,
  Trophy,
  TrendingUp,
  MessageSquare,
  Gauge,
  AlertTriangle,
  Radio,
  ArrowLeftRight,
  Smartphone,
  Database,
  IdCard,
  PenLine,
  Globe,
  BookOpen,
  History,
  KeyRound,
  Waypoints,
  CalendarClock,
  Printer,
  ChartNoAxesColumn,
  Megaphone,
  Newspaper,
  Landmark,
  ClipboardList,
  ShieldCheck,
  Archive,
  FileBarChart,
  ScanLine,
  Siren,
  ListChecks,
  MonitorCog,
} from 'lucide-react';
import { MODULE_PERMISSIONS } from '@/components/auth/can';
import type { Role } from '@/types';

/**
 * Konfigurasi navigasi sidebar dashboard THS-THM.
 * MURNI DATA — menu, href, dan permission TIDAK boleh diubah di sini
 * tanpa sinkronisasi dengan backend (RBAC) & role-redirect.
 */

export interface MenuItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** If true, only show to users with admin-level roles */
  adminOnly?: boolean;
  /** If true, open in a new tab (external/API-hosted pages like Bull Board) */
  external?: boolean;
  /** Minimum role level required to see this menu item (role-based filtering) */
  minRole?: Role;
}

export interface MenuGroup {
  label: string;
  items: MenuItem[];
}

/** Kegiatan dinamis untuk role activity-scoped (admin_kegiatan & penguji) */
export interface AssignedKegiatan {
  id: string;
  nama: string;
  status: string;
}

/** Grup yang terbuka secara default saat login pertama (belum ada preferensi tersimpan) */
export const DEFAULT_OPEN_GROUPS: Record<Role, string[]> = {
  // System admins live in Keanggotaan + Sistem (Users, Settings, Antrean) daily.
  superadmin: ['Utama', 'Keanggotaan', 'Keuangan', 'Komunikasi', 'Sistem'],
  admin_distrik: ['Utama', 'Keanggotaan', 'Keuangan', 'Komunikasi', 'Sistem'],
  admin_wilayah: ['Utama', 'Keanggotaan', 'Organisasi', 'Keuangan', 'Komunikasi'],
  admin_ranting: ['Utama', 'Keanggotaan', 'Keuangan', 'Komunikasi'],
  // Kegiatan organisasi → aktivitas & kalender.
  admin_kegiatan: ['Utama', 'Pelatihan & Penilaian', 'Keuangan', 'Komunikasi'],
  // Penguji bekerja di halaman Penilaian.
  penguji: ['Utama', 'Pelatihan & Penilaian'],
  anggota: ['Utama', 'Aktivitas', 'Keuangan', 'Komunikasi'],
};

export const menuGroups: MenuGroup[] = [
  {
    label: 'Utama',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, minRole: 'penguji' },
      { href: '/activities', label: 'Kegiatan', icon: Calendar, minRole: 'anggota' },
      { href: '/calendar', label: 'Kalender', icon: CalendarClock, minRole: 'anggota' },
      { href: '/forum', label: 'Forum', icon: MessageSquare, minRole: 'anggota' },
      { href: '/notifications', label: 'Notifikasi', icon: Bell, minRole: 'anggota' },
      { href: '/org-chart', label: 'Peta Organisasi', icon: Landmark, minRole: 'anggota' },
      { href: '/documents', label: 'Dokumen', icon: FileText, minRole: 'anggota' },
      { href: '/dues', label: 'Iuran', icon: CreditCard, minRole: 'anggota' },
      { href: '/reports', label: 'Laporan Umum', icon: FileBarChart, minRole: 'admin_ranting' },
      { href: '/content/berita', label: 'Berita', icon: Newspaper, minRole: 'admin_wilayah' },
    ],
  },
  {
    label: 'Keanggotaan',
    items: [
      { href: '/members', label: 'Anggota', icon: Users, minRole: 'admin_ranting' },
      { href: '/members/mutasi', label: 'Mutasi', icon: ArrowLeftRight, minRole: 'admin_ranting' },
      { href: '/candidates', label: 'Calon', icon: UserPlus, minRole: 'admin_kegiatan' },
      { href: '/registrations', label: 'Pendaftaran', icon: ClipboardList, minRole: 'admin_ranting' },
      { href: '/claims', label: 'Klaim', icon: BadgeCheck, minRole: 'admin_ranting' },
      { href: '/letters', label: 'Surat', icon: Mail, minRole: 'admin_ranting' },
    ],
  },
  {
    label: 'Pelatihan',
    items: [
      { href: '/trainings', label: 'Latihan', icon: Dumbbell, minRole: 'admin_ranting' },
      // admin_kegiatan mengelola pendadaran (alur langkah 3)
      { href: '/graduations', label: 'Pendadaran', icon: GraduationCap, minRole: 'admin_kegiatan' },
      // admin_kegiatan mengajukan penguji ke admin distrik (alur langkah 6)
      { href: '/examiners', label: 'Penguji', icon: ShieldCheck, minRole: 'admin_kegiatan' },
      { href: '/assessments', label: 'Penilaian', icon: ClipboardCheck, minRole: 'penguji' },
      { href: '/approvals', label: 'Persetujuan', icon: ClipboardCheck, minRole: 'admin_ranting' },
    ],
  },
  {
    label: 'Organisasi',
    items: [
      { href: '/org-documents', label: 'Dokumen Organisasi', icon: Archive, minRole: 'anggota' },
      { href: '/settings/jabatan', label: 'Jabatan', icon: IdCard, minRole: 'admin_distrik' },
      { href: '/settings/periode', label: 'Periode', icon: CalendarClock, minRole: 'superadmin' },
      { href: '/settings/kepengurusan', label: 'Kepengurusan', icon: Users, minRole: 'admin_wilayah' },
      { href: '/settings/org-chart-editor', label: 'Editor Org Chart', icon: Waypoints, minRole: 'admin_wilayah' },
    ],
  },
  {
    label: 'Keuangan',
    items: [
      { href: '/payments', label: 'Pembayaran', icon: Wallet, minRole: 'admin_ranting' },
    ],
  },
  {
    label: 'Sistem',
    items: [
      { href: '/users', label: 'Pengguna', icon: Users, minRole: 'admin_ranting' },
      { href: '/monitoring', label: 'Monitoring', icon: Gauge, minRole: 'admin_ranting' },
      { href: '/monitoring/alerts', label: 'Alert Thresholds', icon: AlertTriangle, minRole: 'admin_ranting' },
      { href: '/monitoring/incidents', label: 'Incidents', icon: Siren, minRole: 'admin_ranting' },
      { href: '/settings', label: 'Pengaturan', icon: Settings, minRole: 'admin_ranting' },
      { href: '/settings#autentikasi', label: 'Autentikasi', icon: KeyRound, minRole: 'superadmin' },
      { href: '/settings/email', label: 'Email Admin', icon: Mail, minRole: 'admin_distrik' },
      { href: '/settings/email/logs', label: 'Riwayat Email', icon: History, minRole: 'admin_distrik' },
      { href: '/settings/penandatangan', label: 'Penandatangan', icon: PenLine, minRole: 'admin_distrik' },
      { href: '/settings/kartu', label: 'Template Kartu', icon: IdCard, minRole: 'admin_distrik' },
      { href: '/settings/dokumen', label: 'Template Dokumen', icon: Printer, minRole: 'admin_distrik' },
      { href: '/admin/queues', label: 'Antrean', icon: ListChecks, adminOnly: true },
      { href: '/settings/fcm-test', label: 'Pengujian FCM', icon: Smartphone, minRole: 'superadmin' },
      { href: '/settings/sessions', label: 'Manajemen Sesi', icon: MonitorCog, minRole: 'superadmin' },
      { href: '/settings/backup', label: 'Database Backup', icon: Database, minRole: 'superadmin' },
      { href: '/ws-monitor', label: 'WebSocket', icon: Radio, adminOnly: true },
      { href: '/gamification', label: 'Dasbor Gamifikasi', icon: Trophy, minRole: 'admin_ranting' },
      { href: '/gamification/admin', label: 'Admin', icon: ShieldCheck, minRole: 'admin_ranting' },
      { href: '/gamification/scoreboard', label: 'Scoreboard', icon: TrendingUp, minRole: 'admin_kegiatan' },
      { href: '/gamification/report', label: 'Laporan Gamifikasi', icon: ChartNoAxesColumn, minRole: 'admin_ranting' },
      { href: '/gamification/settings', label: 'Pengaturan Gamifikasi', icon: Settings, minRole: 'admin_ranting' },
      { href: '/scan-stats', label: 'Statistik Scan', icon: ScanLine, minRole: 'admin_ranting' },
      { href: '/notifications/report', label: 'Lap. Notifikasi', icon: Megaphone, minRole: 'admin_ranting' },
      { href: '/content/sejarah', label: 'Sejarah', icon: BookOpen, minRole: 'superadmin' },
      { href: '/content/organisasi', label: 'Konten Web Organisasi', icon: Globe, minRole: 'superadmin' },
    ],
  },
];

/** Flattened untuk lookup judul halaman di header */
export const menuItems = menuGroups.flatMap((g) => g.items);

/** Judul halaman untuk header berdasarkan pathname aktif */
export function getPageTitle(pathname: string | null | undefined): string {
  if (!pathname) return 'Dashboard';
  // Ambil kecocokan prefix TERPANJANG: /settings/email → "Email Admin",
  // bukan "/settings" → "Pengaturan".
  const matches = menuItems
    .filter((m) => pathname.startsWith(m.href))
    .sort((a, b) => b.href.length - a.href.length);
  return matches[0]?.label || 'Dashboard';
}

export function getModuleKey(href: string): string | null {
  const parts = href.replace(/^\//, '').split('/');
  const first = parts[0];
  if (!first) return null;

  if (first === 'admin' && parts[1] === 'queues') return 'queues';
  if (first === 'ws-monitor') return 'wsMonitor';
  if (first === 'audit-logs') return 'auditLogs';
  if (first === 'org-chart') return 'org-chart';
  if (first === 'org-documents') return 'org-documents';
  if (first === 'scan-stats') return 'scan-stats';
  if (first === 'forum') return 'forum';
  if (first === 'notifications') return 'notifications';
  if (first === 'gamification') return 'gamification';
  if (first === 'settings') return 'settings';
  if (first === 'users') return 'users';

  return first;
}

interface FilterOptions {
  isAdmin: boolean;
  hasMinRole: (role: Role) => boolean;
}

/**
 * Filter grup menu berdasarkan role & permission — LOGIKA TIDAK BERUBAH:
 * 1. adminOnly → admin-level role
 * 2. minRole → role hierarchy check
 * 3. MODULE_PERMISSIONS[module].view → fallback role minimum
 * Grup yang tidak punya item terlihat akan dibuang.
 */
export function filterVisibleGroups(
  groups: MenuGroup[],
  { isAdmin, hasMinRole }: FilterOptions,
): MenuGroup[] {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        // Admin-only items (queues, WebSocket) → admin-level roles
        if (item.adminOnly && !isAdmin) return false;
        // Role-based filtering: hide if below the item's minimum role
        if (item.minRole && !hasMinRole(item.minRole)) return false;
        // Module-level view permission fallback
        const moduleKey = getModuleKey(item.href);
        if (moduleKey) {
          const requiredViewRole = MODULE_PERMISSIONS[moduleKey]?.view;
          if (requiredViewRole && !hasMinRole(requiredViewRole)) return false;
        }
        return true;
      }),
    }))
    .filter((group) => group.items.length > 0);
}
