'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Bell, ChevronDown, Lock, LogOut, Menu, User as UserIcon } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { UserAvatar } from '@/components/ui/user-avatar';

/**
 * Header dashboard THS-THM (Global Navigation — Tahap 2).
 *
 * - Tinggi konsisten h-14 (sejajar dengan brand row sidebar).
 * - Isi: tombol menu (mobile), navigasi back, judul halaman, theme toggle,
 *   notifikasi (badge unread), avatar + dropdown user (Profil / Ubah Password / Keluar).
 * - Warna 100% token Design System (bg-surface, border-border, text-text/muted).
 */

export interface HeaderUser {
  namaLengkap: string;
  email: string;
  fotoPath?: string | null;
}

interface DashboardHeaderProps {
  title: string;
  unreadCount: number;
  user: HeaderUser | null;
  onLogout: () => void;
  onOpenMobileNav: () => void;
}

const ICON_BUTTON =
  'p-2 rounded-lg text-muted hover:bg-surface-variant hover:text-text transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary';

export default function DashboardHeader({
  title,
  unreadCount,
  user,
  onLogout,
  onOpenMobileNav,
}: DashboardHeaderProps) {
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Klik di luar → tutup dropdown profil
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-14 shrink-0 bg-surface border-b border-border px-3 sm:px-6 flex items-center gap-2 shadow-elegant z-30">
      {/* Menu (mobile/tablet) */}
      <button
        type="button"
        onClick={onOpenMobileNav}
        className={`lg:hidden ${ICON_BUTTON}`}
        title="Buka navigasi"
        aria-label="Buka navigasi"
      >
        <Menu size={20} aria-hidden="true" />
      </button>

      {/* Navigasi back */}
      <button
        type="button"
        onClick={() => router.back()}
        className={ICON_BUTTON}
        title="Kembali"
        aria-label="Kembali"
      >
        <ArrowLeft size={18} aria-hidden="true" />
      </button>

      {/* Judul halaman */}
      <h2 className="min-w-0 flex-1 truncate text-base sm:text-lg font-semibold text-text">
        {title}
      </h2>

      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        <ThemeToggle />

        {/* Notifikasi */}
        <Link
          href="/notifications"
          className={`relative ${ICON_BUTTON}`}
          title="Notifikasi"
          aria-label={unreadCount > 0 ? `Notifikasi, ${unreadCount} belum dibaca` : 'Notifikasi'}
        >
          <Bell size={20} aria-hidden="true" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-error-500 text-white text-2xs font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Link>

        {/* Avatar + dropdown user */}
        {user && (
          <div className="relative" ref={profileRef}>
            <button
              type="button"
              onClick={() => setProfileOpen((prev) => !prev)}
              className={`flex items-center gap-2 p-1.5 rounded-lg transition-colors ${
                profileOpen ? 'bg-surface-variant' : 'hover:bg-surface-variant'
              }`}
              title={user.namaLengkap}
              aria-label="Menu profil"
              aria-haspopup="menu"
              aria-expanded={profileOpen}
            >
              <UserAvatar fotoPath={user.fotoPath} namaLengkap={user.namaLengkap} size="sm" />
              <span className="hidden md:inline text-sm font-medium text-text">
                {user.namaLengkap}
              </span>
              <ChevronDown size={14} className="hidden md:block text-muted" aria-hidden="true" />
            </button>

            {profileOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full mt-1 w-56 bg-surface rounded-xl shadow-elegant-lg border border-border py-1 z-50"
              >
                <div className="px-3 py-2 border-b border-border">
                  <p className="text-sm font-medium text-text truncate">{user.namaLengkap}</p>
                  <p className="text-xs text-muted truncate">{user.email}</p>
                </div>
                <DropdownItem
                  icon={UserIcon}
                  label="Profil Saya"
                  href="/profile"
                  onClick={() => setProfileOpen(false)}
                />
                <DropdownItem
                  icon={Lock}
                  label="Ubah Password"
                  href="/profile#change-password"
                  onClick={() => setProfileOpen(false)}
                />
                <div className="border-t border-border my-1" />
                <button
                  type="button"
                  role="menuitem"
                  onClick={onLogout}
                  className="flex items-center gap-3 w-full px-3 py-2 text-sm text-error hover:bg-error-50 transition-colors"
                >
                  <LogOut size={16} className="shrink-0" aria-hidden="true" />
                  Keluar
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

/** Item dropdown menu profil */
function DropdownItem({
  icon: Icon,
  label,
  href,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  href: string;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onClick}
      className="flex items-center gap-3 px-3 py-2 text-sm text-text hover:bg-surface-variant transition-colors"
    >
      <Icon size={16} className="shrink-0 text-muted" />
      {label}
    </Link>
  );
}
