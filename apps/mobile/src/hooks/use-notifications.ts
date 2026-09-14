import { useEffect, useRef } from 'react';
import type { Socket } from 'socket.io-client';
import apiClient, { unwrap } from '../lib/api-client';
import { useApi } from './use-api';
import { getSocket } from '../lib/socket';

export interface NotificationItem {
  id: string;
  judul: string;
  isi: string;
  tipe: string;
  isRead: boolean;
  createdAt: string;
  /** Metadata dari backend (screen tujuan, anggotaId, missingFields, dst). */
  data?: {
    screen?: string;
    anggotaId?: string;
    missingFields?: string[];
    [key: string]: unknown;
  };
}

export function formatTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} menit lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} hari lalu`;
  return new Date(dateStr).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
}

export const TYPE_ICONS: Record<string, string> = {
  welcome: '👋',
  data_incomplete: '⚠️',
  reminder_latihan: '🥋',
  reminder_pendadaran: '🎓',
  reminder_iuran: '💰',
  status_klaim: '📋',
  dokumen_ready: '✅',
  badge_earned: '🏅',
  approval_request: '✅',
  kartu_dipindai: '🔍',
  anggota_disetujui: '✅',
  pembayaran_terverifikasi: '💰',
  umum: '📢',
};

export function useNotifications(options?: { tipe?: string }) {
  const tipe = options?.tipe;
  return useApi<NotificationItem[]>(
    () =>
      apiClient
        .get('/notifications', {
          params: { limit: 50, ...(tipe ? { tipe } : {}) },
        })
        .then((r) => {
          const data = unwrap(r);
          return (Array.isArray(data) ? data : (data as any)?.data ?? []) as NotificationItem[];
        }),
    [tipe],
  );
}

/**
 * Langganan realtime (WebSocket) untuk event notifikasi dari server.
 * Menerima `notification:new` / `notification:count` lalu memanggil callback
 * (mis. refetch daftar). Sinkron hanya untuk pengguna terautentikasi.
 */
export function useRealtimeNotifications(onEvent: () => void, enabled = true) {
  const cbRef = useRef(onEvent);
  cbRef.current = onEvent;

  useEffect(() => {
    if (!enabled) return;
    let socket: Socket | null = null;
    let cancelled = false;
    getSocket()
      .then((s) => {
        if (cancelled) return;
        socket = s;
        socket.on('notification:new', () => cbRef.current());
        socket.on('notification:count', () => cbRef.current());
      })
      .catch(() => {
        // Realtime tidak aktif (WS mati / tanpa token) — polling manual tetap berjalan.
      });
    return () => {
      cancelled = true;
      socket?.off('notification:new');
      socket?.off('notification:count');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
}
