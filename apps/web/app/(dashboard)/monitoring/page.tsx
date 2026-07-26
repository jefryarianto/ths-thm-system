'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import {
  Activity,
  Database,
  MemoryStick,
  Wifi,
  Server,
  CheckCircle2,
  XCircle,
  RefreshCw,
  AlertTriangle,
  BarChart3,
  WifiOff,
  Radio,
} from 'lucide-react';
import PageContainer from '@/components/ui/page-container';
import PageHeader from '@/components/ui/page-header';
import { PermissionGuard } from '@/components/auth/permission-guard';

// ── Types ────────────────────────────────────────────────────

interface HealthData {
  status: string;
  timestamp: string;
  uptime: number;
  database: { status: string; pool: { active: number; idle: number; total: number } };
  memory: { heapUsed: string; heapTotal: string };
  environment: string;
  version: string;
  cache: { entries: number; maxEntries: number };
  queue: {
    type: string;
    status: string;
    queueName: string;
    latencyMs?: number | null;
    workerStatus?: string;
    counts?: { waiting: number; active: number; completed: number; failed: number; delayed: number };
    error?: string;
    recentErrors?: { message: string; timestamp: string }[];
  };
}

type StatusType = 'healthy' | 'degraded' | 'down';

interface HealthCheck {
  label: string;
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  status: StatusType;
  detail: string;
}

// ── Helpers ──────────────────────────────────────────────────

function toStatus(value: string | undefined | null): StatusType {
  if (!value) return 'down';
  const ok = value === 'connected' || value === 'ok' || value === 'running';
  return ok ? 'healthy' : 'down';
}

function statusColor(status: StatusType): string {
  switch (status) {
    case 'healthy': return 'bg-green-500';
    case 'degraded': return 'bg-yellow-500';
    case 'down': return 'bg-red-500';
  }
}

function statusBg(status: StatusType): string {
  switch (status) {
    case 'healthy': return 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800';
    case 'degraded': return 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800';
    case 'down': return 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800';
  }
}

function statusTextColor(status: StatusType): string {
  switch (status) {
    case 'healthy': return 'text-green-700 dark:text-green-400';
    case 'degraded': return 'text-yellow-700 dark:text-yellow-400';
    case 'down': return 'text-red-700 dark:text-red-400';
  }
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}h ${h}j ${m}m`;
  if (h > 0) return `${h}j ${m}m`;
  return `${m}m`;
}

function Sparkline({ history }: { history: { timestamp: string; status: string }[] }) {
  if (!history || history.length === 0) {
    return (
      <div className="h-10 flex items-center justify-center text-xs text-gray-400 dark:text-gray-500">
        Belum ada data
      </div>
    );
  }

  // Take last 288 entries (24h at 5-min resolution), but show at most ~120 bars
  const maxBars = 96; // ~8 hours at 5-min resolution
  const sliced = history.slice(-maxBars);
  const height = 40;
  const width = 100;
  const barWidth = width / sliced.length;
  return (
    <div className="relative h-10">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" preserveAspectRatio="none">
        {sliced.map((s, i) => (
          <rect
            key={i}
            x={(i / sliced.length) * width}
            y={0}
            width={Math.max(barWidth - 0.3, 0.5)}
            height={height}
            fill={s.status === 'connected' ? '#22c55e' : '#ef4444'}
            rx={0.5}
          />
        ))}
      </svg>
      <div className="absolute inset-x-0 bottom-0 flex justify-between text-[9px] text-gray-400 dark:text-gray-500 px-0.5">
        <span>-8j</span>
        <span>-4j</span>
        <span>Sekarang</span>
      </div>
    </div>
  );
}

// ── Status Card ──────────────────────────────────────────────

function StatusCard({
  icon: Icon,
  label,
  status,
  detail,
  children,
}: HealthCheck & { children?: React.ReactNode }) {
  return (
    <div className={`rounded-xl border p-5 ${statusBg(status)} transition-all duration-500`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-lg ${status === 'healthy' ? 'bg-green-100 dark:bg-green-900' : status === 'degraded' ? 'bg-yellow-100 dark:bg-yellow-900' : 'bg-red-100 dark:bg-red-900'}`}>
            <Icon size={20} className={statusTextColor(status)} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
            <p className={`text-xs mt-0.5 font-medium ${statusTextColor(status)}`}>{detail}</p>
          </div>
        </div>
        <span className={`relative flex w-3 h-3 mt-1 ${status === 'healthy' ? '' : ''}`}>
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${statusColor(status)}`} />
          <span className={`relative inline-flex rounded-full w-3 h-3 ${statusColor(status)}`} />
        </span>
      </div>
      {children}
    </div>
  );
}

// ── Error List ───────────────────────────────────────────────

function ErrorList({ errors }: { errors: { message: string; timestamp: string }[] }) {
  if (!errors || errors.length === 0) return null;
  return (
    <div className="mt-3 pt-3 border-t border-red-200 dark:border-red-800">
      <p className="text-[11px] font-medium text-red-600 dark:text-red-400 mb-1.5 flex items-center gap-1">
        <AlertTriangle size={11} />
        Recent Errors
      </p>
      <div className="space-y-1 max-h-24 overflow-y-auto">
        {errors.map((e, i) => (
          <p key={i} className="text-[10px] text-red-500 dark:text-red-400 truncate" title={e.message}>
            {e.message}
          </p>
        ))}
      </div>
    </div>
  );
}

// ── Queue Stats Table ────────────────────────────────────────

function QueueStatsTable({ counts }: { counts: { waiting: number; active: number; completed: number; failed: number; delayed: number } }) {
  const rows = [
    { label: 'Menunggu', value: counts.waiting, color: 'text-yellow-600 dark:text-yellow-400' },
    { label: 'Aktif', value: counts.active, color: 'text-blue-600 dark:text-blue-400' },
    { label: 'Selesai', value: counts.completed, color: 'text-green-600 dark:text-green-400' },
    { label: 'Gagal', value: counts.failed, color: 'text-red-600 dark:text-red-400' },
    { label: 'Ditunda', value: counts.delayed, color: 'text-gray-500 dark:text-gray-400' },
  ];
  return (
    <div className="grid grid-cols-5 gap-2 mt-2">
      {rows.map((r) => (
        <div key={r.label} className="text-center">
          <p className={`text-sm font-bold ${r.color}`}>{r.value.toLocaleString()}</p>
          <p className="text-[10px] text-gray-400 dark:text-gray-500">{r.label}</p>
        </div>
      ))}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────

export default function MonitoringPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [uptimeHistoryData, setUptimeHistoryData] = useState<{ timestamp: string; status: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [sseConnected, setSseConnected] = useState<boolean | null>(null); // null=connecting, true=connected, false=disconnected
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval>>();

  /**
   * Fallback: fetch health data via REST polling (used when SSE fails).
   */
  const fetchData = useCallback(async () => {
    try {
      const { data: healthResp } = await apiClient.get('/health');
      setHealth(healthResp?.data || healthResp);
      setError(null);

      // Also fetch 24h queue uptime history for the sparkline
      try {
        const { data: uptimeResp } = await apiClient.get('/health/admin/queue-uptime');
        if (uptimeResp?.data?.history) {
          setUptimeHistoryData(uptimeResp.data.history);
        }
      } catch {
        // Uptime endpoint may be auth-restricted — gracefully degrade
      }

      setLastUpdated(new Date());
    } catch (err) {
      setError((err as { message?: string })?.message || 'Gagal memuat data');
    }
    setLoading(false);
  }, []);

  // ── SSE Connection ──
  useEffect(() => {
    let es: EventSource | null = null;

    const connectSSE = () => {
      try {
        es = new EventSource('/api/health/events');
        setSseConnected(null); // connecting

        es.addEventListener('health', (event) => {
          try {
            const data = JSON.parse(event.data);
            setHealth(data);
            setError(null);
            setLastUpdated(new Date());
            setSseConnected(true);
            setLoading(false);
          } catch {
            // ignore malformed data
          }
        });

        es.addEventListener('queue-status', (event) => {
          // Optionally update UI for queue transitions
          // The full health event already contains queue data
        });

        es.addEventListener('keepalive', () => {
          // Keepalive received — connection is healthy
          setSseConnected(true);
        });

        es.addEventListener('error', (event) => {
          const data = (event as MessageEvent).data;
          if (data) {
            try {
              const parsed = JSON.parse(data);
              setError(parsed.message || 'SSE error');
            } catch {
              // ignore
            }
          }
        });

        es.onerror = () => {
          setSseConnected(false);
          // EventSource will auto-reconnect
        };

        es.onopen = () => {
          setSseConnected(true);
        };
      } catch {
        // SSE not available — fall back to polling
        setSseConnected(false);
      }
    };

    connectSSE();

    // Cleanup
    return () => {
      if (es) {
        es.close();
      }
    };
  }, []);

  // ── Fallback polling (when SSE fails) ──
  useEffect(() => {
    if (sseConnected === false) {
      // SSE failed — use REST polling as fallback
      fetchData();
      pollingIntervalRef.current = setInterval(fetchData, 15_000);
      return () => clearInterval(pollingIntervalRef.current);
    }
  }, [sseConnected, fetchData]);

  // Also fetch uptime history separately (SSE doesn't include it)
  useEffect(() => {
    const fetchUptimeHistory = async () => {
      try {
        const { data: uptimeResp } = await apiClient.get('/health/admin/queue-uptime');
        if (uptimeResp?.data?.history) {
          setUptimeHistoryData(uptimeResp.data.history);
        }
      } catch {
        // silently degrade
      }
    };
    fetchUptimeHistory();
    const interval = setInterval(fetchUptimeHistory, 60_000); // refresh sparkline every 60s
    return () => clearInterval(interval);
  }, []);

  // ── Compute Checks ──
  const checks: HealthCheck[] = health ? [
    {
      label: 'API Server',
      icon: Server,
      status: toStatus(health.status),
      detail: `Uptime ${formatUptime(health.uptime)} · ${health.environment}`,
    },
    {
      label: 'Database',
      icon: Database,
      status: toStatus(health.database?.status),
      detail: health.database?.status === 'connected'
        ? `Pool: ${health.database.pool.active} aktif / ${health.database.pool.idle} idle / ${health.database.pool.total} total`
        : 'Tidak terhubung',
    },
    {
      label: 'Queue / Redis',
      icon: Wifi,
      status: toStatus(health.queue?.status),
      detail: health.queue?.status === 'connected'
        ? `${health.queue.type} · ${health.queue.workerStatus} · ${health.queue.latencyMs ?? '-'}ms`
        : (health.queue?.error || 'Tidak terhubung'),
    },
    {
      label: 'Memory',
      icon: MemoryStick,
      status: toStatus(health.memory?.heapUsed ? 'connected' : null),
      detail: `${health.memory?.heapUsed || '-'} used / ${health.memory?.heapTotal || '-'} total`,
    },
  ] : [];

  if (loading && !health) {
    return (
      <PermissionGuard module="monitoring" action="view">
        <PageContainer>
          <PageHeader title="Monitoring Server" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 animate-pulse">
                <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-3" />
                <div className="h-3 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
            ))}
          </div>
        </PageContainer>
      </PermissionGuard>
    );
  }

  const overallStatus = checks.every((c) => c.status === 'healthy') ? 'healthy'
    : checks.some((c) => c.status === 'down') ? 'down' : 'degraded';

  return (
    <PermissionGuard module="monitoring" action="view">
      <PageContainer>
        <PageHeader
          title="Monitoring Server"
          subtitle="Deteksi downtime API, Database, dan Queue — real-time via SSE"
          onRefresh={fetchData}
        >
          {/* SSE Connection Status */}
          <div className="flex items-center gap-2 text-xs">
            <span
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border transition ${
                sseConnected === true
                  ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-950 dark:border-green-800 dark:text-green-400'
                  : sseConnected === false
                    ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-950 dark:border-red-800 dark:text-red-400'
                    : 'bg-yellow-50 border-yellow-200 text-yellow-700 dark:bg-yellow-950 dark:border-yellow-800 dark:text-yellow-400'
              }`}
            >
              {sseConnected === true ? (
                <><Radio size={11} className="animate-pulse" /> Live</>
              ) : sseConnected === false ? (
                <><WifiOff size={11} /> Polling</>
              ) : (
                <><Radio size={11} className="animate-pulse" /> Menghubungkan...</>
              )}
            </span>
          </div>
        </PageHeader>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-3 mb-6">
            <XCircle size={20} className="text-red-500 shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-700 dark:text-red-400">Gagal memuat data</p>
              <p className="text-xs text-red-500 dark:text-red-400 mt-0.5">{error}</p>
            </div>
            <button onClick={fetchData} className="ml-auto px-3 py-1.5 text-xs bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-800 transition">
              Coba Lagi
            </button>
          </div>
        )}

        {/* Quick Overview */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <span className={`relative flex w-4 h-4`}>
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${statusColor(overallStatus)}`} />
                <span className={`relative inline-flex rounded-full w-4 h-4 ${statusColor(overallStatus)}`} />
              </span>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {overallStatus === 'healthy' ? '✅ Semua Sistem Sehat'
                    : overallStatus === 'degraded' ? '⚠️ Beberapa Sistem Bermasalah'
                    : '❌ Sistem Mengalami Gangguan'}
                </p>
                {lastUpdated && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    Terakhir diperbarui {lastUpdated.toLocaleTimeString('id-ID')} · {sseConnected ? 'Real-time via SSE' : 'Polling 15 detik'}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
              <span className="flex items-center gap-1"><CheckCircle2 size={12} className="text-green-500" /> {checks.filter(c => c.status === 'healthy').length} Sehat</span>
              <span className="flex items-center gap-1"><AlertTriangle size={12} className="text-yellow-500" /> {checks.filter(c => c.status === 'degraded').length} Degradasi</span>
              <span className="flex items-center gap-1"><XCircle size={12} className="text-red-500" /> {checks.filter(c => c.status === 'down').length} Down</span>
            </div>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {checks.map((check, i) => (
            <StatusCard key={i} {...check}>
              {check.label === 'Queue / Redis' && health?.queue?.counts && (
                <QueueStatsTable counts={health.queue.counts} />
              )}
              {check.label === 'Queue / Redis' && health?.queue?.recentErrors && health.queue.recentErrors.length > 0 && (
                <ErrorList errors={health.queue.recentErrors} />
              )}
            </StatusCard>
          ))}
        </div>

        {/* Bottom Row: Uptime Sparkline + System Info */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Uptime History */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 size={16} className="text-gray-500 dark:text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Uptime History (24 Jam)</h3>
              </div>
              {health?.queue && (
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  Resolusi 5 menit · {uptimeHistoryData.length} data point
                </span>
              )}
            </div>
            <Sparkline history={uptimeHistoryData} />
          </div>

          {/* System Info */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
              <Activity size={15} className="text-gray-500" />
              Informasi Sistem
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Versi</p>
                <p className="text-sm text-gray-800 dark:text-gray-200 font-mono">{health?.version || '-'}</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Environment</p>
                <p className="text-sm text-gray-800 dark:text-gray-200">{health?.environment || '-'}</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Cache</p>
                <p className="text-sm text-gray-800 dark:text-gray-200">{health?.cache?.entries || 0} / {health?.cache?.maxEntries || 1000} entries</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Terakhir Update</p>
                <p className="text-sm text-gray-800 dark:text-gray-200">
                  {lastUpdated ? lastUpdated.toLocaleString('id-ID') : '-'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </PageContainer>
    </PermissionGuard>
  );
}
