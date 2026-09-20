'use client';

import { ReactNode, useEffect, useMemo, useState, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { sessionManager } from '@/lib/session-manager';
import { getSocket, disconnectSocket } from '@/lib/socket';
import { useAuth } from '@/hooks/use-auth';
import { getHomePathForRole } from '@/lib/role-redirect';
import Sidebar from '@/components/layout/sidebar';
import DashboardHeader from '@/components/layout/dashboard-header';
import {
  menuGroups,
  filterVisibleGroups,
  getPageTitle,
  DEFAULT_OPEN_GROUPS,
  type AssignedKegiatan,
} from '@/components/layout/navigation';
import AdminKegiatanWelcome from '@/components/welcome/admin-kegiatan-guide';
import PengujiWelcome from '@/components/welcome/penguji-guide';

/**
 * Shell dashboard (Global Navigation — Tahap 2).
 *
 * Komposisi: Sidebar (rail desktop + drawer mobile) + DashboardHeader.
 * Struktur menu, route, permission, persistence, dan seluruh polling/socket
 * dipertahankan persis seperti sebelumnya — hanya presentasi yang dimodernisasi.
 * Semua halaman di route group `(dashboard)` otomatis memakai shell ini.
 */

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  // Drawer mobile/tablet (<1024px)
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user, isAdmin, hasMinRole, isActivityScoped, isActivityAdmin, isActivityPenguji } =
    useAuth();

  // Redirect non-admin users (anggota) to forum
  useEffect(() => {
    if (!user) return;
    if (!hasMinRole('penguji')) {
      window.location.replace('/forum');
    }
  }, [user, hasMinRole]);

  // Scope badge state
  const [scopeName, setScopeName] = useState<string | null>(null);
  const [scopeLevel, setScopeLevel] = useState<string | null>(null);
  const [queueStats, setQueueStats] = useState<{ waiting: number; active: number } | null>(null);
  // Activity-scoped roles: assigned kegiatan for sidebar dynamic menus
  const [assignedKegiatan, setAssignedKegiatan] = useState<AssignedKegiatan[]>([]);
  // Per-group collapse (accordion) - Set of group labels that are collapsed
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  /**
   * Filter menu per role & permission (logika tidak berubah).
   * Hanya dihitung setelah mount → hydration guard.
   */
  const visibleGroups = useMemo(
    () => (mounted ? filterVisibleGroups(menuGroups, { isAdmin, hasMinRole }) : []),
    [mounted, isAdmin, hasMinRole],
  );

  const homeHref = user ? getHomePathForRole(user.role) : '/dashboard';
  const pageTitle = getPageTitle(pathname);

  // Session expiry is handled entirely by session-manager + SessionProvider:
  // DOM-level toast + window.location.replace('/') hard redirect (no history).
  // No event listener needed here.

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
  }, [isDesktop, user?.role]);

  // Listen for viewport resize to auto-collapse/expand
  useEffect(() => {
    if (!mounted) return;
    const mql = window.matchMedia('(max-width: 1023px)');
    const handler = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setCollapsed(true);
      } else {
        // Restore user preference when going back to desktop, and close drawer
        const saved = localStorage.getItem('sidebarCollapsed');
        setCollapsed(saved === 'true');
        setMobileOpen(false);
      }
    };
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [mounted]);

  // Tutup drawer mobile setiap kali pindah halaman
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const toggleSidebar = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      if (isDesktop()) {
        localStorage.setItem('sidebarCollapsed', String(next));
      }
      return next;
    });
  }, [isDesktop]);

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
    setCollapsedGroups(() => {
      const activeGroup = menuGroups.find((g) =>
        g.items.some((item) => pathname.startsWith(item.href)),
      );
      const next = new Set<string>();
      menuGroups.forEach((g) => {
        if (activeGroup && g.label !== activeGroup.label) {
          next.add(g.label);
        }
      });
      return next;
    });
  }, [pathname]);

  // Unread notification count (socket + polling fallback)
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
      /* fallback to polling below - only set up interval when socket fails */
    }

    // Only poll when socket subscription didn't succeed
    if (!socketSubscribed) {
      const interval = setInterval(fetchCount, 30000);
      return () => clearInterval(interval);
    }
  }, []);

  // Queue Stats Polling - only superadmin sees the Antrean menu, so poll only for them
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
  }, [mounted, hasMinRole]);

  // Fetch assigned kegiatan for activity-scoped roles (admin_kegiatan & penguji)
  useEffect(() => {
    if (!mounted || !isActivityScoped) return;

    const fetchAssignedKegiatan = async () => {
      try {
        if (isActivityAdmin || isActivityPenguji) {
          // admin_kegiatan: kegiatan yang dia kelola · penguji: kegiatan penugasannya
          const { data } = await apiClient.get('/graduations', { params: { limit: 50 } });
          const items = data.data || [];
          setAssignedKegiatan(
            items.map((k: { id: string; nama: string; status: string }) => ({
              id: k.id,
              nama: k.nama,
              status: k.status,
            })),
          );
        }
      } catch {
        // Ignore errors - sidebar will show empty
      }
    };

    fetchAssignedKegiatan();
  }, [mounted, isActivityScoped, isActivityAdmin, isActivityPenguji]);

  // Start inactivity timeout tracking (5 min web session)
  useEffect(() => {
    if (user) {
      sessionManager.startInactivityTracking();
      return () => sessionManager.stopInactivityTracking();
    }
  }, [user]);

  // Resolve scope name for badge
  useEffect(() => {
    if (!user || !isAdmin) return;
    const role = user.role;
    if (role === 'superadmin' || !user.rantingId) return;

    apiClient
      .get(`/org-structure/ranting/${user.rantingId}`)
      .then(({ data }) => {
        const ranting = data.data || data;
        if (role === 'admin_distrik') {
          setScopeName(ranting?.wilayah?.distrik?.nama || null);
          setScopeLevel('Distrik');
        } else if (role === 'admin_wilayah') {
          setScopeName(ranting?.wilayah?.nama || null);
          setScopeLevel('Wilayah');
        } else if (role === 'admin_ranting') {
          setScopeName(ranting?.nama || null);
          setScopeLevel('Ranting');
        }
      })
      .catch(() => {});
  }, [user, isAdmin]);

  const handleLogout = () => {
    disconnectSocket();
    sessionManager.logout();
    router.push('/login');
  };

  return (
    <div className="flex h-screen bg-background text-text">
      <AdminKegiatanWelcome />
      <PengujiWelcome />

      {/* Navigasi global: rail desktop + drawer tablet/mobile */}
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        onToggleCollapse={toggleSidebar}
        pathname={pathname}
        homeHref={homeHref}
        visibleGroups={visibleGroups}
        assignedKegiatan={assignedKegiatan}
        isActivityAdmin={isActivityAdmin}
        unreadCount={unreadCount}
        queueStats={queueStats}
        scopeName={scopeName}
        scopeLevel={scopeLevel}
        collapsedGroups={collapsedGroups}
        onToggleGroup={toggleGroup}
        ready={mounted}
      />

      {/* Area konten */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <DashboardHeader
          title={pageTitle}
          unreadCount={unreadCount}
          user={
            user
              ? {
                  namaLengkap: user.namaLengkap,
                  email: user.email,
                  fotoPath: user.fotoPath ?? null,
                }
              : null
          }
          onLogout={handleLogout}
          onOpenMobileNav={() => setMobileOpen(true)}
        />

        <main id="main-content" className="flex-1 overflow-y-auto p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
