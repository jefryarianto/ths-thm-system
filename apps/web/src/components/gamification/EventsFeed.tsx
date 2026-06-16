'use client';

import Link from 'next/link';
import { Activity, ArrowRight, Zap } from 'lucide-react';
import type { PointEvent } from '@/app/(dashboard)/gamification/types';

const EVENT_ICONS: Record<string, string> = {
  training: '🥋',
  dues: '💰',
  badge: '🏅',
  achievement: '🎯',
};

function getTimeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'baru saja';
  if (mins < 60) return `${mins}m lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}j lalu`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}h lalu`;
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

interface EventsFeedProps {
  events: PointEvent[];
}

export default function EventsFeed({ events }: EventsFeedProps) {
  return (
    <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity size={20} className="text-blue-500" />
          <h3 className="text-base font-semibold text-gray-900">Aktivitas Terbaru</h3>
        </div>
        <Link
          href="/gamification"
          className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
        >
          Lihat semua <ArrowRight size={12} />
        </Link>
      </div>
      {events.length > 0 ? (
        <div className="space-y-0">
          {events.map((event, idx) => (
            <div key={event.id} className="flex gap-3 relative">
              {idx < events.length - 1 && (
                <div className="absolute left-[13px] top-8 bottom-0 w-0.5 bg-gray-100" />
              )}
              <div className="relative z-10 flex-shrink-0 w-7 h-7 rounded-full bg-gray-50 flex items-center justify-center">
                <span className="text-xs">{EVENT_ICONS[event.type] || '📌'}</span>
              </div>
              <div className="flex-1 pb-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm text-gray-900 truncate">
                      <span className="font-medium">
                        {event.namaLengkap || event.anggotaId.slice(0, 8)}
                      </span>
                    </p>
                    <p className="text-xs text-gray-500 truncate">{event.description}</p>
                  </div>
                  <span className="flex-shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-[10px] font-semibold">
                    <Zap size={8} />+{event.points}
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5">{getTimeAgo(event.timestamp)}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
          Belum ada aktivitas
        </div>
      )}
    </div>
  );
}
