'use client';

import { useEffect, useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { useSSE } from '@/hooks/use-sse';
import {

  RefreshCw,
  Download,
  Search,
  Filter,
  Calendar,
  Activity,
  ShieldAlert,
  Users,
  AlertTriangle,
} from 'lucide-react';
import { PermissionGuard } from '@/components/auth/permission-guard';
import PageContainer from '@/components/ui/page-container';
import PageHeader from '@/components/ui/page-header';
import FilterSelect from '@/components/ui/filter-select';
import { useToast } from '@/components/ui/toast';

// ─── Types ───

interface AuditEntry {
  timestamp: string;
  eventType: string;
  userId?: string;
  userEmail?: string;
  userRole?: string;
  method: string;
  path: string;
  statusCode?: number;
  durationMs?: number;
  details?: Record<string, unknown>;
}

interface AuditStats {
  total: number;
  byEventType: Record<string, number>;
  byRole: Record<string, number>;
  recentViolations: number;
}

// ─── Constants ───

const EVENT_TYPES = [
  { value: '', label: 'Semua Event' },
  { value: 'SCOPE_VIOLATION', label: 'Scope Violation' },
  { value: 'DATA_MUTATION', label: 'Data Mutation' },
  { value: 'AUTH_FAILURE', label: 'Auth Failure' },
  { value: 'DATA_ACCESS', label: 'Data Access' },
];

const EVENT_COLORS: Record<string, string> = {
  SCOPE_VIOLATION: 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400',
  DATA_MUTATION: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400',
  AUTH_FAILURE: 'bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-400',
  DATA_ACCESS: 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400',
};

const METHODS = [
  { value: '', label: 'Semua Method' },
  { value: 'GET', label: 'GET' },
  { value: 'POST', label: 'POST' },
  { value: 'PATCH', label: 'PATCH' },
  { value: 'DELETE', label: 'DELETE' },
  { value: 'PUT', label: 'PUT' },
];

function formatTimestamp(ts: string) {
  const d = new Date(ts);
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

// ─── Page ───

export default function AuditLogsPage() {
  const toast = useToast();
  const [newEntryHighlight, setNewEntryHighlight] = useState(false);
  const [data, setData] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stats
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Pagination
  const [offset, setOffset] = useState(0);
  const limit = 25;

  // Filters
  const [filterEventType, setFilterEventType] = useState('');
  const [filterMethod, setFilterMethod] = useState('');
  const [filterUserId, setFilterUserId] = useState('');
  const [filterUserRole, setFilterUserRole] = useState('');
  const [filterPath, setFilterPath] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const buildParams = useCallback(
    (extra?: Record<string, unknown>) => {
      const params: Record<string, unknown> = { limit, offset, ...extra };
      if (filterEventType) params.eventType = filterEventType;
      if (filterMethod) params.method = filterMethod;
      if (filterUserId) params.userId = filterUserId;
      if (filterUserRole) params.userRole = filterUserRole;
      if (filterPath) params.path = filterPath;
      if (dateFrom) params.startDate = dateFrom;
      if (dateTo) params.endDate = dateTo;
      return params;
    },
    [filterEventType, filterMethod, filterUserId, filterUserRole, filterPath, dateFrom, dateTo, offset, limit],
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = buildParams();
      const { data: res } = await apiClient.get('/audit-logs', { params });
      setData(res.data || []);
      setTotal(res.total || 0);
    } catch {
      setError('Gagal memuat audit log');
    }
    setLoading(false);
  }, [buildParams]);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const { data: res } = await apiClient.get('/audit-logs/stats');
      setStats(res.data || res);
    } catch {
      // silent
    }
    setStatsLoading(false);
  }, []);

  // ── SSE real-time listener (no polling, no WebSocket needed) ──
  const sseToken =
    (typeof window !== 'undefined'
      ? localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken')
      : '') || '';

  const { connected: sseConnected } = useSSE('/api/audit-logs/stream', {
    token: sseToken,
    enabled: !!sseToken,
    maxRetries: 10,
    onEvent: (event, raw) => {
      if (event === 'audit:new') {
        const entry = raw as AuditEntry;
        setData((prev) => [entry, ...prev].slice(0, limit * 2));
        setTotal((prev) => prev + 1);
        setNewEntryHighlight(true);
        setTimeout(() => setNewEntryHighlight(false), 2000);
      }
    },
  });

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { fetchStats(); }, [fetchStats]);

  // Reset offset when filters change
  useEffect(() => {
    setOffset(0);
  }, [filterEventType, filterMethod, filterUserId, filterUserRole, filterPath, dateFrom, dateTo]);

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  const handlePrevPage = () => {
    const newOffset = Math.max(0, offset - limit);
    setOffset(newOffset);
  };

  const handleNextPage = () => {
    const newOffset = offset + limit;
    if (newOffset < total) setOffset(newOffset);
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      // Use raw fetch since the endpoint returns CSV, not JSON
      const params = new URLSearchParams();
      if (filterEventType) params.set('eventType', filterEventType);
      if (filterMethod) params.set('method', filterMethod);
      if (filterUserId) params.set('userId', filterUserId);
      if (filterUserRole) params.set('userRole', filterUserRole);
      if (filterPath) params.set('path', filterPath);
      if (dateFrom) params.set('startDate', dateFrom);
      if (dateTo) params.set('endDate', dateTo);

      const qs = params.toString();
      const url = `/api/audit-logs/export${qs ? `?${qs}` : ''}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(downloadUrl);
    } catch {
      toast('error', 'Gagal export CSV');
    }
    setExporting(false);
  };

  const hasActiveFilters = !!(filterEventType || filterMethod || filterUserId || filterUserRole || filterPath || dateFrom || dateTo);

  return (
    <PermissionGuard module="auditLogs" action="view">
    <PageContainer>
      <PageHeader title="Audit Log" onRefresh={() => { fetchData(); fetchStats(); }}>
        {sseConnected && (
          <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            Live
          </span>
        )}
        <button
          onClick={handleExportCSV}
          disabled={exporting || data.length === 0}
          className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition disabled:opacity-50"
        >
          <Download size={14} /> {exporting ? 'Export...' : 'Export CSV'}
        </button>
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950">
              <Activity size={18} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Events</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {statsLoading ? '-' : stats?.total ?? 0}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950">
              <ShieldAlert size={18} className="text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Violations (1h)</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {statsLoading ? '-' : stats?.recentViolations ?? 0}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-50 dark:bg-green-950">
              <Users size={18} className="text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">User Roles</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {statsLoading ? '-' : Object.keys(stats?.byRole ?? {}).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-50 dark:bg-yellow-950">
              <AlertTriangle size={18} className="text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Ditampilkan</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {data.length} / {total}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={16} className="text-gray-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter</span>
          {hasActiveFilters && (
            <button
              onClick={() => {
                setFilterEventType('');
                setFilterMethod('');
                setFilterUserId('');
                setFilterUserRole('');
                setFilterPath('');
                setDateFrom('');
                setDateTo('');
              }}
              className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 ml-auto"
            >
              Reset Filter
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <FilterSelect
            value={filterEventType}
            onChange={setFilterEventType}
            options={EVENT_TYPES.map((t) => ({ value: t.value, label: t.label }))}
            placeholder="Semua Event"
          />
          <FilterSelect
            value={filterMethod}
            onChange={setFilterMethod}
            options={METHODS.map((m) => ({ value: m.value, label: m.label }))}
            placeholder="Semua Method"
          />
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={filterUserId}
              onChange={(e) => setFilterUserId(e.target.value)}
              placeholder="User ID..."
              className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            />
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={filterPath}
              onChange={(e) => setFilterPath(e.target.value)}
              placeholder="Path (partial)..."
              className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            />
          </div>
          <div className="relative">
            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              title="Dari tanggal"
            />
          </div>
          <div className="relative">
            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              title="Sampai tanggal"
            />
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm px-4 py-3 rounded-xl flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchData} className="underline hover:no-underline text-xs">
            Coba lagi
          </button>
        </div>
      )}

      {/* New entry indicator */}
      {newEntryHighlight && (
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 text-sm px-4 py-2 rounded-xl flex items-center gap-2 animate-pulse">
          <Activity size={14} />
          <span>Audit event baru diterima secara real-time</span>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-gray-400">
            <RefreshCw size={20} className="animate-spin mx-auto mb-2" />
            Memuat audit log...
          </div>
        ) : data.length === 0 ? (
          <div className="p-12 text-center">
            <ShieldAlert size={36} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Tidak ada audit log</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {hasActiveFilters
                ? 'Coba ubah filter atau reset'
                : 'Belum ada aktivitas yang tercatat'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Timestamp</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell">Event</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">User</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">Method</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">Path</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">Status</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">Durasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {data.map((entry, idx) => (
                    <tr
                      key={`${entry.timestamp}-${idx}`}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap font-mono">
                          {formatTimestamp(entry.timestamp)}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${EVENT_COLORS[entry.eventType] || 'bg-gray-100 text-gray-600'}`}
                        >
                          {entry.eventType === 'SCOPE_VIOLATION'
                            ? 'Violation'
                            : entry.eventType === 'DATA_MUTATION'
                              ? 'Mutation'
                              : entry.eventType === 'AUTH_FAILURE'
                                ? 'Auth Fail'
                                : entry.eventType === 'DATA_ACCESS'
                                  ? 'Access'
                                  : entry.eventType}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-gray-900 dark:text-white">
                            {entry.userEmail || entry.userId || '-'}
                          </span>
                          {entry.userRole && (
                            <span className="text-[10px] text-gray-400">{entry.userRole}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span
                          className={`font-mono text-xs font-semibold ${
                            entry.method === 'GET'
                              ? 'text-green-600'
                              : entry.method === 'POST'
                                ? 'text-blue-600'
                                : entry.method === 'PATCH' || entry.method === 'PUT'
                                  ? 'text-orange-600'
                                  : entry.method === 'DELETE'
                                    ? 'text-red-600'
                                    : 'text-gray-600'
                          }`}
                        >
                          {entry.method}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate max-w-[200px] block">
                          {entry.path}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right hidden md:table-cell">
                        <span
                          className={`text-xs font-mono ${
                            entry.statusCode && entry.statusCode >= 400
                              ? 'text-red-600'
                              : entry.statusCode && entry.statusCode >= 300
                                ? 'text-yellow-600'
                                : 'text-green-600'
                          }`}
                        >
                          {entry.statusCode ?? '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right hidden lg:table-cell">
                        <span className="text-xs text-gray-400 font-mono">
                          {entry.durationMs != null ? `${entry.durationMs}ms` : '-'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 dark:border-gray-700">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Halaman {currentPage} dari {totalPages} ({total} total)
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={handlePrevPage}
                    disabled={offset <= 0}
                    className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition"
                  >
                    Sebelumnya
                  </button>
                  <button
                    onClick={handleNextPage}
                    disabled={offset + limit >= total}
                    className="px-3 py-1.5 text-xs rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-30 disabled:cursor-not-allowed transition"
                  >
                    Selanjutnya
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </PageContainer>
    </PermissionGuard>
  );
}
