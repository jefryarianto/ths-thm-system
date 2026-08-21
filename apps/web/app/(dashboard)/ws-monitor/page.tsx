'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import {

  Wifi,
  WifiOff,
  Users,
  RefreshCw,
  Activity,
  Radio,
  PlugZap,
  Timer,
  Globe,
} from 'lucide-react';
import { PermissionGuard } from '@/components/auth/permission-guard';
import apiClient from '@/lib/api-client';
import PageContainer from '@/components/ui/page-container';
import PageHeader from '@/components/ui/page-header';

interface WsStats {
  totalConnections: number;
  uniqueUsers: number;
  rooms: Array<{ room: string; sockets: number }>;
  userConnectionCounts: Record<string, number>;
  timestamp: string;
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();

  if (diffMs < 1000) return 'Baru saja';
  if (diffMs < 60_000) {
    const secs = Math.floor(diffMs / 1000);
    return `${secs} detik lalu`;
  }
  if (diffMs < 3_600_000) {
    const mins = Math.floor(diffMs / 60_000);
    return `${mins} menit lalu`;
  }
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

function RoomIcon({ room }: { room: string }) {
  if (room.startsWith('user:')) {
    return <Users size={14} className="text-blue-500" />;
  }
  return <Radio size={14} className="text-purple-500" />;
}

function getRoomLabel(room: string): string {
  if (room.startsWith('user:')) {
    return `User ${room.slice(5).slice(0, 12)}...`;
  }
  return room;
}

export default function WsMonitorPage() {
  const [stats, setStats] = useState<WsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const fetchStats = useCallback(async () => {
    try {
      const { data: res } = await apiClient.get('/notifications/ws-stats');
      // TransformInterceptor wraps as { success, data: stats }
      const statsData = res?.data ?? res;
      if (statsData && typeof statsData === 'object' && 'totalConnections' in statsData) {
        setStats(statsData as WsStats);
        setError(null);
      } else {
        setStats(null);
        setError('Format data tidak valid');
      }
    } catch (err) {
      setError((err as { message?: string })?.message || 'Gagal memuat data');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Auto-refresh every 5 seconds
  useEffect(() => {
    if (!autoRefresh) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(fetchStats, 5_000);
    return () => clearInterval(intervalRef.current);
  }, [autoRefresh, fetchStats]);

  const handleRefresh = () => {
    fetchStats();
  };

  return (
    <PermissionGuard module="wsMonitor" action="view">
    <PageContainer>
      <PageHeader
        title="Monitoring WebSocket"
        onRefresh={handleRefresh}
      >
        <button
          onClick={() => setAutoRefresh(!autoRefresh)}
          className={`flex items-center gap-1.5 px-3 py-2 border rounded-md text-sm transition ${
            autoRefresh
              ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-400'
              : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
        >
          <RefreshCw size={14} className={autoRefresh ? 'animate-spin' : ''} />
          {autoRefresh ? '5s' : 'Manual'}
        </button>
      </PageHeader>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-3">
          <WifiOff size={20} className="text-red-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-700 dark:text-red-400">Gagal memuat data</p>
            <p className="text-xs text-red-500 dark:text-red-400 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Stat Cards */}
      {!stats ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 animate-pulse"
            >
              <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-3" />
              <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950">
                <Wifi size={22} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Total Koneksi
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">
                  {stats.totalConnections.toLocaleString('id-ID')}
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950">
                <Users size={22} className="text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  User Unik
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">
                  {stats.uniqueUsers.toLocaleString('id-ID')}
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950">
                <Radio size={22} className="text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Room Aktif
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">
                  {stats.rooms.length.toLocaleString('id-ID')}
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950">
                <Globe size={22} className="text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Rasio per User
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">
                  {stats.uniqueUsers > 0
                    ? (stats.totalConnections / stats.uniqueUsers).toFixed(1)
                    : '0'}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  koneksi / user
                </p>
              </div>
            </div>
          </div>

          {/* Last Updated & Status Bar */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <span className="relative flex w-3 h-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full w-3 h-3 bg-green-500" />
              </span>
              <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                WebSocket Server Aktif
              </span>
              <span className="hidden sm:inline text-xs text-gray-400 dark:text-gray-500">
                — Redis adapter terpasang
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <Activity size={12} />
                Diperbarui {formatTimestamp(stats.timestamp || new Date().toISOString())}
              </span>
              <span className="flex items-center gap-1">
                <PlugZap size={12} />
                Polling {autoRefresh ? '5 detik' : 'manual'}
              </span>
            </div>
          </div>

          {/* Room List */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio size={16} className="text-gray-500 dark:text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  Room Aktif ({stats.rooms.length})
                </h3>
              </div>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {stats.rooms.reduce((sum, r) => sum + r.sockets, 0)} total socket terdistribusi
              </span>
            </div>

            {stats.rooms.length === 0 ? (
              <div className="p-8 text-center">
                <WifiOff size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Tidak ada room aktif
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Room
                      </th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Tipe
                      </th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Socket
                      </th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Persentase
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {stats.rooms.map((room) => {
                      const totalDistributed = stats.rooms.reduce((s, r) => s + r.sockets, 0);
                      const percentage = totalDistributed > 0
                        ? ((room.sockets / totalDistributed) * 100).toFixed(1)
                        : '0';

                      return (
                        <tr
                          key={room.room}
                          className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                        >
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <RoomIcon room={room.room} />
                              <span className="font-mono text-xs text-gray-800 dark:text-gray-200">
                                {getRoomLabel(room.room)}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                room.room.startsWith('user:')
                                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400'
                                  : 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-400'
                              }`}
                            >
                              {room.room.startsWith('user:') ? 'User Room' : 'Custom Room'}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right">
                            <span className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                              {room.sockets}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                <div
                                  className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
                                  style={{ width: `${Math.min(Number(percentage), 100)}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-500 dark:text-gray-400 w-10 text-right">
                                {percentage}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </PageContainer>
    </PermissionGuard>
  );
}
