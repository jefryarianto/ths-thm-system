'use client';

import { PermissionGuard } from '@/components/auth/permission-guard';

import { useEffect, useState, useCallback, useRef } from 'react';
import apiClient from '@/lib/api-client';
import { getSocket } from '@/lib/socket';
import {

  Activity,
  Clock,
  CheckCircle2,
  XCircle,
  Timer,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import type { LucideProps } from 'lucide-react';
import PageContainer from '@/components/ui/page-container';
import PageHeader from '@/components/ui/page-header';

interface QueueStats {
  queueName: string;
  queueType: 'bullmq' | 'in-process';
  counts: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  };
  isPaused?: boolean;
  oldestJobAge?: number;
  recentJobRate?: { last1h: number; last24h: number };
  recentJobs: RecentJob[];
}

interface RecentJob {
  id: string;
  memberId: string;
  memberName: string;
  status: 'completed' | 'failed';
  error?: string | null;
  nomorDokumen?: string | null;
  createdAt: string;
  completedAt?: string | null;
}

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ElementType<LucideProps>;
  color: string;
  darkColor: string;
  subtitle?: string;
}

function StatCard({ label, value, icon: Icon, color, darkColor, subtitle }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 flex items-start gap-4 transition hover:shadow-md">
      <div className={`p-3 rounded-lg ${color} ${darkColor}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">{label}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value.toLocaleString()}</p>
        {subtitle && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const isToday = d.toDateString() === now.toDateString();

  if (diffMs < 60_000) return 'Baru saja';
  if (diffMs < 3_600_000) {
    const mins = Math.floor(diffMs / 60_000);
    return `${mins} menit lalu`;
  }
  if (isToday) {
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Play a short alert tone using the Web Audio API.
 * No audio files required — tones are synthesized in the browser.
 */
function playAlertSound(type: 'disconnect' | 'reconnect'): void {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.15; // moderate volume
    masterGain.connect(ctx.destination);

    if (type === 'disconnect') {
      // Descending tone — alarm-like: 440Hz → 220Hz over 300ms
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth'; // grittier sound for alerts
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(220, ctx.currentTime + 0.3);
      osc.connect(masterGain);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);

      // Second burst after a short gap
      const osc2 = ctx.createOscillator();
      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(330, ctx.currentTime + 0.4);
      osc2.frequency.linearRampToValueAtTime(220, ctx.currentTime + 0.6);
      osc2.connect(masterGain);
      osc2.start(ctx.currentTime + 0.4);
      osc2.stop(ctx.currentTime + 0.6);
    } else {
      // Ascending pleasant tone — 440Hz → 880Hz over 300ms
      const osc = ctx.createOscillator();
      osc.type = 'triangle'; // softer, musical tone
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(880, ctx.currentTime + 0.3);
      osc.connect(masterGain);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);

      // Second chord — hold at 660Hz for warmth
      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(660, ctx.currentTime + 0.35);
      osc2.frequency.setValueAtTime(660, ctx.currentTime + 0.6);
      osc2.connect(masterGain);
      osc2.start(ctx.currentTime + 0.35);
      osc2.stop(ctx.currentTime + 0.6);
    }

    // Auto-close the context after the sound finishes
    setTimeout(() => ctx.close(), 1500);
  } catch {
    // Web Audio API not available — silently skip
  }
}

function msToDuration(ms: number): string {
  if (ms < 1000) return '< 1s';
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`;
  return `${Math.floor(ms / 3_600_000)}h ${Math.floor((ms % 3_600_000) / 60_000)}m`;
}

/**
 * Format disconnection duration in Indonesian natural language.
 * Used in the reconnect notification body.
 */
function formatDownTime(ms: number): string {
  if (ms < 1000) return 'Terputus selama beberapa detik';
  if (ms < 60_000) {
    const secs = Math.floor(ms / 1000);
    return `Terputus selama ${secs} detik`;
  }
  if (ms < 3_600_000) {
    const mins = Math.floor(ms / 60_000);
    const secs = Math.floor((ms % 60_000) / 1000);
    if (secs === 0) return `Terputus selama ${mins} menit`;
    return `Terputus selama ${mins} menit ${secs} detik`;
  }
  const hours = Math.floor(ms / 3_600_000);
  const mins = Math.floor((ms % 3_600_000) / 60_000);
  if (mins === 0) return `Terputus selama ${hours} jam`;
  return `Terputus selama ${hours} jam ${mins} menit`;
}

interface QueueHealth {
  type: 'bullmq' | 'in-process' | 'inactive';
  status: 'connected' | 'disconnected' | 'not_initialized';
  queueName: string;
  error?: string;
  connection?: { host: string; port: number } | null;
  latencyMs?: number | null;
  workerStatus?: 'running' | 'idle' | 'stopped' | 'unknown';
  recentErrors?: { message: string; timestamp: string }[];
}

export default function QueueMonitorPage() {
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [queueHealth, setQueueHealth] = useState<QueueHealth | null>(null);
  const [uptimeHistory, setUptimeHistory] = useState<{ timestamp: string; status: string; durationMs?: number }[]>([]);
  const [uptimePercent, setUptimePercent] = useState(100);
  const [persistentEvents, setPersistentEvents] = useState<
    { id: string; startTime: string; endTime?: string; durationMs?: number }[]
  >([]);
  const [disconnectedAlert, setDisconnectedAlert] = useState(false);
  const [dismissedAlertId, setDismissedAlertId] = useState<string | null>(null);
  const [suppressedUntilReconnect, setSuppressedUntilReconnect] = useState(false);
  const [showReconnectToast, setShowReconnectToast] = useState(false);
  const [downtimeStr, setDowntimeStr] = useState('');
  const [healthEventLog, setHealthEventLog] = useState<
    { timestamp: Date; status: string; error?: string }[]
  >([]);
  const fetchStatsRef = useRef<() => Promise<void>>();
  const prevHealthStatusRef = useRef<string | null>(null);
  const disconnectTimeRef = useRef<number | null>(null);
  const healthEventLogRef = useRef<{ timestamp: Date; status: string; error?: string }[]>([]);
  const severityLabels: Record<string, string> = {
    '': 'Semua',
    short: 'Ringan',
    medium: 'Sedang',
    long: 'Berat',
    critical: 'Kritis',
  };
  const filterOptions: { label: string; value: string }[] = [
    { label: 'Semua', value: '' },
    { label: 'Ringan', value: 'short' },
    { label: 'Sedang', value: 'medium' },
    { label: 'Berat', value: 'long' },
    { label: 'Kritis', value: 'critical' },
  ];
  const [severityFilter, setSeverityFilter] = useState('');
  const severityFilterRef = useRef('');

  // Log a health status change — only on actual transitions, not every poll cycle
  const logHealthEvent = useCallback((health: QueueHealth) => {
    const prev = healthEventLogRef.current[0];
    if (prev && prev.status === health.status) return; // no change — skip
    const event = { timestamp: new Date(), status: health.status, error: health.error };
    healthEventLogRef.current = [event, ...healthEventLogRef.current].slice(0, 20);
    setHealthEventLog(healthEventLogRef.current);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  // ── Request browser notification permission for disconnect alerts ──
  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // ── Detect connected ↔ disconnected transitions for alerts ──
  useEffect(() => {
    if (!queueHealth) return;

    const currentStatus = queueHealth.status;
    const prevStatus = prevHealthStatusRef.current;
    prevHealthStatusRef.current = currentStatus;

    // Skip the first status assignment (no transition to compare)
    if (prevStatus === null) return;

    if (prevStatus === 'connected' && currentStatus === 'disconnected') {
      // Record the disconnect timestamp for duration tracking
      disconnectTimeRef.current = Date.now();

      // Show in-app banner with a unique alert ID so dismissals are per-event
      setDisconnectedAlert(true);
      setDismissedAlertId(null);

      // Play an alert sound
      playAlertSound('disconnect');

      // Also fire a browser notification (uses stored permission from init)
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        const errorMsg = queueHealth.error
          ? `\n\n${queueHealth.error}`
          : '';

        const notif = new Notification('🔴 Koneksi Antrean Terputus', {
          body: `Koneksi ke antrean ${queueHealth.queueName} terputus.${errorMsg}`,
          icon: '/logo.png',
          tag: 'queue-disconnected',
          requireInteraction: true,
        });

        notif.onclick = () => {
          window.focus();
          notif.close();
        };
      }
    } else if (prevStatus === 'disconnected' && currentStatus === 'connected') {
      // Compute disconnection duration from tracked timestamp
      let durationStr = '';
      if (disconnectTimeRef.current !== null) {
        const elapsed = Date.now() - disconnectTimeRef.current;
        durationStr = formatDownTime(elapsed);
        disconnectTimeRef.current = null; // reset
      }

      // Auto-dismiss the in-app alert on reconnect
      setDisconnectedAlert(false);
      setSuppressedUntilReconnect(false);

      // Show a green toast banner — a separate useEffect handles auto-dismiss
      setShowReconnectToast(true);

      // Play a pleasant recovery sound
      playAlertSound('reconnect');

      // Fire a browser notification that the queue is back
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        const body = `Koneksi ke antrean ${queueHealth.queueName} telah tersambung kembali.`
          + (durationStr ? `\n\n${durationStr}` : '');

        const notif = new Notification('✅ Koneksi Antrean Pulih', {
          body,
          icon: '/logo.png',
          tag: 'queue-reconnected',
        });
        notif.onclick = () => {
          window.focus();
          notif.close();
        };
      }
    }
  }, [queueHealth]);

  // ── Auto-dismiss the reconnect toast after 5 seconds ──
  useEffect(() => {
    if (!showReconnectToast) return;
    const timer = setTimeout(() => setShowReconnectToast(false), 5000);
    return () => clearTimeout(timer);
  }, [showReconnectToast]);

  // ── Live-updating downtime counter in the alert banner ──
  useEffect(() => {
    if (!disconnectedAlert || disconnectTimeRef.current === null) {
      setDowntimeStr('');
      return;
    }

    const tick = () => {
      if (disconnectTimeRef.current === null) return;
      const elapsed = Date.now() - disconnectTimeRef.current;
      setDowntimeStr(formatDownTime(elapsed).replace('Terputus selama ', ''));
    };

    tick(); // immediate first tick
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [disconnectedAlert]);

  const fetchStats = useCallback(async () => {
    // Fire all four requests in parallel — total latency = slowest single request
    const [statsResult, healthResult, uptimeResult, eventsResult] = await Promise.allSettled([
      apiClient.get('/admin/queue-stats'),
      apiClient.get('/health'),
      apiClient.get('/admin/queue-uptime'),
      apiClient.get('/admin/queue-uptime/events', {
        params: {
          limit: 5,
          ...(severityFilterRef.current ? { severity: severityFilterRef.current } : {}),
        },
      }),
    ]);

    // Process queue stats (with loading state)
    if (statsResult.status === 'fulfilled') {
      const { data } = statsResult.value;
      if (data?.data) {
        setStats(data.data);
        setLastUpdated(new Date());
        setError(null);
      }
    } else {
      setError((statsResult.reason as { message?: string })?.message || 'Gagal memuat data antrean');
    }
    setLoading(false);

    // Process health check (informational only)
    if (healthResult.status === 'fulfilled') {
      const { data } = healthResult.value;
      if (data?.data?.queue) {
        const health = data.data.queue as QueueHealth;
        logHealthEvent(health);
        setQueueHealth(health);
      }
    }

    // Process uptime sparkline history
    if (uptimeResult.status === 'fulfilled') {
      const { data } = uptimeResult.value;
      if (data?.data?.history) {
        setUptimeHistory(data.data.history);
        setUptimePercent(data.data.uptimePercent ?? 100);
      }
    }

    // Process persistent outage events
    if (eventsResult.status === 'fulfilled') {
      const { data } = eventsResult.value;
      if (data?.data?.events) {
        setPersistentEvents(data.data.events);
      }
    }
  }, []);

  // Keep ref in sync so the socket handler always calls the latest fetchStats
  fetchStatsRef.current = fetchStats;

  // ── WebSocket listener for real-time queue:updated events ──
  // Polling always runs as a belt-and-suspenders backup; WebSocket
  // provides instant updates on top of the regular polling cycle.
  useEffect(() => {
    fetchStats();

    let socket: ReturnType<typeof getSocket> | null = null;
    try {
      const token = localStorage.getItem('accessToken');
      if (token) {
        socket = getSocket(token);

        const handleQueueUpdated = () => {
          fetchStatsRef.current?.();
        };
        socket.on('queue:updated', handleQueueUpdated);

        // Receive queue health changes in real-time (disconnect/reconnect)
        socket.on('queue:health-changed', (health: QueueHealth) => {
          logHealthEvent(health);
          setQueueHealth(health);
        });

        setWsConnected(socket.connected);

        const handleConnect = () => setWsConnected(true);
        const handleDisconnect = () => setWsConnected(false);
        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);
      }
    } catch {
      // WebSocket unavailable — polling fallback below
    }

    // ── Polling fallback (always active) ──
    const interval = setInterval(fetchStats, 5_000);

    return () => {
      clearInterval(interval);
      if (socket) {
        socket.off('queue:updated');
        socket.off('queue:health-changed');
        socket.off('connect');
        socket.off('disconnect');
      }
    };
  }, [fetchStats]);

  const totalJobs = stats
    ? stats.counts.waiting + stats.counts.active + stats.counts.completed + stats.counts.failed + stats.counts.delayed
    : 0;

  if (!mounted) {
    return <div className="p-6" />;
  }

  return (
      <PermissionGuard module="admin" action="view">
        <PageContainer>
              <PageHeader
                title="Monitor Antrean"
                onRefresh={fetchStats}
              />
        
              {/* Queue Type & Status Bar */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-4">
                  {/* Queue type badge */}
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                    stats?.queueType === 'bullmq'
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                  }`}>
                    <Activity size={12} />
                    {stats?.queueType === 'bullmq' ? 'BullMQ (Redis)' : 'In-Process'}
                  </span>
        
                  {/* Connection health dot with hover popover */}
                  <div className="relative group">
                    <span className="flex items-center gap-1.5 text-xs cursor-default">
                      <span className="relative flex w-2.5 h-2.5">
                        {queueHealth?.status === 'connected' ? (
                          <>
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                            <span className="relative inline-flex rounded-full w-2.5 h-2.5 bg-green-500" />
                          </>
                        ) : queueHealth?.status === 'disconnected' ? (
                          <>
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                            <span className="relative inline-flex rounded-full w-2.5 h-2.5 bg-red-500" />
                          </>
                        ) : (
                          <span className="relative inline-flex rounded-full w-2.5 h-2.5 bg-gray-400 dark:bg-gray-500" />
                        )}
                      </span>
                      <span className={`text-xs ${
                        queueHealth?.status === 'connected'
                          ? 'text-green-600 dark:text-green-400'
                          : queueHealth?.status === 'disconnected'
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-gray-400 dark:text-gray-500'
                      }`}>
                        {!queueHealth
                          ? 'Memeriksa...'
                          : queueHealth.status === 'connected'
                            ? 'Terhubung'
                            : queueHealth.status === 'disconnected'
                              ? 'Terputus'
                              : 'Tidak aktif'}
                      </span>
                    </span>
        
                    {/* ── Popover ── */}
                    {queueHealth && (
                      <div className="absolute left-0 top-full mt-2 z-50 w-80 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 translate-y-1 group-hover:translate-y-0">
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl p-4 space-y-3 text-sm">
                          {/* Header */}
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-gray-800 dark:text-gray-200">Status Koneksi</span>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                              queueHealth.status === 'connected'
                                ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400'
                                : queueHealth.status === 'disconnected'
                                  ? 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400'
                                  : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                queueHealth.status === 'connected' ? 'bg-green-500' :
                                queueHealth.status === 'disconnected' ? 'bg-red-500' : 'bg-gray-400'
                              }`} />
                              {queueHealth.status === 'connected' ? 'Terhubung' :
                               queueHealth.status === 'disconnected' ? 'Terputus' : 'Tidak Aktif'}
                            </span>
                          </div>
        
                          <hr className="border-gray-100 dark:border-gray-700" />
        
                          {/* Connection details */}
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-500 dark:text-gray-400">Tipe Antrean</span>
                              <span className="font-medium text-gray-800 dark:text-gray-200">
                                {queueHealth.type === 'bullmq' ? 'BullMQ (Redis)' : 'In-Process'}
                              </span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-500 dark:text-gray-400">Nama Antrean</span>
                              <span className="font-mono text-gray-800 dark:text-gray-200">{queueHealth.queueName}</span>
                            </div>
                            {queueHealth.connection && (
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-500 dark:text-gray-400">Host Redis</span>
                                <span className="font-mono text-gray-800 dark:text-gray-200">{queueHealth.connection.host}:{queueHealth.connection.port}</span>
                              </div>
                            )}
                            {queueHealth.connection === null && (
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-500 dark:text-gray-400">Host Redis</span>
                                <span className="text-gray-400 dark:text-gray-500 italic">Tidak diperlukan</span>
                              </div>
                            )}
                            {queueHealth.latencyMs !== null && queueHealth.latencyMs !== undefined && (
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-500 dark:text-gray-400">Latensi</span>
                                <span className={`font-mono ${
                                  queueHealth.latencyMs < 10
                                    ? 'text-green-600 dark:text-green-400'
                                    : queueHealth.latencyMs < 50
                                      ? 'text-amber-600 dark:text-amber-400'
                                      : 'text-red-600 dark:text-red-400'
                                }`}>{queueHealth.latencyMs} ms</span>
                              </div>
                            )}
                            {queueHealth.workerStatus && (
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-500 dark:text-gray-400">Worker</span>
                                <span className="flex items-center gap-1.5">
                                  <span className={`w-1.5 h-1.5 rounded-full ${
                                    queueHealth.workerStatus === 'running' ? 'bg-green-500' :
                                    queueHealth.workerStatus === 'idle' ? 'bg-amber-400' :
                                    queueHealth.workerStatus === 'stopped' ? 'bg-red-500' : 'bg-gray-400'
                                  }`} />
                                  <span className="text-gray-800 dark:text-gray-200 capitalize">{queueHealth.workerStatus}</span>
                                </span>
                              </div>
                            )}
                            {queueHealth.error && (
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-500 dark:text-gray-400">Error</span>
                                <span className="text-red-600 dark:text-red-400 max-w-[180px] text-right break-words">{queueHealth.error}</span>
                              </div>
                            )}
                          </div>
        
                          {/* Recent errors */}
                          {queueHealth.recentErrors && queueHealth.recentErrors.length > 0 && (
                            <>
                              <hr className="border-gray-100 dark:border-gray-700" />
                              <div>
                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
                                  Error Terbaru ({queueHealth.recentErrors.length})
                                </p>
                                <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                                  {queueHealth.recentErrors.map((err, i) => (
                                    <div key={i} className="text-[11px] bg-red-50 dark:bg-red-950/50 rounded-lg p-2 border border-red-100 dark:border-red-900">
                                      <p className="text-red-700 dark:text-red-300 line-clamp-2 leading-relaxed">{err.message}</p>
                                      <p className="text-red-400 dark:text-red-500 mt-0.5">
                                        {formatTimestamp(err.timestamp)}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </>
                          )}
        
                          {/* No recent errors */}
                          {queueHealth.recentErrors && queueHealth.recentErrors.length === 0 && (
                            <>
                              <hr className="border-gray-100 dark:border-gray-700" />
                              <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                                <CheckCircle2 size={12} />
                                Tidak ada error baru-baru ini
                              </p>
                            </>
                          )}
        
                          {/* Health event timeline — last 20 status transitions */}
                          {healthEventLog.length > 1 && (
                            <>
                              <hr className="border-gray-100 dark:border-gray-700" />
                              <div>
                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
                                  Riwayat Perubahan Status
                                </p>
                                <div className="space-y-1 max-h-[160px] overflow-y-auto pr-1">
                                  {healthEventLog.slice(0, 10).map((event, i) => (
                                    <div key={i} className="flex items-start gap-2 text-[11px]">
                                      {/* Timeline dot + line */}
                                      <div className="flex flex-col items-center shrink-0 pt-1">
                                        <span className={`w-2 h-2 rounded-full ${
                                          event.status === 'connected' ? 'bg-green-500' :
                                          event.status === 'disconnected' ? 'bg-red-500' : 'bg-gray-400'
                                        }`} />
                                        {i < healthEventLog.slice(0, 10).length - 1 && (
                                          <span className="w-px h-3 bg-gray-200 dark:bg-gray-700" />
                                        )}
                                      </div>
                                      <div className="flex-1 min-w-0 pb-1">
                                        <div className="flex items-center justify-between">
                                          <span className={`font-medium ${
                                            event.status === 'connected'
                                              ? 'text-green-700 dark:text-green-400'
                                              : event.status === 'disconnected'
                                                ? 'text-red-700 dark:text-red-400'
                                                : 'text-gray-500 dark:text-gray-400'
                                          }`}>
                                            {event.status === 'connected'
                                              ? 'Terhubung'
                                              : event.status === 'disconnected'
                                                ? 'Terputus'
                                                : event.status}
                                          </span>
                                          <span className="text-gray-400 dark:text-gray-500 ml-2">
                                            {formatTimestamp(event.timestamp.toISOString())}
                                          </span>
                                        </div>
                                        {event.error && (
                                          <p className="text-red-500 dark:text-red-400 truncate mt-0.5 leading-relaxed">
                                            {event.error}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
        
                  {/* Uptime sparkline — 24h connection history */}
                  {uptimeHistory.length > 0 && (
                    <div
                      className="flex items-center gap-2"
                      title={`Uptime 24 jam: ${uptimePercent}% — ${uptimeHistory.filter(h => h.status === 'connected').length} dari ${uptimeHistory.length} interval 5 menit terhubung`}
                    >
                      <div className="flex items-end gap-[1px] h-5">
                        {(() => {
                          // Downsample 288 buckets to ~72 bars for display
                          const targetBars = 72;
                          const step = Math.max(1, Math.floor(uptimeHistory.length / targetBars));
                          const bars: { status: string; severity?: 'low' | 'medium' | 'high' | 'critical' }[] = [];
                          for (let i = 0; i < uptimeHistory.length; i += step) {
                            const slice = uptimeHistory.slice(i, Math.min(i + step, uptimeHistory.length));
                            const anyConnected = slice.some((h) => h.status === 'connected');
                            const anyDisconnected = slice.some((h) => h.status === 'disconnected');
                            if (anyConnected && anyDisconnected) {
                              // Mixed status — find max duration in the slice for severity
                              const maxDuration = Math.max(...slice.map((h) => h.durationMs ?? 0));
                              let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
                              if (maxDuration >= 1_800_000) severity = 'critical';
                              else if (maxDuration >= 300_000) severity = 'high';
                              else if (maxDuration >= 60_000) severity = 'medium';
                              bars.push({ status: 'degraded', severity });
                            } else if (anyConnected) {
                              bars.push({ status: 'connected' });
                            } else {
                              // All disconnected — find max duration for severity
                              const maxDuration = Math.max(...slice.map((h) => h.durationMs ?? 0));
                              let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
                              if (maxDuration >= 1_800_000) severity = 'critical';
                              else if (maxDuration >= 300_000) severity = 'high';
                              else if (maxDuration >= 60_000) severity = 'medium';
                              bars.push({ status: 'disconnected', severity });
                            }
                          }
                          return bars.map((bar, i) => {
                            let bgClass: string;
                            let barHeight: string;
                            let tooltip: string;
                            if (bar.status === 'connected') {
                              bgClass = 'bg-green-400 dark:bg-green-600';
                              barHeight = '100%';
                              tooltip = 'Terhubung';
                            } else if (bar.status === 'degraded') {
                              barHeight = '75%';
                              tooltip = 'Terputus sebagian';
                              switch (bar.severity) {
                                case 'critical':
                                  bgClass = 'bg-red-600 dark:bg-red-600';
                                  tooltip = 'Terputus sebagian (> 30 mnt)';
                                  break;
                                case 'high':
                                  bgClass = 'bg-red-500 dark:bg-red-500';
                                  tooltip = 'Terputus sebagian (5-30 mnt)';
                                  break;
                                case 'medium':
                                  bgClass = 'bg-orange-400 dark:bg-orange-500';
                                  tooltip = 'Terputus sebagian (1-5 mnt)';
                                  break;
                                default:
                                  bgClass = 'bg-amber-300 dark:bg-amber-400';
                                  tooltip = 'Terputus sebagian (< 1 mnt)';
                              }
                            } else {
                              barHeight = '100%';
                              switch (bar.severity) {
                                case 'critical':
                                  bgClass = 'bg-red-700 dark:bg-red-600';
                                  tooltip = 'Terputus (> 30 mnt)';
                                  break;
                                case 'high':
                                  bgClass = 'bg-red-500 dark:bg-red-500';
                                  tooltip = 'Terputus (5-30 mnt)';
                                  break;
                                case 'medium':
                                  bgClass = 'bg-orange-500 dark:bg-orange-500';
                                  tooltip = 'Terputus (1-5 mnt)';
                                  break;
                                default:
                                  bgClass = 'bg-red-300 dark:bg-red-400';
                                  tooltip = 'Terputus (< 1 mnt)';
                              }
                            }
                            return (
                              <div
                                key={i}
                                className={`w-[3px] rounded-[1px] transition-all duration-300 ${bgClass}`}
                                style={{ height: barHeight }}
                                title={tooltip}
                              />
                            );
                          });
                        })()}
                      </div>
                      <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 whitespace-nowrap">
                        {uptimePercent}%
                      </span>
                    </div>
                  )}
        
                  {/* Paused status */}
                  {stats?.queueType === 'bullmq' && (
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                      stats.isPaused
                        ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                        : 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400'
                    }`}>
                      {stats.isPaused ? <Timer size={12} /> : <CheckCircle2 size={12} />}
                      {stats.isPaused ? 'Dijeda' : 'Aktif'}
                    </span>
                  )}
                </div>
        
                <div className="flex items-center gap-4">
                  {/* Last updated */}
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {lastUpdated
                      ? `Diperbarui ${lastUpdated.toLocaleTimeString('id-ID')}`
                      : loading ? 'Memuat...' : ''}
                  </span>
        
                  {/* WebSocket connection indicator */}
                  <span className={`flex items-center gap-1.5 text-xs ${
                    wsConnected
                      ? 'text-green-500 dark:text-green-400'
                      : 'text-gray-400 dark:text-gray-500'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${
                      wsConnected ? 'bg-green-500' : 'bg-gray-400 dark:bg-gray-500'
                    }`} />
                    {wsConnected ? 'Langsung' : 'Polling 5 detik'}
                  </span>
                </div>
              </div>
        
              {/* Last 5 Outages — persistent disconnect events from the database */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                {/* Severity filter buttons */}
                <div className="px-5 py-3 flex items-center gap-1.5 flex-wrap">
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mr-3">
                    5 Gangguan Terakhir{severityFilter ? ` — ${severityLabels[severityFilter]}` : ''}
                  </h3>
                  <div className="flex items-center gap-1.5">
                    {filterOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => {
                          setSeverityFilter(opt.value);
                          severityFilterRef.current = opt.value;
                          apiClient
                            .get('/admin/queue-uptime/events', {
                              params: { limit: 5, ...(opt.value ? { severity: opt.value } : {}) },
                            })
                            .then(({ data }) => {
                              if (data?.data?.events) setPersistentEvents(data.data.events);
                            })
                            .catch(() => {});
                        }}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-all duration-200 ${
                          severityFilter === opt.value
                            ? 'bg-gray-800 text-white dark:bg-white dark:text-gray-900 shadow-sm'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="overflow-x-auto border-t border-gray-200 dark:border-gray-800">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800/60">
                        <th className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-5 py-2.5">Waktu Mulai</th>
                        <th className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-5 py-2.5">Durasi</th>
                        <th className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-5 py-2.5">Tingkat</th>
                        <th className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-5 py-2.5">Waktu Selesai</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {persistentEvents.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-5 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
                            <div className="flex flex-col items-center gap-2">
                              <Clock size={20} className="text-gray-300 dark:text-gray-600" />
                              <span>Tidak ada gangguan {severityFilter ? `dengan tingkat ${severityLabels[severityFilter]}` : ''} dalam 30 hari terakhir</span>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        persistentEvents.slice(0, 5).map((event) => {
                          const dMs = event.durationMs ?? 0;
                          let severityLabel: string;
                          let badgeClass: string;
                          if (dMs >= 1_800_000) {
                            severityLabel = 'Kritis';
                            badgeClass = 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400';
                          } else if (dMs >= 300_000) {
                            severityLabel = 'Berat';
                            badgeClass = 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400';
                          } else if (dMs >= 60_000) {
                            severityLabel = 'Sedang';
                            badgeClass = 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400';
                          } else if (dMs > 0) {
                            severityLabel = 'Ringan';
                            badgeClass = 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400';
                          } else {
                            severityLabel = '—';
                            badgeClass = 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500';
                          }
                          return (
                            <tr
                              key={event.id}
                              className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                            >
                              <td className="px-5 py-3 whitespace-nowrap">
                                <span className="text-xs text-gray-700 dark:text-gray-300">
                                  {formatTimestamp(event.startTime)}
                                </span>
                              </td>
                              <td className="px-5 py-3 whitespace-nowrap">
                                {event.durationMs !== undefined && event.durationMs !== null ? (
                                  <span className="text-xs font-medium text-gray-800 dark:text-gray-200">
                                    {formatDownTime(event.durationMs)}
                                  </span>
                                ) : (
                                  <span className="text-xs text-gray-400 dark:text-gray-500 italic">—</span>
                                )}
                              </td>
                              <td className="px-5 py-3">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${badgeClass}`}>
                                  {severityLabel}
                                </span>
                              </td>
                              <td className="px-5 py-3 text-right whitespace-nowrap">
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {event.endTime
                                    ? formatTimestamp(event.endTime)
                                    : '—'}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
        
              {/* Disconnect alert — shown when queue transitions from connected to disconnected */}
              {disconnectedAlert && dismissedAlertId === null && !suppressedUntilReconnect && queueHealth?.error && (
                <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl overflow-hidden">
                  <div className="flex items-start gap-3 px-5 py-4">
                    <div className="shrink-0 mt-0.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
                        <AlertTriangle size={16} className="text-red-600 dark:text-red-400" />
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                        Koneksi Antrean Terputus{downtimeStr ? ` — ${downtimeStr}` : ''}
                      </p>
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1 leading-relaxed">
                        {queueHealth.error}
                      </p>
                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        <button
                          onClick={fetchStats}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900 hover:bg-red-200 dark:hover:bg-red-800 px-3 py-1.5 rounded-lg transition"
                        >
                          <RefreshCw size={12} />
                          Coba lagi
                        </button>
                        <button
                          onClick={() => setSuppressedUntilReconnect(true)}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-700 hover:bg-red-100 dark:hover:bg-red-900 px-3 py-1.5 rounded-lg transition"
                          title="Abaikan hingga tersambung kembali — berguna saat pemeliharaan terjadwal"
                        >
                          <Clock size={12} />
                          Abaikan hingga tersambung
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={() => setDismissedAlertId(Date.now().toString())}
                      className="shrink-0 p-1 rounded-md text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-100 dark:hover:bg-red-900 transition"
                      title="Tutup sementara"
                    >
                      <XCircle size={16} />
                    </button>
                  </div>
                </div>
              )}
        
              {/* Reconnect toast — briefly shown when queue comes back */}
              {showReconnectToast && (
                <div            className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-xl overflow-hidden transition-all duration-500 animate-slide-down">
                  <div className="flex items-center gap-3 px-5 py-4">
                    <div className="shrink-0">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                        <CheckCircle2 size={16} className="text-green-600 dark:text-green-400" />
                      </span>
                    </div>
                    <p className="text-sm font-medium text-green-800 dark:text-green-300 flex-1">
                      Koneksi antrean pulih
                    </p>
                    <button
                      onClick={() => setShowReconnectToast(false)}
                      className="shrink-0 p-1 rounded-md text-green-400 hover:text-green-600 dark:hover:text-green-300 hover:bg-green-100 dark:hover:bg-green-900 transition"
                      title="Tutup"
                    >
                      <XCircle size={14} />
                    </button>
                  </div>
                </div>
              )}
        
              {/* Error Banner for API failures */}
              {error && !disconnectedAlert && (
                <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm px-4 py-3 rounded-xl flex items-center justify-between">
                  <span>{error}</span>
                  <button onClick={fetchStats} className="underline hover:no-underline text-xs font-medium">
                    Coba lagi
                  </button>
                </div>
              )}
        
              {/* Stat Cards */}
              {loading && !stats ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 animate-pulse">
                      <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded mb-3" />
                      <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
                    </div>
                  ))}
                </div>
              ) : stats ? (
                <>
                  {/* Primary stats */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                    <StatCard
                      label="Menunggu"
                      value={stats.counts.waiting}
                      icon={Clock}
                      color="bg-amber-500"
                      darkColor="dark:bg-amber-600"
                      subtitle={stats.counts.waiting > 0 ? 'Menunggu diproses' : 'Tidak ada antrean'}
                    />
                    <StatCard
                      label="Diproses"
                      value={stats.counts.active}
                      icon={Activity}
                      color="bg-blue-500"
                      darkColor="dark:bg-blue-600"
                      subtitle={stats.counts.active > 0 ? 'Sedang dikerjakan' : 'Tidak ada proses aktif'}
                    />
                    <StatCard
                      label="Selesai"
                      value={stats.counts.completed}
                      icon={CheckCircle2}
                      color="bg-green-500"
                      darkColor="dark:bg-green-600"
                      subtitle={stats.counts.completed > 0 ? 'Berhasil diproses' : 'Belum ada'}
                    />
                    <StatCard
                      label="Gagal"
                      value={stats.counts.failed}
                      icon={XCircle}
                      color="bg-red-500"
                      darkColor="dark:bg-red-600"
                      subtitle={stats.counts.failed > 0 ? 'Perlu diperiksa' : 'Tidak ada kegagalan'}
                    />
                    <StatCard
                      label="Ditunda"
                      value={stats.counts.delayed}
                      icon={Timer}
                      color="bg-purple-500"
                      darkColor="dark:bg-purple-600"
                      subtitle={stats.counts.delayed > 0 ? 'Dijadwalkan ulang' : 'Tidak ada'}
                    />
                  </div>
        
                  {/* Secondary info row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Total jobs card */}
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Pekerjaan</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{totalJobs.toLocaleString()}</p>
                      <div className="mt-3 flex gap-1 h-2 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800">
                        {totalJobs > 0 && (
                          <>
                            <div
                              className="bg-amber-500 h-full transition-all duration-500"
                              style={{ width: `${(stats.counts.waiting / totalJobs) * 100}%` }}
                              title={`Menunggu: ${stats.counts.waiting}`}
                            />
                            <div
                              className="bg-blue-500 h-full transition-all duration-500"
                              style={{ width: `${(stats.counts.active / totalJobs) * 100}%` }}
                              title={`Diproses: ${stats.counts.active}`}
                            />
                            <div
                              className="bg-green-500 h-full transition-all duration-500"
                              style={{ width: `${(stats.counts.completed / totalJobs) * 100}%` }}
                              title={`Selesai: ${stats.counts.completed}`}
                            />
                            <div
                              className="bg-red-500 h-full transition-all duration-500"
                              style={{ width: `${(stats.counts.failed / totalJobs) * 100}%` }}
                              title={`Gagal: ${stats.counts.failed}`}
                            />
                            <div
                              className="bg-purple-500 h-full transition-all duration-500"
                              style={{ width: `${(stats.counts.delayed / totalJobs) * 100}%` }}
                              title={`Ditunda: ${stats.counts.delayed}`}
                            />
                          </>
                        )}
                      </div>
                    </div>
        
                    {/* Queue type info */}
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Informasi Antrean</p>
                      <div className="mt-3 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500 dark:text-gray-400">Nama Antrean</span>
                          <span className="font-mono text-xs text-gray-900 dark:text-white">{stats.queueName}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500 dark:text-gray-400">Tipe</span>
                          <span className="text-gray-900 dark:text-white">{stats.queueType === 'bullmq' ? 'BullMQ' : 'In-Process'}</span>
                        </div>
                        {stats.isPaused !== undefined && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500 dark:text-gray-400">Status</span>
                            <span className={`font-medium ${stats.isPaused ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'}`}>
                              {stats.isPaused ? 'Dijeda' : 'Aktif'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
        
                    {/* Recent activity */}
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Aktivitas Terakhir</p>
                      <div className="mt-3 space-y-2">
                        {stats.oldestJobAge !== undefined ? (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500 dark:text-gray-400">Antrean tertua</span>
                            <span className="text-gray-900 dark:text-white">{msToDuration(stats.oldestJobAge)}</span>
                          </div>
                        ) : null}
                        {stats.recentJobRate ? (
                          <>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500 dark:text-gray-400">1 jam terakhir</span>
                              <span className="text-gray-900 dark:text-white">{stats.recentJobRate.last1h} selesai</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500 dark:text-gray-400">24 jam terakhir</span>
                              <span className="text-gray-900 dark:text-white">{stats.recentJobRate.last24h} selesai</span>
                            </div>
                          </>
                        ) : null}
                        {!stats.oldestJobAge && !stats.recentJobRate && (
                          <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500">
                            <AlertTriangle size={14} />
                            <span>Data tidak tersedia untuk antrean BullMQ</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
        
                  {/* Legend for the progress bar */}
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" /> Menunggu
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" /> Diproses
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-sm bg-green-500" /> Selesai
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-sm bg-red-500" /> Gagal
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-sm bg-purple-500" /> Ditunda
                    </span>
                  </div>
        
                  {/* Riwayat Pekerjaan — last 50 jobs table */}
                  <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Riwayat Pekerjaan</h3>
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {stats.recentJobs.length > 0
                          ? `${stats.recentJobs.length} terakhir`
                          : 'Belum ada aktivitas'}
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 dark:bg-gray-800/60">
                            <th className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-5 py-3">Anggota</th>
                            <th className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-5 py-3">Status</th>
                            <th className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-5 py-3">Nomor Dokumen</th>
                            <th className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-5 py-3">Pesan Error</th>
                            <th className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-5 py-3">Selesai</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                          {stats.recentJobs.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-5 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
                                <div className="flex flex-col items-center gap-2">
                                  <Clock size={20} className="text-gray-300 dark:text-gray-600" />
                                  <span>Belum ada pekerjaan yang selesai atau gagal</span>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            stats.recentJobs.map((job) => (
                              <tr
                                key={job.id}
                                className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                              >
                                <td className="px-5 py-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                                      {job.memberName.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-[200px]">{job.memberName}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-5 py-3">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                                    job.status === 'completed'
                                      ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400'
                                      : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400'
                                  }`}>
                                    {job.status === 'completed' ? (
                                      <><CheckCircle2 size={11} /> Selesai</>
                                    ) : (
                                      <><XCircle size={11} /> Gagal</>
                                    )}
                                  </span>
                                </td>
                                <td className="px-5 py-3">
                                  <span className="font-mono text-xs text-gray-600 dark:text-gray-400">
                                    {job.nomorDokumen || (
                                      <span className="text-gray-300 dark:text-gray-600 italic">—</span>
                                    )}
                                  </span>
                                </td>
                                <td className="px-5 py-3 max-w-[280px]">
                                  {job.error ? (
                                    <span className="text-xs text-red-600 dark:text-red-400 line-clamp-2" title={job.error}>
                                      {job.error}
                                    </span>
                                  ) : (
                                    <span className="text-xs text-green-600 dark:text-green-400">
                                      {job.status === 'completed' ? 'Berhasil' : ''}
                                    </span>
                                  )}
                                </td>
                                <td className="px-5 py-3 text-right">
                                  <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                    {job.completedAt
                                      ? formatTimestamp(job.completedAt)
                                      : formatTimestamp(job.createdAt)}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-12 text-center">
                  <Activity size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">Gagal memuat data antrean. Pastikan API server berjalan.</p>
                </div>
              )}
            </PageContainer>
      </PermissionGuard>
    );
}
