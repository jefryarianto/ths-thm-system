'use client';

import Link from 'next/link';
import {
  Activity,
  Bell,
  CheckCircle2,
  ChevronRight,
  GraduationCap,
  MessageSquare,
  QrCode,
  ShieldCheck,
  TriangleAlert,
  UserPlus,
  Wallet,
} from 'lucide-react';
import { formatTime } from './constants';

/**
 * Pemetaan TipeNotifikasi (lihat prisma/schema.prisma enum TipeNotifikasi)
 * → ikon + warna semantik. Sebelumnya semua item memakai ikon Bell sehingga
 * severity tidak dapat dipindai secara visual.
 */
const TIPE_STYLES: Record<string, { icon: typeof Bell; accent: string }> = {
  welcome: { icon: UserPlus, accent: 'text-primary bg-primary-50 dark:bg-primary-950' },
  data_incomplete: { icon: TriangleAlert, accent: 'text-error bg-error-50 dark:bg-error-950' },
  reminder_latihan: { icon: GraduationCap, accent: 'text-info bg-info-50 dark:bg-info-950' },
  reminder_pendadaran: { icon: GraduationCap, accent: 'text-info bg-info-50 dark:bg-info-950' },
  reminder_iuran: { icon: Wallet, accent: 'text-warning bg-warning-50 dark:bg-warning-950' },
  status_klaim: { icon: ShieldCheck, accent: 'text-warning bg-warning-50 dark:bg-warning-950' },
  dokumen_ready: { icon: CheckCircle2, accent: 'text-success bg-success-50 dark:bg-success-950' },
  forum_reply: { icon: MessageSquare, accent: 'text-primary bg-primary-50 dark:bg-primary-950' },
  forum_solution: { icon: MessageSquare, accent: 'text-success bg-success-50 dark:bg-success-950' },
  kartu_dipindai: { icon: QrCode, accent: 'text-secondary bg-secondary-50 dark:bg-secondary-950' },
  anggota_disetujui: { icon: ShieldCheck, accent: 'text-success bg-success-50 dark:bg-success-950' },
  pembayaran_terverifikasi: { icon: Wallet, accent: 'text-success bg-success-50 dark:bg-success-950' },
  umum: { icon: Bell, accent: 'text-muted bg-surface-variant' },
};

const DEFAULT_STYLE = TIPE_STYLES.umum;

export interface ActivityItem {
  id: string;
  judul: string;
  isi: string;
  tipe: string;
  isRead: boolean;
  createdAt: string;
}

export function getActivityStyle(tipe: string) {
  return TIPE_STYLES[tipe] ?? DEFAULT_STYLE;
}

interface ActivityFeedProps {
  items: ActivityItem[];
}

/**
 * Feed aktivitas terbaru.
 *
 * Peningkatan vs implementasi lama:
 *  - Ikon & warna berasal dari `tipe` (sebelumnya seragam Bell) →
 *    severity dapat dipindai tanpa membaca judul.
 *  - Timestamp dipindah ke sisi kanan judul (sejajar) → hemat tinggi.
 *  - Isi dibatasi 2 baris (line-clamp-2), bukan truncate 1 baris →
 *    konteks tidak hilang.
 */
export default function ActivityFeed({ items }: ActivityFeedProps) {
  if (items.length === 0) {
    return (
      <div className="px-5 py-10 text-center text-sm text-muted">
        <Bell size={22} className="mx-auto mb-2 opacity-50" aria-hidden="true" />
        <p className="font-medium text-text/80">Belum ada aktivitas</p>
        <p className="text-xs mt-1">Notifikasi akan muncul di sini.</p>
      </div>
    );
  }

  return (
    <ol className="divide-y divide-border">
      {items.map((n) => {
        const style = getActivityStyle(n.tipe);
        const Icon = style.icon;
        return (
          <li key={n.id} className="px-5 py-3 hover:bg-surface-variant transition-colors">
            <div className="flex items-start gap-3">
              <span
                className={`p-1.5 rounded-lg flex-shrink-0 mt-0.5 ${style.accent}`}
                aria-hidden="true"
              >
                <Icon size={14} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p
                    className={`text-xs truncate ${
                      n.isRead ? 'text-muted' : 'text-text font-medium'
                    }`}
                  >
                    {n.judul}
                  </p>
                  <time
                    dateTime={n.createdAt}
                    className="text-2xs text-muted shrink-0 tabular-nums"
                  >
                    {formatTime(n.createdAt)}
                  </time>
                </div>
                <p className="text-xs text-muted mt-0.5 line-clamp-2">{n.isi}</p>
              </div>
              {!n.isRead && (
                <span
                  className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-2"
                  aria-label="Belum dibaca"
                />
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Header standar untuk feed aktivitas + link "Lihat semua". */
export function ActivityFeedHeader({ unread }: { unread: number }) {
  return (
    <div className="px-5 py-4 border-b border-border flex items-center justify-between">
      <h3 className="text-sm font-semibold text-text flex items-center gap-1.5">
        <Activity size={15} className="text-primary" aria-hidden="true" />
        Aktivitas Terbaru
        {unread > 0 && (
          <span className="bg-error-500 text-white text-2xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </h3>
      <Link
        href="/notifications"
        className="text-xs text-primary hover:underline flex items-center gap-0.5"
      >
        Lihat semua <ChevronRight size={12} aria-hidden="true" />
      </Link>
    </div>
  );
}
