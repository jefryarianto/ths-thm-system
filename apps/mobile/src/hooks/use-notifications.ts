import apiClient, { unwrap } from '../lib/api-client';
import { useApi } from './use-api';

export interface NotificationItem {
  id: string;
  judul: string;
  isi: string;
  tipe: string;
  isRead: boolean;
  createdAt: string;
}

export function formatTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} menit lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} hari lalu`;
  return new Date(dateStr).toLocaleDateString('id-ID');
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
  umum: '📢',
};

export function useNotifications() {
  return useApi<NotificationItem[]>(
    () =>
      apiClient
        .get('/notifications', { params: { limit: 50 } })
        .then((r) => (unwrap(r) ?? []) as NotificationItem[]),
    [],
  );
}
