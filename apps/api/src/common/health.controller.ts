import { Body, Controller, Get, Header, Logger, OnApplicationBootstrap, Optional, Param, Patch, Query, Req, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from './decorators/public.decorator';
import { Roles } from './decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from './services/cache.service';
import { AuditLogStore } from './services/audit-log-store.service';
import { ApiKeyStore } from './guards/api-key.guard';
import { EventsGateway } from '../modules/notifications/events.gateway';
import { createHash } from 'crypto';
import type { Request, Response } from 'express';
import { QueueDashboardModule } from '../modules/queue-dashboard/queue-dashboard.module';
import { MonitoringService } from '../modules/monitoring/monitoring.service';
import { statSync } from 'fs';
import * as os from 'os';

/**
 * In-memory 24-hour uptime tracker recording queue connection status
 * at 5-minute resolution. Uses a ring buffer of 288 buckets.
 *
 * Also tracks the duration of each disconnect streak so the sparkline
 * can colour-code bars by outage severity (short vs prolonged).
 */
interface UptimeEntry {
  timestamp: number;
  status: 'connected' | 'disconnected';
  /** Duration in ms of the disconnect streak this entry belongs to. */
  durationMs?: number;
}

class UptimeTracker {
  private static readonly BUCKET_MS = 5 * 60 * 1000; // 5 minutes
  private static readonly MAX_BUCKETS = Math.ceil((24 * 60 * 60 * 1000) / UptimeTracker.BUCKET_MS); // 288
  private static history: UptimeEntry[] = [];
  private static lastBucketKey = 0;

  /** Track the start of the current (ongoing) disconnect so we can record its duration on reconnect. */
  private static disconnectStartMs: number | null = null;
  /** Previous status for detecting connected↔disconnected transitions. */
  private static lastStatus: 'connected' | 'disconnected' | null = null;
  /** Timestamp (epoch ms) of the last actual data change — new bucket, status flip, or trim. */
  private static lastDataChangeMs: number = Date.now();

  /**
   * Record a status snapshot at the current time, bucketed to 5-min resolution.
   * Also detects transitions to track disconnect duration.
   */
  static record(status: 'connected' | 'disconnected'): void {
    const now = Date.now();
    const bucketKey = Math.floor(now / UptimeTracker.BUCKET_MS);

    // ── Disconnect duration tracking ──
    if (UptimeTracker.lastStatus === null && status === 'disconnected') {
      // First health check and queue is already disconnected — start tracking
      UptimeTracker.disconnectStartMs = now;
    } else if (UptimeTracker.lastStatus === 'connected' && status === 'disconnected') {
      // New disconnect streak started
      UptimeTracker.disconnectStartMs = now;
    } else if (UptimeTracker.lastStatus === 'disconnected' && status === 'connected') {
      // Disconnect ended — backfill duration on all pending disconnect entries
      if (UptimeTracker.disconnectStartMs !== null) {
        const durationMs = now - UptimeTracker.disconnectStartMs;
        UptimeTracker.lastCompletedDurationMs = durationMs;
        UptimeTracker.lastDataChangeMs = now;
        for (let i = UptimeTracker.history.length - 1; i >= 0; i--) {
          if (UptimeTracker.history[i].status === 'disconnected' && !UptimeTracker.history[i].durationMs) {
            UptimeTracker.history[i].durationMs = durationMs;
          } else if (UptimeTracker.history[i].status === 'connected') {
            break;
          }
        }
        UptimeTracker.disconnectStartMs = null;
      }
    }

    UptimeTracker.lastStatus = status;

    // ── Bucketing logic ──
    if (bucketKey === UptimeTracker.lastBucketKey) {
      // Same bucket — update the latest entry's status if it changed
      if (UptimeTracker.history.length > 0) {
        const prevStatus = UptimeTracker.history[UptimeTracker.history.length - 1].status;
        UptimeTracker.history[UptimeTracker.history.length - 1].status = status;
        if (prevStatus !== status) {
          UptimeTracker.lastDataChangeMs = now;
        }
      }
      return;
    }

    UptimeTracker.lastBucketKey = bucketKey;

    // Fill any gaps between the last recorded bucket and now (backfill)
    if (UptimeTracker.history.length > 0) {
      const lastTs = UptimeTracker.history[UptimeTracker.history.length - 1].timestamp;
      const gap = bucketKey - Math.floor(lastTs / UptimeTracker.BUCKET_MS);
      if (gap > 1) {
        // Gap detected — fill with disconnected
        for (let i = 1; i < gap; i++) {
          const fillTs = (Math.floor(lastTs / UptimeTracker.BUCKET_MS) + i) * UptimeTracker.BUCKET_MS;
          UptimeTracker.history.push({ timestamp: fillTs, status: 'disconnected' });
        }
      }
    }

    UptimeTracker.lastDataChangeMs = now;
    UptimeTracker.history.push({ timestamp: bucketKey * UptimeTracker.BUCKET_MS, status });

    // Trim beyond 24 hours
    const cutoff = now - 24 * 60 * 60 * 1000;
    while (UptimeTracker.history.length > 0 && UptimeTracker.history[0].timestamp < cutoff) {
      UptimeTracker.history.shift();
      UptimeTracker.lastDataChangeMs = now;
    }

    // Hard cap at MAX_BUCKETS
    if (UptimeTracker.history.length > UptimeTracker.MAX_BUCKETS) {
      UptimeTracker.history = UptimeTracker.history.slice(-UptimeTracker.MAX_BUCKETS);
      UptimeTracker.lastDataChangeMs = now;
    }
  }

  /** Get the full history for the last 24 hours. */
  static getHistory(): { timestamp: string; status: 'connected' | 'disconnected'; durationMs?: number }[] {
    return UptimeTracker.history.map((h) => ({
      timestamp: new Date(h.timestamp).toISOString(),
      status: h.status,
      ...(h.durationMs !== undefined ? { durationMs: h.durationMs } : {}),
    }));
  }

  /** Compute uptime percentage for the last 24 hours. */
  static getUptimePercent(): number {
    const entries = UptimeTracker.history;
    if (entries.length === 0) return 100;
    const connected = entries.filter((e) => e.status === 'connected').length;
    return Math.round((connected / entries.length) * 100);
  }

  /** Build the sparkline response value (no caching — the controller handles that via CacheService). */
  static getHistoryEntry(): {
    success: true;
    data: {
      history: { timestamp: string; status: 'connected' | 'disconnected'; durationMs?: number }[];
      uptimePercent: number;
      resolutionSeconds: number;
    };
  } {
    return {
      success: true as const,
      data: {
        history: UptimeTracker.getHistory(),
        uptimePercent: UptimeTracker.getUptimePercent(),
        resolutionSeconds: 300,
      },
    };
  }

  /**
   * Returns the epoch-ms timestamp of the last actual data change
   * (new 5-minute bucket, status flip, or entry trimmed). Used to
   * derive the Last-Modified header for conditional request handling.
   * Unlike memo cachedAt, this timestamp stays stable for minutes or
   * hours during stable queue conditions, making If-Modified-Since
   * effective for CDN and proxy caching.
   */
  static getLastDataChangeMs(): number {
    return UptimeTracker.lastDataChangeMs;
  }

  /**
   * Seed the 24-hour sparkline history from persisted queue_uptime_events
   * on server restart. Each completed event (endTime !== null) represents
   * a disconnect period. For every 5-minute bucket in the last 24 hours,
   * marks it as disconnected if any event overlaps that bucket, or
   * connected otherwise.
   *
   * This eliminates the 24-hour sparkline blackout window after a server
   * restart — the history is immediately available instead of requiring
   * 288 health-check cycles to accumulate.
   */
  static seedFromEvents(
    events: { startTime: Date; endTime: Date | null; durationMs: number | null }[],
  ): void {
    const now = Date.now();
    const bucketMs = UptimeTracker.BUCKET_MS;

    // Earliest bucket boundary in the lookback window
    const windowStart = Math.floor((now - 24 * 60 * 60 * 1000) / bucketMs) * bucketMs;
    const currentBucket = Math.floor(now / bucketMs) * bucketMs;

    // Sort events by start time for efficient overlap checks
    // Filter out events without endTime (they weren't closed yet)
    const completed = events
      .filter((e): e is { startTime: Date; endTime: Date; durationMs: number | null } => e.endTime !== null)
      .map((e) => ({
        startMs: e.startTime.getTime(),
        endMs: e.endTime.getTime(),
        durationMs: e.durationMs,
      }))
      .sort((a, b) => a.startMs - b.startMs);

    const newHistory: UptimeEntry[] = [];

    // Iterate every 5-minute bucket from windowStart to currentBucket
    for (let bucketStart = windowStart; bucketStart <= currentBucket; bucketStart += bucketMs) {
      const bucketEnd = bucketStart + bucketMs;

      // Find an event that overlaps this bucket
      const overlapping = completed.find(
        (e) => e.startMs < bucketEnd && e.endMs > bucketStart,
      );

      if (overlapping) {
        newHistory.push({
          timestamp: bucketStart,
          status: 'disconnected',
          durationMs: overlapping.durationMs ?? undefined,
        });
      } else {
        newHistory.push({
          timestamp: bucketStart,
          status: 'connected',
        });
      }
    }

    if (newHistory.length === 0) return;

    UptimeTracker.history = newHistory;
    UptimeTracker.lastBucketKey = Math.floor(currentBucket / bucketMs);

    // Set lastStatus from the most recent entry
    const lastEntry = newHistory[newHistory.length - 1];
    UptimeTracker.lastStatus = lastEntry.status;

    // Set lastDataChangeMs to the most recent event end time, or now
    const mostRecentEvent = completed[completed.length - 1];
    UptimeTracker.lastDataChangeMs = mostRecentEvent
      ? Math.max(mostRecentEvent.endMs, windowStart)
      : now;
  }

  /** Get the duration of the most recent completed disconnect streak, or null if none. */
  static getLastDisconnectDuration(): number | null {
    for (let i = UptimeTracker.history.length - 1; i >= 0; i--) {
      if (UptimeTracker.history[i].status === 'disconnected' && UptimeTracker.history[i].durationMs !== undefined) {
        return UptimeTracker.history[i].durationMs!;
      }
      if (UptimeTracker.history[i].status === 'connected') break;
    }
    return null;
  }

  /**
   * Get the start timestamp (epoch ms) of the current ongoing disconnect, or null.
   * Used by the HealthController to persist events to the database.
   */
  static getDisconnectStartMs(): number | null {
    return UptimeTracker.disconnectStartMs;
  }

  /**
   * Captures the last-computed disconnect duration so the HealthController
   * can persist it after record() resets disconnectStartMs to null.
   * Set inside record() before the reset; read after record() returns.
   */
  private static lastCompletedDurationMs: number | null = null;

  static getLastCompletedDurationMs(): number | null {
    return UptimeTracker.lastCompletedDurationMs;
  }

  static clearLastCompletedDurationMs(): void {
    UptimeTracker.lastCompletedDurationMs = null;
  }
}

interface RecentError {
  message: string;
  timestamp: string;
}

interface QueueHealthDetail {
  type: 'bullmq' | 'in-process' | 'inactive';
  status: 'connected' | 'disconnected' | 'not_initialized';
  queueName: string;
  counts?: { waiting: number; active: number; completed: number; failed: number; delayed: number };
  isPaused?: boolean;
  error?: string;
  /** Connection metadata — host/port from env, or null for in-process */
  connection?: { host: string; port: number } | null;
  /** Measured round-trip latency in ms, or null if unavailable */
  latencyMs?: number | null;
  /** Current worker status for BullMQ, always 'running' for in-process */
  workerStatus?: 'running' | 'idle' | 'stopped' | 'unknown';
  /** Last 5 recent errors from the DocumentJob table */
  recentErrors?: RecentError[];
}

@ApiTags('Health')
@Controller('health')
export class HealthController implements OnApplicationBootstrap {
  /** Tracks the last broadcast status to only emit on transitions. */
  private static lastBroadcastStatus: string | null = null;

  /** Tracks the database ID of the current ongoing disconnect event (null when connected). */
  private static ongoingUptimeEventId: string | null = null;
  /** Ensures startup cleanup runs only once. */
  private static startupCleaned = false;

  // ── Events endpoint cache key prefix ────────────────
  // Used with CacheService.invalidatePrefix() when event data changes.
  private static readonly EVENT_CACHE_PREFIX = 'uptime:events';
  private readonly logger = new Logger(HealthController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly auditLogStore: AuditLogStore,
    private readonly apiKeyStore: ApiKeyStore,
    @Optional() private readonly eventsGateway?: EventsGateway,
    @Optional() private readonly monitoringService?: MonitoringService,
  ) {}

  @Get()
  @Public()
  @Header('Cache-Control', 'max-age=2')
  @ApiOperation({ summary: 'Cek kesehatan sistem' })
  async check() {
    let dbStatus = 'disconnected';
    const dbPool = { active: 0, idle: 0, total: 0 };

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbStatus = 'connected';

      // Query PostgreSQL connection pool stats via pg_stat_activity
      try {
        const poolStats = await this.prisma.$queryRaw<
          Array<{ state: string | null; count: bigint }>
        >`SELECT state, COUNT(*)::int as count FROM pg_stat_activity WHERE datname = current_database() GROUP BY state`;

        for (const row of poolStats) {
          if (row.state === 'active') dbPool.active = Number(row.count);
          if (row.state === 'idle') dbPool.idle = Number(row.count);
          dbPool.total += Number(row.count);
        }
      } catch {
        // pg_stat_activity may not be available in all environments
      }
    } catch {
      dbStatus = 'disconnected';
    }

    // Check Redis connection
    let redisStatus = 'disconnected';
    let redisLatencyMs: number | null = null;
    if (this.cache.isRedisConnected()) {
      const redisStart = Date.now();
      try {
        // Use the internal redis client to ping
        const redisClient = (this.cache as any).redisClient;
        if (redisClient) {
          await redisClient.ping();
          redisStatus = 'connected';
          redisLatencyMs = Date.now() - redisStart;
        }
      } catch {
        redisStatus = 'disconnected';
      }
    }

    // Check disk space on uploads directory (cached 60s, non-blocking)
    let diskSpace: { free: string; total: string; used: string; usagePercent: number } | null = null;
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    const diskCacheKey = `health:disk:${uploadDir}`;
    diskSpace = this.cache.get<{ free: string; total: string; used: string; usagePercent: number }>(diskCacheKey) ?? null;
    if (!diskSpace) {
      try {
        statSync(uploadDir);
        const { exec } = require('child_process');
        const dfOutput: string = await new Promise((resolve) => {
          exec(`df -h "${uploadDir}"`, { encoding: 'utf-8', timeout: 5000 }, (err: Error | null, stdout: string) =>
            resolve(err ? '' : stdout),
          );
        });
        const lines = dfOutput.trim().split('\n');
        if (lines.length > 1) {
          const parts = lines[1].split(/\s+/);
          if (parts.length >= 5) {
            const total = parts[1];
            const used = parts[2];
            const free = parts[3];
            const usagePercent = parseInt(parts[4].replace('%', ''), 10);
            diskSpace = { free, total, used, usagePercent };
            this.cache.set(diskCacheKey, diskSpace, 60_000);
          }
        }
      } catch {
        // Disk space check failed, ignore
      }
    }

    const cacheStats = this.cache.getStats();
    const auditStats = this.auditLogStore.getStats();
    const apiKeys = this.apiKeyStore.getAll();
    const backupStatus = this.getBackupStatus();

    return {
      success: true,
      data: {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: {
          status: dbStatus,
          pool: dbPool,
        },
        redis: {
          status: redisStatus,
          latencyMs: redisLatencyMs,
        },
        disk: diskSpace,
        memory: {
          heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
          heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB',
        },
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        cache: {
          entries: cacheStats.size,
          maxEntries: 1000,
        },
        auditLog: {
          totalEntries: auditStats.total,
          recentViolations: auditStats.recentViolations,
          latency: this.auditLogStore.getLatencyPercentiles(),
        },
        apiKeys: {
          active: apiKeys.length,
        },
        backup: backupStatus,
        queue: await this.getQueueHealth() as any,
      },
    };
  }

  @Get('detailed')
  @Roles('superadmin')
  @ApiOperation({ summary: 'Cek kesehatan sistem detail (Admin only)' })
  async getDetailedHealth() {
    const basicHealth = await this.check();
    const memoryUsage = process.memoryUsage();
    
    // Additional system info
    const cpus = os.cpus();
    const cpuUsage = cpus.map(cpu => ({
      model: cpu.model,
      speed: cpu.speed,
      times: cpu.times,
    }));
    
    // Network interfaces
    const networkInterfaces = os.networkInterfaces();
    
    return {
      ...basicHealth,
      data: {
        ...basicHealth.data,
        system: {
          loadAverage: os.loadavg(),
          uptime: process.uptime(),
          platform: process.platform,
          arch: process.arch,
          cpuCount: cpus.length,
          cpus: cpuUsage,
          networkInterfaces,
        },
        memory: {
          ...basicHealth.data.memory,
          rss: Math.round(memoryUsage.rss / 1024 / 1024) + ' MB',
          external: Math.round(memoryUsage.external / 1024 / 1024) + ' MB',
          arrayBuffers: Math.round(memoryUsage.arrayBuffers / 1024 / 1024) + ' MB',
        },
        process: {
          pid: process.pid,
          version: process.version,
          argv: process.argv,
          execPath: process.execPath,
          cwd: process.cwd(),
        },
      }
    };
  }

  /**
   * GET /health/events — Server-Sent Events stream that pushes real-time
   * health snapshots every 5 seconds. The client uses EventSource to
   * receive updates instantly without polling.
   *
   * Event types:
   *   - `health`: Full health snapshot (every 5s)
   *   - `queue-status`: Queue status transitions only (connected↔disconnected)
   *   - `keepalive`: Sent every 30s to prevent proxy timeouts
   *
   * On connection, immediately sends the current health snapshot.
   * On disconnect (client closes tab), the interval is cleaned up automatically.
   */
  @Get('events')
  @Public()
  @ApiOperation({ summary: 'SSE stream — real-time health updates every 5 detik' })
  async streamHealth(@Res() res: Response): Promise<void> {
    // ── SSE Headers ──
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // nginx: disable buffering
    res.flushHeaders();

    // Keep track of health data so we can detect queue status transitions
    let lastQueueStatus: string | undefined;

    const sendEvent = (event: string, data: unknown) => {
      try {
        res.write(`event: ${event}\n`);
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      } catch {
        // Client likely disconnected — interval cleanup handles this
      }
    };

    // Helper: run the full health check and send the result
    const sendHealthSnapshot = async () => {
      try {
        const snapshot = await this.check();
        const healthData = (snapshot as { data: Record<string, unknown> })?.data || snapshot;
        sendEvent('health', healthData);

        // Detect queue status transition
        const queueStatus = (healthData as Record<string, unknown>)?.queue as QueueHealthDetail | undefined;
        const currentStatus = queueStatus?.status;
        if (currentStatus && currentStatus !== lastQueueStatus) {
          sendEvent('queue-status', {
            status: currentStatus,
            previous: lastQueueStatus,
            workerStatus: queueStatus.workerStatus,
            latencyMs: queueStatus.latencyMs,
            timestamp: new Date().toISOString(),
          });
          lastQueueStatus = currentStatus;
        }

        // Evaluate monitoring alerts against current health
        this.monitoringService?.evaluateAlerts(healthData as never).catch((err) => {
          this.logger.warn(`Alert evaluation error: ${(err as Error).message}`);
        });
      } catch (err) {
        sendEvent('error', {
          message: (err as Error).message || 'Health check failed',
          timestamp: new Date().toISOString(),
        });
      }
    };

    // Send initial snapshot immediately
    await sendHealthSnapshot();

    // Then every 5 seconds
    const intervalId = setInterval(sendHealthSnapshot, 5_000);

    // Keepalive every 30 seconds to prevent proxy timeouts
    const keepaliveId = setInterval(() => {
      sendEvent('keepalive', { timestamp: new Date().toISOString() });
    }, 30_000);

    // Clean up on client disconnect
    res.on('close', () => {
      clearInterval(intervalId);
      clearInterval(keepaliveId);
    });
  }

  /**
   * Report health of the document-generation queue with detailed connection info.
   *
   * When BullMQ is active (USE_BULLMQ=true), attempts a round-trip to Redis
   * via getJobCounts() to verify the Queue and Worker are operational. Also
   * measures connection latency and fetches recent error history.
   *
   * When the in-process adapter is active, reports a simpler status.
   */

  /**
   * Read backup status from the mounted backup directory.
   * The backup script writes .info.json files alongside each .sql.gz file.
   * We read the most recent one to report backup freshness.
   */
  private getBackupStatus(): {
    available: boolean;
    lastBackup: string | null;
    lastBackupSize: string | null;
    lastBackupAge: string | null;
    backupCount: number;
    status: 'ok' | 'stale' | 'missing';
  } {
    try {
      const fs = require('fs');
      const path = require('path');

      const backupDir = '/app/backups/production';
      if (!fs.existsSync(backupDir)) {
        return { available: false, lastBackup: null, lastBackupSize: null, lastBackupAge: null, backupCount: 0, status: 'missing' };
      }

      // Read all .info.json files
      const files = fs.readdirSync(backupDir)
        .filter((f: string) => f.endsWith('.info.json'))
        .sort()
        .reverse(); // newest first

      if (files.length === 0) {
        return { available: true, lastBackup: null, lastBackupSize: null, lastBackupAge: null, backupCount: 0, status: 'missing' };
      }

      // Read the most recent backup info
      const latestFile = path.join(backupDir, files[0]);
      const info = JSON.parse(fs.readFileSync(latestFile, 'utf-8'));

      const lastBackupTime = new Date(info.timestamp);
      const ageMs = Date.now() - lastBackupTime.getTime();
      const ageHours = Math.floor(ageMs / (1000 * 60 * 60));
      const ageDays = Math.floor(ageHours / 24);

      let ageStr: string;
      if (ageDays > 0) ageStr = `${ageDays}d ${ageHours % 24}h ago`;
      else if (ageHours > 0) ageStr = `${ageHours}h ago`;
      else ageStr = `${Math.floor(ageMs / (1000 * 60))}m ago`;

      // Determine freshness status: ok if < 48h, stale if > 48h
      const status: 'ok' | 'stale' | 'missing' = ageHours < 48 ? 'ok' : 'stale';

      // Format size
      const sizeBytes = info.size_bytes || 0;
      let sizeStr: string;
      if (sizeBytes > 1024 * 1024 * 1024) sizeStr = `${(sizeBytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
      else if (sizeBytes > 1024 * 1024) sizeStr = `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
      else if (sizeBytes > 1024) sizeStr = `${(sizeBytes / 1024).toFixed(1)} KB`;
      else sizeStr = `${sizeBytes} B`;

      return {
        available: true,
        lastBackup: info.timestamp,
        lastBackupSize: sizeStr,
        lastBackupAge: ageStr,
        backupCount: files.length,
        status,
      };
    } catch {
      return { available: false, lastBackup: null, lastBackupSize: null, lastBackupAge: null, backupCount: 0, status: 'missing' };
    }
  }

  private async getQueueHealth(): Promise<QueueHealthDetail> {
    const queue = QueueDashboardModule.getDocumentQueue();

    // Shared: fetch recent errors from DocumentJob table
    const recentErrors = await this.fetchRecentQueueErrors();

    let result: QueueHealthDetail;

    if (!queue) {
      if (process.env.USE_BULLMQ === 'true') {
        result = {
          type: 'bullmq',
          status: 'disconnected',
          queueName: 'document-generation',
          connection: {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379', 10),
          },
          workerStatus: 'stopped',
          latencyMs: null,
          error: 'BullMQ queue not initialized. Check that redis is reachable and bullmq is installed.',
          recentErrors,
        };
      } else {
        result = {
          type: 'in-process',
          status: 'connected',
          queueName: 'document-generation',
          connection: null,
          workerStatus: 'running',
          latencyMs: null,
          recentErrors,
        };
      }
    } else {
      // BullMQ active — measure latency and gather detailed stats
      const latencyStart = Date.now();
      try {
        const [counts, isPaused] = await Promise.all([
          queue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed'),
          queue.isPaused(),
        ]);
        const latencyMs = Date.now() - latencyStart;

        const isIdle = (counts.waiting ?? 0) === 0 && (counts.active ?? 0) === 0;

        result = {
          type: 'bullmq',
          status: 'connected',
          queueName: 'document-generation',
          connection: {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379', 10),
          },
          latencyMs,
          workerStatus: isIdle ? 'idle' : 'running',
          counts: {
            waiting: counts.waiting ?? 0,
            active: counts.active ?? 0,
            completed: counts.completed ?? 0,
            failed: counts.failed ?? 0,
            delayed: counts.delayed ?? 0,
          },
          isPaused,
          recentErrors,
        };
      } catch (error) {
        const latencyMs = Date.now() - latencyStart;
        result = {
          type: 'bullmq',
          status: 'disconnected',
          queueName: 'document-generation',
          connection: {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379', 10),
          },
          latencyMs,
          workerStatus: 'stopped',
          error: (error as Error).message,
          recentErrors,
        };
      }
    }

    const currentStatus = result.status === 'connected' ? 'connected' : 'disconnected';

    // Record uptime snapshot for the sparkline (handles duration tracking in-memory)
    UptimeTracker.record(currentStatus);

    // ── Persist to database ──
    // After UptimeTracker.record(), check if a disconnect just ended
    const completedDuration = UptimeTracker.getLastCompletedDurationMs();
    if (completedDuration !== null) {
      // Disconnected→connected transition — update the database event
      const disconnectStart = UptimeTracker.getDisconnectStartMs(); // Will be null since record() already reset it
      // We use the ongoing event ID and the start time captured before record()
      if (HealthController.ongoingUptimeEventId) {
        try {
          await this.prisma.queueUptimeEvent.update({
            where: { id: HealthController.ongoingUptimeEventId },
            data: {
              endTime: new Date(),
              durationMs: completedDuration,
            },
          });
        } catch (err) {
          this.logger.warn(`Failed to persist uptime event end: ${(err as Error).message}`);
        }
        HealthController.ongoingUptimeEventId = null;
        this.cache.invalidatePrefix(HealthController.EVENT_CACHE_PREFIX);
      }
      UptimeTracker.clearLastCompletedDurationMs();
    }

    // Persist disconnect start — create a new database event when a disconnect begins
    const disconnectStartMs = UptimeTracker.getDisconnectStartMs();
    if (currentStatus === 'disconnected' && disconnectStartMs !== null && !HealthController.ongoingUptimeEventId) {
      try {
        const event = await this.prisma.queueUptimeEvent.create({
          data: {
            startTime: new Date(disconnectStartMs),
          },
        });
        HealthController.ongoingUptimeEventId = event.id;
        this.cache.invalidatePrefix(HealthController.EVENT_CACHE_PREFIX);
      } catch (err) {
        this.logger.warn(`Failed to persist uptime event start: ${(err as Error).message}`);
      }
    }

    // Broadcast only on status transitions (connected↔disconnected) to avoid
    // flooding Socket.IO with redundant updates on every 5-second poll.
    if (result.status !== HealthController.lastBroadcastStatus) {
      HealthController.lastBroadcastStatus = result.status;
      this.eventsGateway?.broadcast('queue:health-changed', result);
    }

    return result;
  }

  /**
   * GET /admin/queue-uptime — Returns 24-hour uptime history as an array of
   * 5-minute-bucketed status snapshots, plus the overall uptime percentage.
   *
   * For persistent disconnect events, use the dedicated
   * GET /admin/queue-uptime/events endpoint instead.
   */
  @Get('admin/queue-uptime')
  @Roles('superadmin', 'admin_distrik')
  @Header('Cache-Control', 'max-age=5')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get 24-hour queue sparkline uptime history (use /events for outage list)' })
  getUptimeHistory(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const cacheKey = 'uptime:sparkline:default';

    // Check CacheService first (TTL = 5s, shared across pods)
    const cached = this.cache.get<{ value: typeof responseValue; etag: string }>(cacheKey);
    if (cached) {
      const { value: response, etag } = cached;

      // ── Last-Modified ──
      const lastDataChangeMs = UptimeTracker.getLastDataChangeMs();
      res.setHeader('Last-Modified', new Date(lastDataChangeMs).toUTCString());
      res.setHeader('ETag', `"${etag}"`);

      // If-Modified-Since (cheaper)
      const clientModifiedSince = req.headers['if-modified-since'];
      if (clientModifiedSince) {
        const parsed = new Date(clientModifiedSince).getTime();
        if (!isNaN(parsed) && lastDataChangeMs > 0 && parsed >= lastDataChangeMs) {
          res.status(304).end();
          return;
        }
      }

      // If-None-Match
      const clientEtag = req.headers['if-none-match'];
      if (clientEtag) {
        const clean = clientEtag.replace(/^W\//, '').trim();
        if (clean === `"${etag}"`) {
          res.status(304).end();
          return;
        }
      }

      return response;
    }

    // Cache miss — compute fresh
    const responseValue = UptimeTracker.getHistoryEntry();
    const etag = createHash('md5').update(JSON.stringify(responseValue)).digest('hex');

    // Store in shared CacheService (survives restarts when backed by Redis)
    this.cache.set(cacheKey, { value: responseValue, etag }, 5000);

    // ── Headers ──
    const lastDataChangeMs = UptimeTracker.getLastDataChangeMs();
    res.setHeader('Last-Modified', new Date(lastDataChangeMs).toUTCString());
    res.setHeader('ETag', `"${etag}"`);

    const clientModifiedSince = req.headers['if-modified-since'];
    if (clientModifiedSince) {
      const parsed = new Date(clientModifiedSince).getTime();
      if (!isNaN(parsed) && lastDataChangeMs > 0 && parsed >= lastDataChangeMs) {
        res.status(304).end();
        return;
      }
    }

    const clientEtag = req.headers['if-none-match'];
    if (clientEtag) {
      const clean = clientEtag.replace(/^W\//, '').trim();
      if (clean === `"${etag}"`) {
        res.status(304).end();
        return;
      }
    }

    return responseValue;
  }

  /**
   * GET /admin/queue-uptime/events — Returns completed disconnect events
   * with optional server-side severity filtering.
   *
   * Query params (optional):
   *   - days:  number of days to look back (default 30, max 90)
   *   - limit: max events to return (default 20, max 100)
   *   - severity: filter by severity label — 'short' | 'medium' | 'long' | 'critical'
   *       short:    durationMs < 60_000  (< 1 min)
   *       medium:   60_000 <= durationMs < 300_000  (1-5 min)
   *       long:     300_000 <= durationMs < 1_800_000  (5-30 min)
   *       critical: durationMs >= 1_800_000  (>= 30 min)
   *   - min_duration_ms: minimum duration in ms (overrides severity when both provided)
   */
  @Get('admin/queue-uptime/events')
  @Roles('superadmin', 'admin_distrik')
  @Header('Cache-Control', 'private, max-age=30')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get completed queue disconnect events with timestamps and duration' })
  async getUptimeEvents(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Query('days') days: string = '30',
    @Query('limit') limit: string = '20',
    @Query('severity') severity?: string,
    @Query('min_duration_ms') minDurationMs?: string,
  ): Promise<void> {
    // Build cache key from the query params so different filters
    // produce separate cache entries. Prefix with EVENT_CACHE_PREFIX
    // so CacheService.invalidatePrefix() can target all event keys.
    const filterKey = JSON.stringify({ days, limit, severity, minDurationMs });
    const cacheKey = `${HealthController.EVENT_CACHE_PREFIX}:${filterKey}`;

    // Check CacheService first (TTL = 30s, shared across pods)
    const cached = this.cache.get<{ value: typeof responseValue; etag: string }>(cacheKey);
    if (cached) {
      const { value: response, etag } = cached;
      const clientEtag = req.headers['if-none-match'];
      if (clientEtag) {
        const clean = clientEtag.replace(/^W\//, '').trim();
        if (clean === `"${etag}"`) {
          res.setHeader('ETag', `"${etag}"`);
          res.status(304).end();
          return;
        }
      }
      res.setHeader('ETag', `"${etag}"`);
      res.json(response);
      return;
    }

    // ── Cache miss — compute fresh response ──
    const daysNum = Math.min(Math.max(parseInt(days, 10) || 30, 1), 90);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

    // Build duration filter — prefer explicit min_duration_ms over severity label
    let durationFilter: { gte?: number; lt?: number } | null = null;
    const explicitMin = parseInt(minDurationMs ?? '', 10);
    if (!isNaN(explicitMin) && explicitMin >= 0) {
      durationFilter = { gte: explicitMin };
    } else if (severity) {
      switch (severity) {
        case 'short':
          durationFilter = { gte: 0, lt: 60_000 };
          break;
        case 'medium':
          durationFilter = { gte: 60_000, lt: 300_000 };
          break;
        case 'long':
          durationFilter = { gte: 300_000, lt: 1_800_000 };
          break;
        case 'critical':
          durationFilter = { gte: 1_800_000 };
          break;
      }
    }

    let events: {
      id: string;
      startTime: string;
      endTime?: string;
      durationMs?: number;
    }[] = [];

    try {
      const where: Record<string, unknown> = {
        startTime: { gte: new Date(Date.now() - daysNum * 24 * 60 * 60 * 1000) },
        endTime: { not: null },
      };

      if (durationFilter) {
        where.durationMs = durationFilter;
      }

      const rows = await this.prisma.queueUptimeEvent.findMany({
        where,
        orderBy: { startTime: 'desc' },
        take: limitNum,
      });

      events = rows.map((r: { id: string; startTime: Date; endTime: Date | null; durationMs: number | null }) => ({
        id: r.id,
        startTime: r.startTime.toISOString(),
        ...(r.endTime ? { endTime: r.endTime.toISOString() } : {}),
        ...(r.durationMs !== null ? { durationMs: r.durationMs } : {}),
      }));
    } catch (err) {
      this.logger.warn(`Failed to fetch uptime events: ${(err as Error).message}`);
    }

    const responseValue = {
      success: true as const,
      data: { events, total: events.length },
    };

    const etag = createHash('md5').update(JSON.stringify(responseValue)).digest('hex');

    // Store in shared CacheService (survives restarts when backed by Redis)
    this.cache.set(cacheKey, { value: responseValue, etag }, 30000);

    // Handle conditional request
    res.setHeader('ETag', `"${etag}"`);

    const clientEtag = req.headers['if-none-match'];
    if (clientEtag) {
      const clean = clientEtag.replace(/^W\//, '').trim();
      if (clean === `"${etag}"`) {
        res.status(304).end();
        return;
      }
    }

    res.json(responseValue);
  }

  /**
   * PATCH /admin/queue-uptime/events/:id — Update incident notes (root cause) and component.
   * Used by the monitoring incidents page for inline root cause editing.
   */
  @Patch('admin/queue-uptime/events/:id')
  @Roles('superadmin', 'admin_distrik')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update incident notes / root cause for a queue uptime event' })
  async updateUptimeEvent(
    @Param('id') id: string,
    @Body() body: { notes?: string; component?: string },
  ): Promise<{ success: boolean; data?: unknown; error?: string }> {
    // Basic input validation
    if (body.notes !== undefined && body.notes.length > 2000) {
      return { success: false, error: 'Notes must be 2000 characters or fewer' };
    }
    const allowedComponents = ['queue', 'database', 'api', 'other'];
    if (body.component !== undefined && !allowedComponents.includes(body.component)) {
      return { success: false, error: `Component must be one of: ${allowedComponents.join(', ')}` };
    }

    const data: Record<string, unknown> = {};
    if (body.notes !== undefined) data.notes = body.notes;
    if (body.component !== undefined) data.component = body.component;

    try {
      const updated = await this.prisma.queueUptimeEvent.update({
        where: { id },
        data,
      });

      this.cache.invalidatePrefix(HealthController.EVENT_CACHE_PREFIX);

      return {
        success: true,
        data: {
          id: updated.id,
          notes: updated.notes,
          component: updated.component,
        },
      };
    } catch (err: unknown) {
      this.logger.warn(`Failed to update uptime event ${id}: ${(err as Error).message}`);
      return { success: false, error: 'Incident not found or could not be updated' };
    }
  }

  /**
   * On application bootstrap, close any stale ongoing uptime events left
   * from a previous server lifecycle (e.g. crash, restart). These events
   * have a start_time but no end_time, meaning the server went down while
   * the queue was disconnected.
   */
  async onApplicationBootstrap(): Promise<void> {
    if (HealthController.startupCleaned) return;
    HealthController.startupCleaned = true;

    try {
      // ── Close stale (never-ended) events from a previous lifecycle ──
      const staleEvents = await this.prisma.queueUptimeEvent.findMany({
        where: { endTime: null },
      });
      if (staleEvents.length > 0) {
        this.logger.warn(`Closing ${staleEvents.length} stale uptime event(s) from previous lifecycle`);
        await this.prisma.queueUptimeEvent.updateMany({
          where: { endTime: null },
          data: { endTime: new Date() },
        });
      }

      // ── Seed the sparkline from completed events in the last 24 hours ──
      // Fetch any completed event that overlaps the 24-hour window — including
      // events that started BEFORE the window but ended within it, otherwise
      // long-running disconnects that straddle the boundary would be missed.
      const windowStart = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentEvents = await this.prisma.queueUptimeEvent.findMany({
        where: {
          endTime: { not: null },
          OR: [
            { startTime: { gte: windowStart } },
            { endTime: { gte: windowStart } },
          ],
        },
        select: { startTime: true, endTime: true, durationMs: true },
      });

      if (recentEvents.length > 0) {
        this.logger.log(
          `Seeding sparkline from ${recentEvents.length} completed event(s) in the last 24 hours`,
        );
        UptimeTracker.seedFromEvents(recentEvents);
      }
    } catch (err) {
      this.logger.warn(`Failed to seed sparkline from persisted events: ${(err as Error).message}`);
    }
  }

  /**
   * Fetch the last 5 failed DocumentJob records to show recent error history.
   */
  private async fetchRecentQueueErrors(): Promise<RecentError[]> {
    try {
      const failedJobs = await this.prisma.documentJob.findMany({
        where: { status: 'failed', error: { not: null } },
        orderBy: { completedAt: 'desc' },
        take: 5,
        select: { error: true, completedAt: true },
      });

      return failedJobs.map((j) => ({
        message: j.error || 'Unknown error',
        timestamp: j.completedAt?.toISOString() || new Date().toISOString(),
      }));
    } catch {
      return [];
    }
  }
}
