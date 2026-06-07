'use client';

import { ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import apiClient, { clearTokens } from '@/lib/api-client';
import { getSocket, disconnectSocket } from '@/lib/socket';
import {
  Users, UserPlus, GraduationCap, Dumbbell, Calendar,
  FileText, Mail, CreditCard, Bell, BarChart3, Settings, LogOut,
  Shield, ClipboardCheck, Wallet, Trophy, TrendingUp,
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

interface DashboardLayoutProps {
  children: ReactNode;
}

const menuItems = [
  { href: '/', label: 'Dashboard', icon: BarChart3 },
  { href: '/members', label: 'Anggota', icon: Users },
  { href: '/candidates', label: 'Calon', icon: UserPlus },
  { href: '/registrations', label: 'Pendaftaran', icon: UserPlus },
  { href: '/claims', label: 'Klaim', icon: ClipboardCheck },
  { href: '/trainings', label: 'Latihan', icon: Dumbbell },
  { href: '/graduations', label: 'Pendadaran', icon: GraduationCap },
  { href: '/activities', label: 'Kegiatan', icon: Calendar },
  { href: '/examiners', label: 'Penguji', icon: Shield },
  { href: '/assessments', label: 'Penilaian', icon: ClipboardCheck },
  { href: '/documents', label: 'Dokumen', icon: FileText },
  { href: '/org-documents', label: 'Org. Docs', icon: FileText },
  { href: '/letters', label: 'Surat', icon: Mail },
  { href: '/dues', label: 'Iuran', icon: CreditCard },
  { href: '/payments', label: 'Pembayaran', icon: Wallet },
  { href: '/notifications', label: 'Notifikasi', icon: Bell },
  { href: '/notifications/report', label: 'Lap. Notifikasi', icon: BarChart3 },
  { href: '/reports', label: 'Laporan', icon: BarChart3 },
  { href: '/scan-stats', label: 'Statistik Scan', icon: BarChart3 },
  { href: '/gamification', label: 'Gamifikasi', icon: Trophy },
  { href: '/gamification/admin', label: 'Admin Gamifikasi', icon: Shield },
  { href: '/gamification/report', label: 'Lap. Gamifikasi', icon: BarChart3 },
  { href: '/gamification/settings', label: 'Set. Gamifikasi', icon: Settings },
  { href: '/gamification/scoreboard', label: 'Scoreboard', icon: TrendingUp },
  { href: '/users', label: 'Users', icon: Shield },
  { href: '/settings', label: 'Pengaturan', icon: Settings },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Initial fetch
    const fetchCount = async () => {
      try {
        const { data } = await apiClient.get('/notifications/count');
        setUnreadCount(data.data?.count || 0);
      } catch { /* ignore */ }
    };
    fetchCount();

    // Try WebSocket for real-time updates
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
    } catch { /* fallback to polling below */ }

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
          <Link href="/members" className="text-lg font-bold text-blue-700 dark:text-blue-400">
            THS-THM System
          </Link>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Dashboard Admin</p>
        </div>

        <nav className="flex-1 overflow-y-auto p-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname?.startsWith(item.href) || false;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md mb-1 text-sm transition ${
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
              {typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}')?.namaLengkap : ''}
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}