'use client';

import { useEffect, useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import {
  Shield,
  Monitor,
  Smartphone,
  Globe,
  LogOut,
  Trash2,
  RefreshCw,
  Search,
  Users,
  Clock,
  Wifi,
  AlertTriangle,
} from 'lucide-react';
import PageContainer from '@/components/ui/page-container';
import PageHeader from '@/components/ui/page-header';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-modal';

interface SessionUser {
  id: string;
  namaLengkap: string;
  email: string;
  role: string;
}

interface Session {
  id: string;
  deviceName: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  lastUsedAt: string;
  createdAt: string;
  user: SessionUser;
}

interface SessionStats {
  totalActive: number;
  activeLastHour: number;
  activeLastDay: number;
  uniqueUsers: number;
  devices: Record<string, number>;
}

function parseDevice(userAgent: string | null, deviceName: string | null): { type: string; icon: React.ReactNode } {
  if (deviceName?.toLowerCase().includes('mobile') || deviceName?.toLowerCase().includes('android')) {
    return { type: 'Mobile', icon: <Smartphone className="w-4 h-4" /> };
  }
  if (deviceName?.toLowerCase().includes('electron') || deviceName?.toLowerCase().includes('desktop')) {
    return { type: 'Desktop App', icon: <Monitor className="w-4 h-4" /> };
  }
  if (!userAgent) return { type: 'Unknown', icon: <Globe className="w-4 h-4" /> };
  const ua = userAgent.toLowerCase();
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    return { type: 'Mobile', icon: <Smartphone className="w-4 h-4" /> };
  }
  if (ua.includes('electron')) {
    return { type: 'Desktop App', icon: <Monitor className="w-4 h-4" /> };
  }
  return { type: 'Web Browser', icon: <Globe className="w-4 h-4" /> };
}

function formatTimeAgo(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(ms / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}j lalu`;
  if (hours > 0) return `${hours}j ${mins % 60}m lalu`;
  if (mins > 0) return `${mins}m lalu`;
  return 'Baru saja';
}

function roleBadge(role: string) {
  const colors: Record<string, string> = {
    superadmin: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    admin_distrik: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    admin_wilayah: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    admin_ranting: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  };
  return colors[role] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
}

export default function SessionsPage() {
  const toast = useToast();
  const { confirm, confirmModal } = useConfirm();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const fetchSessions = useCallback(async (p = 1, q = '') => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: String(p), limit: '20' });
      if (q) params.set('search', q);
      const { data } = await apiClient.get(`/auth/admin/sessions?${params}`);
      setSessions(data.data.data);
      setTotalPages(data.data.meta.totalPages);
      setTotal(data.data.meta.total);
    } catch {
      toast('error', 'Gagal memuat data sesi');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/auth/admin/sessions/stats');
      setStats(data.data);
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    fetchSessions(1, '');
    fetchStats();
  }, [fetchSessions, fetchStats]);

  const handleSearch = () => {
    setPage(1);
    fetchSessions(1, search);
  };

  const handleRevokeSession = async (sessionId: string, userName: string) => {
    const ok = await confirm({
      title: 'Cabut Sesi',
      message: `Yakin ingin mencabut sesi ${userName}? Pengguna akan logout dari perangkat tersebut.`,
      confirmLabel: 'Cabut Sesi',
      cancelLabel: 'Batal',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      setRevokingId(sessionId);
      await apiClient.delete(`/auth/admin/sessions/${sessionId}`);
      toast('success', `Sesi ${userName} berhasil dicabut`);
      fetchSessions(page, search);
      fetchStats();
    } catch {
      toast('error', 'Gagal mencabut sesi');
    } finally {
      setRevokingId(null);
    }
  };

  const handleRevokeAllUserSessions = async (userId: string, userName: string) => {
    const ok = await confirm({
      title: 'Cabut Semua Sesi',
      message: `Yakin ingin mencabut SEMUA sesi ${userName}? Pengguna akan logout dari semua perangkat.`,
      confirmLabel: 'Cabut Semua',
      cancelLabel: 'Batal',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      setRevokingId(userId);
      await apiClient.post(`/auth/admin/sessions/revoke-all/${userId}`);
      toast('success', `Semua sesi ${userName} berhasil dicabut`);
      fetchSessions(page, search);
      fetchStats();
    } catch {
      toast('error', 'Gagal mencabut semua sesi');
    } finally {
      setRevokingId(null);
    }
  };

  // Group sessions by user for "Revoke All" button
  const userSessionCounts = sessions.reduce<Record<string, number>>((acc, s) => {
    acc[s.user.id] = (acc[s.user.id] || 0) + 1;
    return acc;
  }, {});

  return (
    <PageContainer>
      <PageHeader
        title="Manajemen Sesi"
        subtitle="Lihat dan kelola sesi aktif pengguna. Cabut sesi untuk force-logout perangkat tertentu."
      />

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
              <Wifi className="w-4 h-4" />
              Sesi Aktif
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalActive}</div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
              <Clock className="w-4 h-4" />
              Aktif 1 Jam
            </div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.activeLastHour}</div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
              <Users className="w-4 h-4" />
              Pengguna Unik
            </div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.uniqueUsers}</div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
              <Monitor className="w-4 h-4" />
              Perangkat
            </div>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {Object.values(stats.devices).reduce((a, b) => a + b, 0)}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {Object.entries(stats.devices).map(([type, count]) => `${type}: ${count}`).join(' | ')}
            </div>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cari nama atau email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <button
          onClick={handleSearch}
          className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Cari
        </button>
        <button
          onClick={() => { fetchSessions(page, search); fetchStats(); }}
          className="px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Sessions Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
            Memuat data sesi...
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400">
            <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Tidak ada sesi aktif</p>
            <p className="text-sm mt-1">Semua pengguna sedang offline.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Pengguna</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Perangkat</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">IP Address</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Terakhir Aktif</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Login Sejak</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => {
                  const device = parseDevice(session.userAgent, session.deviceName);
                  return (
                    <tr key={session.id} className="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 dark:text-white">{session.user.namaLengkap}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{session.user.email}</div>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${roleBadge(session.user.role)}`}>
                          {session.user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                          {device.icon}
                          <span>{device.type}</span>
                        </div>
                        {session.deviceName && (
                          <div className="text-xs text-gray-400 mt-0.5">{session.deviceName}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 font-mono text-xs">
                        {session.ipAddress || '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {formatTimeAgo(session.lastUsedAt)}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {formatTimeAgo(session.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {userSessionCounts[session.user.id] > 1 && (
                            <button
                              onClick={() => handleRevokeAllUserSessions(session.user.id, session.user.namaLengkap)}
                              disabled={revokingId === session.user.id}
                              className="px-2.5 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors disabled:opacity-50"
                              title="Cabut semua sesi pengguna ini"
                            >
                              <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />
                              Cabut Semua ({userSessionCounts[session.user.id]})
                            </button>
                          )}
                          <button
                            onClick={() => handleRevokeSession(session.id, session.user.namaLengkap)}
                            disabled={revokingId === session.id}
                            className="px-2.5 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors disabled:opacity-50"
                          >
                            <LogOut className="w-3.5 h-3.5 inline mr-1" />
                            Cabut
                          </button>
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Menampilkan {sessions.length} dari {total} sesi
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setPage(p => Math.max(1, p - 1)); fetchSessions(Math.max(1, page - 1), search); }}
              disabled={page === 1}
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Sebelumnya
            </button>
            <span className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => { setPage(p => Math.min(totalPages, p + 1)); fetchSessions(Math.min(totalPages, page + 1), search); }}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      )}
      {confirmModal}
    </PageContainer>
  );
}
