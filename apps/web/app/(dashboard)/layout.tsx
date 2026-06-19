'use client';

import { ReactNode, useEffect, useState } from 'react';
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
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

interface DashboardLayoutProps {
  children: ReactNode;
}

interface MenuGroup {
  label: string;
  items: { href: string; label: string; icon: React.ComponentType<{ size?: string | number }> }[];
}

const menuGroups: MenuGroup[] = [
  {
    label: 'Utama',
    items: [
      { href: '/members', label: 'Dashboard', icon: BarChart3 },
    ],
  },
  {
    label: 'Keanggotaan',
    items: [
      { href: '/members', label: 'Anggota', icon: Users },
      { href: '/candidates', label: 'Calon', icon: UserPlus },
      { href: '/registrations', label: 'Pendaftaran', icon: UserPlus },
      { href: '/claims', label: 'Klaim', icon: ClipboardCheck },
    ],
  },
  {
    label: 'Pelatihan & Penilaian',
    items: [
      { href: '/trainings', label: 'Latihan', icon: Dumbbell },
      { href: '/graduations', label: 'Pendadaran', icon: GraduationCap },
      { href: '/examiners', label: 'Penguji', icon: Shield },
      { href: '/assessments', label: 'Penilaian', icon: ClipboardCheck },
    ],
  },
  {
    label: 'Aktivitas',
    items: [
      { href: '/activities', label: 'Kegiatan', icon: Calendar },
      { href: '/calendar', label: 'Kalender', icon: Calendar },
      { href: '/approvals', label: 'Persetujuan', icon: ClipboardCheck },
    ],
  },
  {
    label: 'Organisasi',
    items: [
      { href: '/org-chart', label: 'Peta Organisasi', icon: Shield },
      { href: '/org-documents', label: 'Dokumen Org.', icon: FileText },
    ],
  },
  {
    label: 'Dokumen & Surat',
    items: [
      { href: '/documents', label: 'Dokumen', icon: FileText },
      { href: '/letters', label: 'Surat', icon: Mail },
    ],
  },
  {
    label: 'Keuangan',
    items: [
      { href: '/dues', label: 'Iuran', icon: CreditCard },
      { href: '/payments', label: 'Pembayaran', icon: Wallet },
    ],
  },
  {
    label: 'Gamifikasi',
    items: [
      { href: '/gamification', label: 'Dasbor', icon: Trophy },
      { href: '/gamification/admin', label: 'Admin', icon: Shield },
      { href: '/gamification/scoreboard', label: 'Scoreboard', icon: TrendingUp },
      { href: '/gamification/report', label: 'Laporan', icon: BarChart3 },
      { href: '/gamification/settings', label: 'Pengaturan', icon: Settings },
    ],
  },
  {
    label: 'Komunikasi',
    items: [
      { href: '/forum', label: 'Forum', icon: MessageSquare },
      { href: '/notifications', label: 'Notifikasi', icon: Bell },
      { href: '/notifications/report', label: 'Lap. Notifikasi', icon: BarChart3 },
    ],
  },
  {
    label: 'Laporan & Analitik',
    items: [
      { href: '/reports', label: 'Laporan', icon: BarChart3 },
      { href: '/scan-stats', label: 'Statistik Scan', icon: BarChart3 },
    ],
  },
  {
    label: 'Sistem',
    items: [
      { href: '/users', label: 'Users', icon: Shield },
      { href: '/settings', label: 'Pengaturan', icon: Settings },
      { href: '/settings/email', label: 'Email Admin', icon: Mail },
    ],
  },
];

// Flattened for header title lookup
const menuItems = menuGroups.flatMap((g) => g.items);

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Initial fetch
    const fetchCount = async () => {
      try {
        const { data } = await apiClient.get('/notifications/count');
        setUnreadCount(data.data?.count || 0);
      } catch {
        /* ignore */
      }
    };
    fetchCount();

    // WebSocket for real-time notifications (socket.ts handles enable/disable via
    // NEXT_PUBLIC_ENABLE_REALTIME env var — returns noop socket when disabled)
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

        return () => {
          socket.off('notification:new');
          socket.off('notification:count');
        };
      }
    } catch {
      /* fallback to polling below */
    }

    // Fallback: poll every 30s if WebSocket unavailable
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    disconnectSocket();
    clearTokens();
    localStorage.removeItem('user');
    router.push('/login');
  };

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-950">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <Link href="/members" className="flex items-center gap-2">
            <img src="/logo.png" alt="" className="w-8 h-8 rounded-lg object-cover" />
            <span className="text-lg font-bold text-blue-700 dark:text-blue-400">THS-THM</span>
          </Link>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-10">Dashboard Admin</p>
        </div>

        <nav className="flex-1 overflow-y-auto p-2 space-y-4">
          {menuGroups.map((group) => (
            <div key={group.label}>
              <p className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                {group.label}
              </p>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname?.startsWith(item.href) || false;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-md mb-0.5 text-sm transition ${
                      isActive
                        ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 font-medium'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <Icon size={18} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition w-full"
          >
            <LogOut size={18} />
            Keluar
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            {menuItems.find((m) => pathname?.startsWith(m.href))?.label || 'Dashboard'}
          </h2>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/notifications"
              className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              <Bell size={20} className="text-gray-600 dark:text-gray-300" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {mounted ? JSON.parse(localStorage.getItem('user') || '{}')?.namaLengkap : ''}
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
