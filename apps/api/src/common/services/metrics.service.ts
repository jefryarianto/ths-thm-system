import { Injectable, Optional } from '@nestjs/common';
import { EventsGateway } from '../../modules/notifications/events.gateway';

interface RequestMetric {
  method: string;
  status: number;
  count: number;
  totalDurationMs: number;
  maxDurationMs: number;
}

export type AuthOperation = 'session_verify' | 'refresh' | 'logout';
export type AuthResult = 'success' | 'unauthorized' | 'internal';

interface AuthMetric {
  operation: AuthOperation;
  result: AuthResult;
  count: number;
  totalDurationMs: number;
  maxDurationMs: number;
}

export const AUTH_OPERATIONS: readonly AuthOperation[] = [
  'session_verify',
  'refresh',
  'logout',
];
export const AUTH_RESULTS: readonly AuthResult[] = [
  'success',
  'unauthorized',
  'internal',
];

export interface MetricsSnapshot {
  startedAt: string;
  uptimeSeconds: number;
  http: {
    totalRequests: number;
    byMethodStatus: RequestMetric[];
  };
  auth: {
    byOperationResult: AuthMetric[];
  };
  memory: {
    rssMb: number;
    heapUsedMb: number;
    heapTotalMb: number;
    externalMb: number;
  };
  websocket?: {
    totalConnections: number;
    uniqueUsers: number;
    security?: {
      throttledPackets: number;
      rejectedConnections: number;
    };
  };
}

/**
 * Kolektor metrik runtime sederhana (in-memory, sliding sejak proses mulai):
 * - Jumlah request per metode+status dan durasi (total/maks)
 * - Memori proses
 * - Statistik WebSocket (jumlah koneksi, user unik, metrik throttle)
 * Diekspos sebagai JSON (dashboard) dan format teks Prometheus.
 */
@Injectable()
export class MetricsService {
  private readonly startedAt = Date.now();
  private readonly metrics = new Map<string, RequestMetric>();
  private readonly authMetrics = new Map<string, AuthMetric>();

  constructor(@Optional() private readonly eventsGateway?: EventsGateway) {}

  record(method: string, status: number, durationMs: number): void {
    const key = `${method}:${status}`;
    const existing = this.metrics.get(key);
    if (existing) {
      existing.count += 1;
      existing.totalDurationMs += durationMs;
      if (durationMs > existing.maxDurationMs) existing.maxDurationMs = durationMs;
    } else {
      this.metrics.set(key, {
        method,
        status,
        count: 1,
        totalDurationMs: durationMs,
        maxDurationMs: durationMs,
      });
    }
  }

  /**
   * Catat metrik autentikasi low-cardinality. Hanya menerima operation/result
   * dari himpunan terbatas (AUTH_OPERATIONS / AUTH_RESULTS) sehingga tidak ada
   * label arbitrer, URL mentah, atau identitas user/sesi/token.
   */
  recordAuth(operation: AuthOperation, result: AuthResult, durationMs: number): void {
    const key = `${operation}:${result}`;
    const existing = this.authMetrics.get(key);
    if (existing) {
      existing.count += 1;
      existing.totalDurationMs += durationMs;
      if (durationMs > existing.maxDurationMs) existing.maxDurationMs = durationMs;
    } else {
      this.authMetrics.set(key, {
        operation,
        result,
        count: 1,
        totalDurationMs: durationMs,
        maxDurationMs: durationMs,
      });
    }
  }

  snapshot(): MetricsSnapshot {
    const mem = process.memoryUsage();
    let websocket: MetricsSnapshot['websocket'];
    try {
      const stats = this.eventsGateway?.getStats?.();
      if (stats) {
        websocket = {
          totalConnections: stats.totalConnections ?? 0,
          uniqueUsers: stats.uniqueUsers ?? 0,
          security: stats.security,
        };
      }
    } catch {
      // Gateway mungkin belum siap — lewati.
    }

    return {
      startedAt: new Date(this.startedAt).toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      http: {
        totalRequests: [...this.metrics.values()].reduce((sum, m) => sum + m.count, 0),
        byMethodStatus: [...this.metrics.values()].sort(
          (a, b) => b.count - a.count,
        ),
      },
      auth: {
        byOperationResult: [...this.authMetrics.values()].sort(
          (a, b) => b.count - a.count,
        ),
      },
      memory: {
        rssMb: Math.round(mem.rss / 1024 / 1024),
        heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
        externalMb: Math.round(mem.external / 1024 / 1024),
      },
      websocket,
    };
  }

  prometheus(): string {
    const snap = this.snapshot();
    const lines: string[] = [];
    lines.push('# HELP ths_http_requests_total Total HTTP requests by method and status');
    lines.push('# TYPE ths_http_requests_total counter');
    for (const m of snap.http.byMethodStatus) {
      lines.push(
        `ths_http_requests_total{method="${m.method}",status="${m.status}"} ${m.count}`,
      );
    }
    lines.push('# HELP ths_http_request_duration_ms_total Total request duration (ms)');
    lines.push('# TYPE ths_http_request_duration_ms_total counter');
    for (const m of snap.http.byMethodStatus) {
      lines.push(
        `ths_http_request_duration_ms_total{method="${m.method}",status="${m.status}"} ${Math.round(m.totalDurationMs)}`,
      );
    }
    lines.push('# HELP ths_http_request_duration_max_ms Longest request (ms)');
    lines.push('# TYPE ths_http_request_duration_max_ms gauge');
    for (const m of snap.http.byMethodStatus) {
      lines.push(
        `ths_http_request_duration_max_ms{method="${m.method}",status="${m.status}"} ${Math.round(m.maxDurationMs)}`,
      );
    }
    lines.push('# HELP ths_auth_requests_total Total authentication operations by operation and result');
    lines.push('# TYPE ths_auth_requests_total counter');
    for (const a of snap.auth.byOperationResult) {
      lines.push(
        `ths_auth_requests_total{operation="${a.operation}",result="${a.result}"} ${a.count}`,
      );
    }
    lines.push('# HELP ths_auth_request_duration_ms_total Total auth operation duration (ms)');
    lines.push('# TYPE ths_auth_request_duration_ms_total counter');
    for (const a of snap.auth.byOperationResult) {
      lines.push(
        `ths_auth_request_duration_ms_total{operation="${a.operation}",result="${a.result}"} ${Math.round(a.totalDurationMs)}`,
      );
    }
    lines.push('# HELP ths_auth_request_duration_max_ms Longest auth operation (ms)');
    lines.push('# TYPE ths_auth_request_duration_max_ms gauge');
    for (const a of snap.auth.byOperationResult) {
      lines.push(
        `ths_auth_request_duration_max_ms{operation="${a.operation}",result="${a.result}"} ${Math.round(a.maxDurationMs)}`,
      );
    }
    lines.push('# HELP ths_process_uptime_seconds Process uptime in seconds');
    lines.push('# TYPE ths_process_uptime_seconds gauge');
    lines.push(`ths_process_uptime_seconds ${snap.uptimeSeconds}`);
    lines.push('# HELP ths_process_memory_bytes Process memory usage');
    lines.push('# TYPE ths_process_memory_bytes gauge');
    lines.push(`ths_process_memory_bytes{type="rss"} ${process.memoryUsage().rss}`);
    lines.push(
      `ths_process_memory_bytes{type="heap_used"} ${process.memoryUsage().heapUsed}`,
    );
    if (snap.websocket) {
      lines.push('# HELP ths_websocket_connections Active websocket connections');
      lines.push('# TYPE ths_websocket_connections gauge');
      lines.push(`ths_websocket_connections{type="total"} ${snap.websocket.totalConnections}`);
      lines.push(`ths_websocket_connections{type="unique_users"} ${snap.websocket.uniqueUsers}`);
      if (snap.websocket.security) {
        lines.push(
          `ths_websocket_throttled_packets_total ${snap.websocket.security.throttledPackets ?? 0}`,
        );
        lines.push(
          `ths_websocket_rejected_connections_total ${snap.websocket.security.rejectedConnections ?? 0}`,
        );
      }
    }
    return lines.join('\n') + '\n';
  }
}