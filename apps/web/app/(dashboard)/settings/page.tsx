'use client';

import Link from 'next/link';
import {
  LayoutDashboard,
  ArrowRight,
  Building2,
  Shield,
  Mail,
  History,
  PenLine,
  IdCard,
  Printer,
  Smartphone,
  KeyRound,
  Database,
} from 'lucide-react';
import Card from '@/components/cards/card';
import { useAuth } from '@/hooks/use-auth';
import { getHomePathForRole } from '@/lib/role-redirect';
import { PermissionGuard } from '@/components/auth/permission-guard';

interface SettingCard {
  href: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  minRole: string;
}

const SETTING_CARDS: SettingCard[] = [
  {
    href: '/settings/general',
    label: 'Pengaturan Umum',
    description: 'Profil organisasi, alamat, logo, dan data kontak.',
    icon: <Building2 size={24} />,
    minRole: 'admin_ranting',
  },
  {
    href: '/settings/menu-permissions',
    label: 'Hak Akses Menu',
    description: 'Matriks peran × akses menu.',
    icon: <Shield size={24} />,
    minRole: 'superadmin',
  },
  {
    href: '/settings/email',
    label: 'Email Admin',
    description: 'Konfigurasi SMTP dan template email.',
    icon: <Mail size={24} />,
    minRole: 'admin_distrik',
  },
  {
    href: '/settings/email/logs',
    label: 'Riwayat Email',
    description: 'Log pengiriman email organisasi.',
    icon: <History size={24} />,
    minRole: 'admin_distrik',
  },
  {
    href: '/settings/penandatangan',
    label: 'Penandatangan',
    description: 'Tanda tangan digital & stempel.',
    icon: <PenLine size={24} />,
    minRole: 'admin_distrik',
  },
  {
    href: '/settings/kartu',
    label: 'Template Kartu',
    description: 'Desain kartu anggota.',
    icon: <IdCard size={24} />,
    minRole: 'admin_nasional',
  },
  {
    href: '/settings/dokumen',
    label: 'Template Dokumen',
    description: 'Template surat & dokumen organisasi.',
    icon: <Printer size={24} />,
    minRole: 'admin_nasional',
  },
  {
    href: '/settings/fcm-test',
    label: 'Pengujian FCM',
    description: 'Uji kirim notifikasi push.',
    icon: <Smartphone size={24} />,
    minRole: 'superadmin',
  },
  {
    href: '/settings/sessions',
    label: 'Manajemen Sesi',
    description: 'Kelola sesi aktif pengguna.',
    icon: <KeyRound size={24} />,
    minRole: 'superadmin',
  },
  {
    href: '/settings/backup',
    label: 'Database Backup',
    description: 'Backup & restore data organisasi.',
    icon: <Database size={24} />,
    minRole: 'superadmin',
  },
];

export default function SettingsHubPage() {
  const { user } = useAuth();
  const homeHref = user ? getHomePathForRole(user.role) : '/dashboard';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted mb-2">
        <Link href={homeHref} className="hover:text-text transition-colors">
          <LayoutDashboard size={14} />
        </Link>
        <span>/</span>
        <span className="text-text font-medium">Pengaturan</span>
      </div>

      <div>
        <h1 className="text-2xl font-serif font-bold text-text">Pengaturan</h1>
        <p className="text-sm text-muted mt-1">
          Pilih modul yang ingin diakses. Kartu yang tidak tersedia untuk peran Anda disembunyikan.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {SETTING_CARDS.map((card) => (
          <PermissionGuard key={card.href} minRole={card.minRole as never} module="settings">
            <Link href={card.href} className="group block h-full">
              <Card className="h-full p-5 transition-all duration-200 hover:shadow-elegant-lg hover:border-primary/30 hover:-translate-y-0.5">
                <div className="flex flex-col gap-3">
                  <div className="flex w-11 h-11 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                    {card.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-bold text-text truncate text-[15px]">{card.label}</h3>
                      <ArrowRight size={16} className="shrink-0 text-muted group-hover:text-primary transition-colors" />
                    </div>
                    <p className="text-xs text-muted mt-1 line-clamp-2">{card.description}</p>
                  </div>
                </div>
              </Card>
            </Link>
          </PermissionGuard>
        ))}
      </div>
    </div>
  );
}