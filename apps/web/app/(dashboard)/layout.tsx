'use client';

import { ReactNode, useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import apiClient, { clearTokens } from '@/lib/api-client';
import { getSocket, disconnectSocket } from '@/lib/socket';
import {
  Users,
  UserPlus,
  GraduationCap,
  Dumbbell,
  Calendar,
  ChevronDown,
  ChevronRight,
  FileText,
  Mail,
  CreditCard,
  Bell,
  BarChart3,
  Settings,
  LogOut,
  Shield,
  ClipboardCheck,
  Wallet,
  Trophy,
  TrendingUp,
  MessageSquare,
  Activity,
  AlertTriangle,
  Wifi,
  PanelLeftClose,
  PanelLeft,
  User,
  Lock,
  PenLine,
  Globe,
  BookOpen,
  ArrowLeftRight,
  ArrowLeft,
} from 'lucide-react';
import type { LucideProps } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/hooks/use-auth';
import { MODULE_PERMISSIONS } from '@/components/auth/can';
import { UserAvatar } from '@/components/ui/user-avatar';
import { getHomePathForRole } from '@/lib/role-redirect';
import type { Role } from '@/types';

interface DashboardLayoutProps {
  children: ReactNode;
}

interface MenuItem {
  href: string;
  label: string;
  icon: React.ElementType<LucideProps>;
  /** If true, only show to users with admin-level roles */
  adminOnly?: boolean;
  /** If true, open in a new tab (external/API-hosted pages like Bull Board) */
  external?: boolean;
  /** Minimum role level required to see this menu item (role-based filtering) */
  minRole?: Role;
}

interface MenuGroup {
  label: string;
  items: MenuItem[];
}

const SIDEBAR_EXPANDED = 256;
const SIDEBAR_COLLAPSED = 64;

// Groups that stay OPEN by default on first login (no saved preference yet) —
// the most-used sections per role. The rest are collapsed. The active page's
// group always auto-expands anyway, and user toggles are saved to localStorage.
const DEFAULT_OPEN_GROUPS: Record<Role, string[]> = {
  // System admins live in Keanggotaan + Sistem (Users, Settings, Antrean) daily.
  superadmin: ['Utama', 'Keanggotaan', 'Keuangan', 'Komunikasi', 'Sistem'],
  admin_distrik: ['Utama', 'Keanggotaan', 'Keuangan', 'Komunikasi', 'Sistem'],
  admin_wilayah: ['Utama', 'Keanggotaan', 'Keuangan', 'Komunikasi'],
  admin_ranting: ['Utama', 'Keanggotaan', 'Keuangan', 'Komunikasi'],
  // Kegiatan organisasi → aktivitas & kalender.
  admin_kegiatan: ['Utama', 'Aktivitas', 'Keuangan', 'Komunikasi'],
  // Penguji bekerja di halaman Penilaian.
  penguji: ['Utama', 'Pelatihan & Penilaian', 'Keuangan', 'Komunikasi'],
  anggota: ['Utama', 'Aktivitas', 'Keuangan', 'Komunikasi'],
};

const menuGroups: MenuGroup[] = [
  {
    label: 'Utama',
    items: [
      // Dashboard admin — anggota diarahkan ke /forum sebagai home.
      // minRole 'penguji' karena role-redirect mengarahkan penguji ke /dashboard juga.
      { href: '/dashboard', label: 'Dashboard', icon: BarChart3, minRole: 'penguji' },
    ],
  },
  {
    label: 'Keanggotaan',
    items: [
      { href: '/members', label: 'Anggota', icon: Users, minRole: 'admin_ranting' },
      { href: '/members/mutasi', label: 'Mutasi', icon: ArrowLeftRight, minRole: 'admin_ranting' },
      // admin_kegiatan memasukkan calon anggota ke pendadaran (alur langkah 4)
      { href: '/candidates', label: 'Calon', icon: UserPlus, minRole: 'admin_kegiatan' },
      { href: '/registrations', label: 'Pendaftaran', icon: UserPlus, minRole: 'admin_ranting' },
      { href: '/claims', label: 'Klaim', icon: ClipboardCheck, minRole: 'admin_ranting' },
    ],
  },
  {
    label: 'Pelatihan & Penilaian',
    items: [
      { href: '/trainings', label: 'Latihan', icon: Dumbbell, minRole: 'admin_ranting' },
      // admin_kegiatan mengelola pendadaran (alur langkah 3)
      { href: '/graduations', label: 'Pendadaran', icon: GraduationCap, minRole: 'admin_kegiatan' },
      // admin_kegiatan mengajukan penguji ke admin distrik (alur langkah 6)
      { href: '/examiners', label: 'Penguji', icon: Shield, minRole: 'admin_kegiatan' },
      { href: '/assessments', label: 'Penilaian', icon: ClipboardCheck, minRole: 'penguji' },
    ],
  },
  {
    label: 'Aktivitas',
    items: [
      { href: '/activities', label: 'Kegiatan', icon: Calendar, minRole: 'anggota' },
      { href: '/calendar', label: 'Kalender', icon: Calendar, minRole: 'anggota' },
      { href: '/approvals', label: 'Persetujuan', icon: ClipboardCheck, minRole: 'admin_ranting' },
    ],
  },
  {
    label: 'Organisasi',
    items: [
      { href: '/org-chart', label: 'Peta Organisasi', icon: Shield, minRole: 'anggota' },
      { href: '/org-documents', label: 'Dokumen Org.', icon: FileText, minRole: 'anggota' },
    ],
  },
  {
    label: 'Dokumen & Surat',
    items: [
      { href: '/documents', label: 'Dokumen', icon: FileText, minRole: 'anggota' },
      { href: '/letters', label: 'Surat', icon: Mail, minRole: 'admin_ranting' },
    ],
  },
  {
    label: 'Keuangan',
    items: [
      { href: '/dues', label: 'Iuran', icon: CreditCard, minRole: 'anggota' },
      { href: '/payments', label: 'Pembayaran', icon: Wallet, minRole: 'admin_ranting' },
    ],
  },
  {
    label: 'Gamifikasi',
    items: [
      { href: '/gamification', label: 'Dasbor', icon: Trophy, minRole: 'admin_kegiatan' },
      { href: '/gamification/admin', label: 'Admin', icon: Shield, minRole: 'admin_kegiatan' },
      { href: '/gamification/scoreboard', label: 'Scoreboard', icon: TrendingUp, minRole: 'anggota' },
      { href: '/gamification/report', label: 'Laporan', icon: BarChart3, minRole: 'admin_ranting' },
      { href: '/gamification/settings', label: 'Pengaturan', icon: Settings, minRole: 'admin_ranting' },
    ],
  },
  {
    label: 'Komunikasi',
    items: [
      { href: '/forum', label: 'Forum', icon: MessageSquare, minRole: 'anggota' },
      { href: '/notifications', label: 'Notifikasi', icon: Bell, minRole: 'anggota' },
      { href: '/notifications/report', label: 'Lap. Notifikasi', icon: BarChart3, minRole: 'admin_ranting' },
    ],
  },
  {
    label: 'Laporan & Analitik',
    items: [
      { href: '/reports', label: 'Laporan', icon: BarChart3, minRole: 'admin_ranting' },
      { href: '/scan-stats', label: 'Statistik Scan', icon: BarChart3, minRole: 'admin_ranting' },
    ],
  },
  {
    label: 'Konten Public',
    items: [
      { href: '/content/berita', label: 'Berita', icon: BookOpen, minRole: 'superadmin' },
      { href: '/content/sejarah', label: 'Sejarah', icon: BookOpen, minRole: 'superadmin' },
      { href: '/content/organisasi', label: 'Struktur Org.', icon: Globe, minRole: 'superadmin' },
    ],
  },
  {
    label: 'Sistem',
    items: [
      { href: '/users', label: 'Users', icon: Shield, minRole: 'admin_ranting' },
      { href: '/monitoring', label: 'Monitoring', icon: Activity, minRole: 'admin_ranting' },
      { href: '/monitoring/alerts', label: 'Alert Thresholds', icon: Bell, minRole: 'admin_ranting' },
      { href: '/monitoring/incidents', label: 'Incidents', icon: AlertTriangle, minRole: 'admin_ranting' },
      { href: '/settings', label: 'Pengaturan', icon: Settings, minRole: 'admin_ranting' },
      { href: '/settings/email', label: 'Email Admin', icon: Mail, minRole: 'admin_distrik' },
      { href: '/settings/penandatangan', label: 'Penandatangan', icon: PenLine, minRole: 'admin_distrik' },
      { href: '/settings/dokumen', label: 'Template Dokumen', icon: FileText, minRole: 'admin_distrik' },
      {
        href: '/admin/queues',
        label: 'Antrean',
        icon: Activity,
        adminOnly: true,
      },
      {
        href: '/ws-monitor',
        label: 'WebSocket',
        icon: Wifi,
        adminOnly: true,
      },
    ],
  },
];

// Flattened for header title lookup
const menuItems = menuGroups.flatMap((g) => g.items);/** Small dropdown menu item used in the user profile popover */
function DropdownItem({
  icon: Icon,
  label,
  href,
  onClick,
}: {
  icon: React.ElementType<LucideProps>;
  label: string;
  href: string;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
    >
      <Icon size={16} className="shrink-0 text-gray-500 dark:text-gray-400" />
      {label}
    </Link>
  );
}

 function getModuleKey(href: string): string | null {
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

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user, isAdmin, isSystemAdmin, hasMinRole } = useAuth();
  const [queueStats, setQueueStats] = useState<{ waiting: number; active: number } | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  // Per-group collapse (accordion) — Set of group labels that are collapsed
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  // Measured content heights per group — drives the smooth max-height expand/collapse transition
  const [groupHeights, setGroupHeights] = useState<Record<string, number>>({});
  const groupContentRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const toast = useToast();

  useEffect(() => {
    const handleSessionExpired = () => {
      toast('error', 'Sesi Anda telah berakhir. Silakan login kembali.');
    };

    window.addEventListener('session-expired', handleSessionExpired);
    return () => window.removeEventListener('session-expired', handleSessionExpired);
  }, [toast]);

  const isDesktop = useCallback(() => window.innerWidth >= 1024, []);

  // Hydration guard + responsive sidebar:
  //   - Screens < 1024px: always collapsed (no localStorage)
  //   - Screens >= 1024px: restore user preference from localStorage
  useEffect(() => {
    setMounted(true);
    if (isDesktop()) {
      const saved = localStorage.getItem('sidebarCollapsed');
      if (saved === 'true') {
        setCollapsed(true);
      }
    } else {
      setCollapsed(true);
    }
    // Restore per-group collapse preference. On FIRST login (no saved preference)
    // collapse everything except the most-used groups for the user's role.
    try {
      const savedGroups = localStorage.getItem('sidebarCollapsedGroups');
      if (savedGroups) {
        setCollapsedGroups(new Set(JSON.parse(savedGroups) as string[]));
      } else {
        const openGroups = user?.role ? DEFAULT_OPEN_GROUPS[user.role] : DEFAULT_OPEN_GROUPS.anggota;
        setCollapsedGroups(
          new Set(menuGroups.map((g) => g.label).filter((label) => !openGroups.includes(label))),
        );
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Listen for viewport resize to auto-collapse/expand
  useEffect(() => {
    if (!mounted) return;
    const mql = window.matchMedia('(max-width: 1023px)');
    const handler = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setCollapsed(true);
      } else {
        // Restore user preference when going back to desktop
        const saved = localStorage.getItem('sidebarCollapsed');
        setCollapsed(saved === 'true');
      }
    };
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [mounted]);

  const toggleSidebar = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      if (isDesktop()) {
        localStorage.setItem('sidebarCollapsed', String(next));
      }
      return next;
    });
  }, []);

  const toggleGroup = useCallback((label: string) => {
    setCollapsedGroups((prev) => {
      if (prev.has(label)) {
        // Closing: just close this group
        const next = new Set(prev);
        next.delete(label);
        return next;
      }
      // Opening: close all others, keep only this one
      return new Set([label]);
    });
  }, []);

  // Persist per-group collapse state
  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem('sidebarCollapsedGroups', JSON.stringify([...collapsedGroups]));
    } catch {
      /* ignore */
    }
  }, [collapsedGroups, mounted]);

  // Auto-expand ONLY the group that contains the active page, and collapse all others
  useEffect(() => {
    if (!pathname) return;
    setCollapsedGroups((_prev) => {
      const activeGroup = menuGroups.find((g) =>
        g.items.some((item) => pathname.startsWith(item.href)),
      );
      const next = new Set<string>();
      menuGroups.forEach(g => {
        if (activeGroup && g.label !== activeGroup.label) {
          next.add(g.label);
        }
      });
      return next;
    });
  }, [pathname]);

  // Measure each group's content height so the max-height transition animates smoothly.
  // Items stay in the DOM — closed groups are clipped to 0 via overflow hidden.
  useEffect(() => {
    if (collapsed) return; // icon mode — wrapper is unconstrained, nothing to measure
    const next: Record<string, number> = {};
    for (const group of menuGroups) {
      const el = groupContentRefs.current[group.label];
      // scrollHeight reports full content height even when max-height is 0;
      // +4 buffer accounts for the last item's margin/sub-pixel rounding
      if (el && el.scrollHeight > 0) next[group.label] = el.scrollHeight + 4;
    }
    setGroupHeights((prev) => {
      let changed = false;
      const merged = { ...prev };
      for (const [k, v] of Object.entries(next)) {
        if (merged[k] !== v) {
          merged[k] = v;
          changed = true;
        }
      }
      return changed ? merged : prev;
    });
    // `mounted` matters: admin-only items (Antrean, WebSocket) only render after mount,
    // so heights must be re-measured once they appear.
  }, [collapsedGroups, collapsed, mounted]);

  useEffect(() => {
    let socketSubscribed = false;

    const fetchCount = async () => {
      try {
        const { data } = await apiClient.get('/notifications/count');
        setUnreadCount(data.data?.count || 0);
      } catch {
        /* ignore */
      }
    };

    fetchCount();

    try {
      const token = localStorage.getItem('accessToken');
      if (token) {
        const socket = getSocket(token);
        socket.on('notification:new', () => {
          setUnreadCount((prev) => prev + 1);
        });
        socket.on('notification:count', (data: { count: number }) => {
          setUnreadCount(data.count);
        });
        socketSubscribed = true;

        return () => {
          socket.off('notification:new');
          socket.off('notification:count');
        };
      }
    } catch {
      /* fallback to polling below — only set up interval when socket fails */
    }

    // Only poll when socket subscription didn't succeed
    if (!socketSubscribed) {
      const interval = setInterval(fetchCount, 30000);
      return () => clearInterval(interval);
    }
  }, []);

  // Queue Stats Polling — only superadmin sees the Antrean menu, so poll only for them
  useEffect(() => {
    if (!mounted) return;
    if (!hasMinRole('superadmin')) return;

    const fetchStats = async () => {
      try {
        const { data } = await apiClient.get('/admin/queue-stats');
        if (data?.data?.counts) {
          setQueueStats({
            waiting: data.data.counts.waiting ?? 0,
            active: data.data.counts.active ?? 0,
          });
        }
      } catch {
        setQueueStats(null);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 10_000);
    return () => clearInterval(interval);
  }, [mounted]);

  // Click outside to close profile dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    setProfileOpen(false);
    disconnectSocket();
    clearTokens();
    localStorage.removeItem('user');
    router.push('/login');
  };

  const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED;

  return (
    <div className="flex h-screen bg-[#F8F9FA] dark:bg-gray-950">
      {/* Sidebar */}
      <aside
        className="bg-navy-800 border-r border-navy-700 flex flex-col transition-all duration-300 ease-in-out"
        style={{ width: sidebarWidth, minWidth: sidebarWidth }}
      >
        {/* Brand + Toggle */}
        <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-800 h-14 shrink-0">
          {collapsed ? (
            <Link href={user ? getHomePathForRole(user.role) : '/dashboard'} className="mx-auto">
              <img
                src="/logo.svg"
                alt="THS-THM"
                className="h-8 w-8 rounded-lg object-cover ring-1 ring-gray-200 dark:ring-gray-700 transition-all duration-300"
              />
            </Link>
          ) : (
            <Link href={user ? getHomePathForRole(user.role) : '/dashboard'} className="flex items-center gap-2 min-w-0">
              <img
                src="/logo.svg"
                alt="THS-THM"
                className="h-8 w-8 shrink-0 rounded-lg object-cover ring-1 ring-gray-200 dark:ring-gray-700 transition-all duration-300"
              />
              <span className="text-lg font-serif font-bold text-white truncate">THS-THM</span>
            </Link>
          )}
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-xl hover:bg-navy-700 transition-colors text-navy-300 hover:text-white shrink-0"
            title={collapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
            aria-label={collapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
            aria-expanded={!collapsed}
          >
            {collapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-4">
          {menuGroups.map((group) => {
            const visibleItems = group.items.filter((item) => {
              // Admin-only items (queues, WebSocket) → superadmin
              if (item.adminOnly && mounted) {
                if (!isAdmin) return false;
              }
              // Role-based filtering: hide if below the item's minimum role
              if (item.minRole && mounted) {
                if (!hasMinRole(item.minRole)) return false;
              }
              // Module-level view permission fallback
              const moduleKey = getModuleKey(item.href);
              if (moduleKey) {
                const perms = MODULE_PERMISSIONS[moduleKey];
                const requiredViewRole = perms?.view;
                if (requiredViewRole && !hasMinRole(requiredViewRole)) {
                  return false;
                }
              }
              return true;
            });

            // Skip group entirely when nothing is visible (avoids stray labels)
            if (visibleItems.length === 0) return null;

            return (
            <div key={group.label}>
              {/* Group header — clickable to collapse/expand (hidden in icon-only mode) */}
              {!collapsed && (
                <button
                  type="button"
                  onClick={() => toggleGroup(group.label)}
                  className="flex w-full items-center justify-between rounded-md px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-navy-400 hover:text-navy-200 transition-colors"
                  title={
                    collapsedGroups.has(group.label)
                      ? `Buka grup ${group.label}`
                      : `Ciutkan grup ${group.label}`
                  }
                  aria-expanded={!collapsedGroups.has(group.label)}
                >
                  <span className="truncate">{group.label}</span>
                  {collapsedGroups.has(group.label) ? (
                    <ChevronRight size={14} className="shrink-0" />
                  ) : (
                    <ChevronDown size={14} className="shrink-0" />
                  )}
                </button>
              )}

              {/* Group items — smooth max-height expand/collapse. The wrapper is ALWAYS mounted;
                  visibility is controlled purely by maxHeight (0 when closed, measured px when open,
                  unconstrained in icon mode) so the transition can animate both ways. */}
              <div
                ref={(el) => {
                  groupContentRefs.current[group.label] = el;
                }}
                className={
                  collapsed
                    ? undefined
                    : 'overflow-hidden transition-[max-height] duration-300 ease-in-out motion-reduce:transition-none'
                }
                style={
                  collapsed
                    ? undefined
                    : { maxHeight: collapsedGroups.has(group.label) ? 0 : groupHeights[group.label] }
                }
              >
                {visibleItems.map((item) => {
                    const Icon = item.icon;
                  const isActive = pathname?.startsWith(item.href) || false;

                  // Shared classes for both external and internal links
                  const linkClasses = `flex items-center gap-3 px-3 py-2 rounded-md mb-0.5 text-sm transition-colors ${
                    isActive
                      ? 'bg-navy-700 text-gold-400 font-medium'
                      : 'text-navy-200 hover:bg-navy-700 hover:text-white'
                  } ${collapsed ? 'justify-center px-2' : ''}`;

                  const content = (
                    <>
                      {/* Icon — wrapped for collapsed-mode dot indicators */}
                      <span className="relative shrink-0">
                        <Icon size={18} />
                        {collapsed && item.href === '/notifications' && unreadCount > 0 && (
                          <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-gray-900" />
                        )}
                        {collapsed && item.href === '/admin/queues' && queueStats &&
                          queueStats.waiting + queueStats.active > 0 && (
                          <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-white dark:ring-gray-900" />
                        )}
                      </span>
                      {!collapsed && <span className="truncate">{item.label}</span>}
                      {/* Badge + external indicator — only when expanded */}
                      {!collapsed && (
                        <span className="ml-auto flex items-center gap-1.5">
                          {item.href === '/notifications' && unreadCount > 0 && (
                            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                              {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                          )}
                          {item.href === '/admin/queues' && queueStats &&
                            (queueStats.waiting + queueStats.active > 0) && (
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${
                                queueStats.waiting > 0
                                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
                                  : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                              }`}
                            >
                              {queueStats.waiting + queueStats.active}
                            </span>
                          )}
                          {item.external && (
                            <svg
                              className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500"
                              fill="none" stroke="currentColor" viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                              />
                            </svg>
                          )}
                        </span>
                      )}
                    </>
                  );

                  if (item.external) {
                    return (
                      <a
                        key={item.href}
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={linkClasses}
                        title={collapsed ? item.label : undefined}
                      >
                        {content}
                      </a>
                    );
                  }

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={linkClasses}
                      title={collapsed ? item.label : undefined}
                    >
                      {content}
                    </Link>
                  );
                })}
              </div>
            </div>
            );
          })}
        </nav>


      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-in-out">
        {/* Header */}
        <header className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-3 flex items-center justify-between h-14 shrink-0">
          <button onClick={() => router.back()} className="p-1.5 rounded-xl hover:bg-navy-50 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200" title="Kembali" aria-label="Kembali"><ArrowLeft size={20} /></button>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {menuItems.find((m) => pathname?.startsWith(m.href))?.label || 'Dashboard'}
          </h2>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/notifications"
              className="relative p-2 rounded-xl hover:bg-navy-50 transition-colors"
            >
              <Bell size={20} className="text-gray-500 dark:text-gray-300" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
            {/* Profile menu — top right of the header (moved from sidebar bottom) */}
            {user && (
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setProfileOpen((prev) => !prev)}
                  className={`flex items-center gap-2 p-1.5 rounded-xl hover:bg-navy-50 transition-colors ${
                    profileOpen ? 'bg-gray-100 dark:bg-gray-800' : ''
                  }`}
                  title={user.namaLengkap}
                  aria-label="Menu profil"
                  aria-expanded={profileOpen}
                >
                  <UserAvatar
                    fotoPath={user.fotoPath}
                    namaLengkap={user.namaLengkap}
                    size="sm"
                  />
                  <span className="hidden md:inline text-sm font-medium text-gray-800 dark:text-gray-200">
                    {user.namaLengkap}
                  </span>
                  <ChevronDown size={14} className="hidden md:block text-gray-500 dark:text-gray-400" />
                </button>

                {profileOpen && (
                  <div className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-elegant-lg border border-gray-100 py-1 z-50">
                    <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {user.namaLengkap}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {user.email}
                      </p>
                    </div>
                    <DropdownItem
                      icon={User}
                      label="Profil Saya"
                      href="/profile"
                      onClick={() => setProfileOpen(false)}
                    />
                    <DropdownItem
                      icon={Lock}
                      label="Ubah Password"
                      href="/profile"
                      onClick={() => setProfileOpen(false)}
                    />
                    <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut size={16} className="shrink-0" />
                      Keluar
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
