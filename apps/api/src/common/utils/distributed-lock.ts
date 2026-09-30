/**
 * Distributed lock untuk cron (@Cron) berbasis SETNX di Redis/Valkey.
 *
 * Elevasi dari overlap guard in-memory (`overlap-guard.ts`): flag in-memory hanya
 * mencegah penumpukan *dalam satu proses*; lock ini mencegah dua INSTANCE API
 * menjalankan cron yang sama. Cocok untuk skenario multi-instance — lock disimpan
 * di Valkey bersama yang sudah dipakai BullMQ.
 *
 * Protokol (pola Redlock-lite, tanpa dependensi tambahan):
 *  1. ACQUIRE  — `SET key token PX <ttl> NX`: atomik, hanya satu instance menang.
 *  2. HEARTBEAT — `PEXPIRE` tiap 1/4 TTL selama fn masih berjalan, agar cron sah
 *     yang lama (mis. tagihan ribuan anggota) tidak kehilangan lock di tengah jalan.
 *  3. RELEASE  — skrip Lua compare-and-delete (token cocok → DEL): atomik, jadi
 *     instance lain tidak mungkin menghapus lock yang bukan miliknya.
 *
 * Kegagalan Redis (klien tidak diset / PING gagal / SET error) → FAIL-OPEN ke
 * guard in-memory per-proses: cron tetap jalan (lebih baik jalan minimal 1×
 * daripada tidak sama sekali). Kalau API mati mendadak, lock sendiri kedaluwarsa
 * via TTL — tidak ada deadlock permanen.
 */

import { randomBytes } from 'crypto';
import Redis from 'ioredis';
import { createOverlapGuard } from './overlap-guard';
import { resolveRedisConnection } from '../queue/redis-connection';

interface LoggerLike {
  warn: (message: string) => unknown;
  error?: (message: string) => unknown;
}

/** Kontrak minimal klien ioredis yang dipakai lock (memudahkan mock test). */
export interface LockRedisClient {
  /** SET key value PX ttl NX — mengembalikan 'OK' bila kunci berhasil dipegang. */
  set(
    key: string,
    value: string,
    mode: 'PX',
    ttlMs: number,
    condition: 'NX',
  ): Promise<'OK' | null>;
  pexpire(key: string, ttlMs: number): Promise<number>;
  /** EVAL script numKeys key arg — untuk release compare-and-delete. */
  eval(script: string, numKeys: number, key: string, arg: string): Promise<unknown>;
  ping(): Promise<string>;
}

export interface DistributedLockOptions {
  /** TTL lock (ms). Default 10 menit; juga jadi dasar jarak heartbeat (1/4 TTL). */
  ttlMs?: number;
  /** Prefix kunci Redis; kunci penuh = `<keyPrefix>:<nama>`. Default `lock:cron`. */
  keyPrefix?: string;
  /**
   * Klien Redis eksplisit. Null/tidak diset → langsung guard in-memory
   * (perilaku lama; dipakai di dev tanpa Redis & sebagian besar test).
   */
  lockClient?: LockRedisClient | null;
}

/**
 * Eksekusi pekerjaan di bawah lock. Sengaja mengembalikan void — kontrak method
 * @Cron pemanggil tidak berubah; keputusan "dilewati" cukup terlihat via log.
 */
export type DistributedLock = <T>(
  name: string,
  fn: () => Promise<T>,
) => Promise<void>;

const RELEASE_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end
`;

/**
 * Env opt-in untuk mengaktifkan distributed lock. Default 'false' (guard in-memory
 * saja — cukup untuk dev/single-instance). Di produksi diset 'true' via compose
 * karena Valkey tersedia (REDIS_URL) dan dipakai bersama BullMQ.
 */
export const CRON_DISTRIBUTED_LOCK_ENV = 'CRON_DISTRIBUTED_LOCK';

/** Klien Redis bersama antar semua service cron (satu koneksi cukup). */
let sharedLockClient: LockRedisClient | null | undefined;

/** Tutup klien bersama — hanya untuk test. */
export function resetCronLockClientForTest(): void {
  sharedLockClient = undefined;
}

/**
 * Buat (atau ambil dari cache) klien Redis untuk distributed lock.
 * Mengembalikan null bila env CRON_DISTRIBUTED_LOCK !== 'true' atau koneksi
 * gagal dibuat — pemanggil otomatis jatuh ke guard in-memory.
 */
export function createCronLockClient(logger: LoggerLike): LockRedisClient | null {
  if (process.env[CRON_DISTRIBUTED_LOCK_ENV] !== 'true') return null;
  if (sharedLockClient !== undefined) return sharedLockClient;

  try {
    const conn = resolveRedisConnection();
    if (!('host' in conn)) return (sharedLockClient = null); // instance eksplisit tak dipakai di sini
    const client = new Redis({
      host: conn.host,
      port: conn.port,
      // Jangan tahan proses hidup hanya karena lock; error diam-diam
      // (withLock melakukan PING sendiri untuk deteksi kesehatan).
      maxRetriesPerRequest: 2,
      retryStrategy: (times) => Math.min(times * 1_000, 5_000),
    });
    client.on('error', (() => {
      // ioredis memancarkan 'error' berkala saat Redis tak terjangkau.
      // Dithrottle agar tidak membanjiri log — keputusan fail-open diambil
      // di withLock via PING, bukan di sini.
      const now = Date.now();
      if (now - (client as unknown as { __lastErrLog?: number }).__lastErrLog! < FAILURE_LOG_INTERVAL_MS) return;
      (client as unknown as { __lastErrLog?: number }).__lastErrLog = now;
      logger.warn?.('[distributed-lock] koneksi Redis lock bermasalah — fail-open aktif');
    }) as (err: Error) => void);
    sharedLockClient = client as unknown as LockRedisClient;
  } catch (err) {
    logger.warn?.(
      `[distributed-lock] gagal membuat klien Redis: ${errorMessage(err)} — pakai guard in-memory`,
    );
    sharedLockClient = null;
  }
  return sharedLockClient;
}

/** Jarak heartbeat minimum (1/4 TTL bisa sangat pendek di test). */
const HEARTBEAT_FLOOR_MS = 5_000;
/** Log kegagalan Redis di-throttle 1×/menit agar tidak membanjiri log. */
const FAILURE_LOG_INTERVAL_MS = 60_000;

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * Elevasi overlap guard ke distributed lock SETNX.
 * Bila Redis tidak tersedia, otomatis fallback ke guard in-memory per-proses.
 */
export function createDistributedLock(
  logger: LoggerLike,
  options?: DistributedLockOptions | null,
): DistributedLock {
  const opts = options ?? {};
  const ttlMs = opts.ttlMs ?? 10 * 60_000;
  const keyPrefix = opts.keyPrefix ?? 'lock:cron';
  const heartbeatIntervalMs = Math.max(HEARTBEAT_FLOOR_MS, Math.floor(ttlMs / 4));
  // Token acak per-proses: membedakan pemegang lock antar-instance.
  const token = `${process.pid}-${randomBytes(8).toString('hex')}`;

  // Fallback in-memory per-proses — dipakai saat Redis tidak tersedia.
  const memoryGuard = createOverlapGuard(logger);
  let redisDownSince: number | null = null;

  const logRedisFailure = (action: string, err: unknown): void => {
    const now = Date.now();
    if (redisDownSince === null || now - redisDownSince >= FAILURE_LOG_INTERVAL_MS) {
      redisDownSince = now;
      logger.error?.(
        `[distributed-lock] Redis gagal (${action}): ${errorMessage(err)} — fallback guard in-memory`,
      );
    }
  };

  const releaseLock = async (
    client: LockRedisClient,
    key: string,
  ): Promise<void> => {
    try {
      await client.eval(RELEASE_SCRIPT, 1, key, token);
    } catch {
      // Release gagal → lock akan kedaluwarsa sendiri via TTL (tidak deadlock).
    }
  };

  return async function withLock<T>(
    name: string,
    fn: () => Promise<T>,
  ): Promise<void> {
    const client = opts.lockClient ?? null;

    // Tanpa klien Redis → perilaku lama (guard in-memory).
    if (!client) {
      await memoryGuard(name, fn);
      return;
    }

    const key = `${keyPrefix}:${name}`;

    // Cek kesehatan Redis dulu (PING) → gagal = fail-open, cron tetap jalan.
    let redisHealthy = true;
    try {
      await client.ping();
    } catch (err) {
      redisHealthy = false;
      logRedisFailure('PING', err);
    }
    if (redisHealthy && redisDownSince !== null) redisDownSince = null; // pulih

    if (redisHealthy) {
      let acquired = false;
      try {
        acquired = (await client.set(key, token, 'PX', ttlMs, 'NX')) === 'OK';
      } catch (err) {
        redisHealthy = false;
        logRedisFailure('SET NX', err);
      }

      if (redisHealthy && acquired) {
        // Heartbeat: perpanjang TTL selama fn masih berjalan.
        const heartbeat = setInterval(() => {
          void client.pexpire(key, ttlMs).catch(() => undefined);
        }, heartbeatIntervalMs);
        if (typeof heartbeat.unref === 'function') heartbeat.unref();
        try {
          await fn();
        } finally {
          clearInterval(heartbeat);
          await releaseLock(client, key);
        }
        return;
      }

      if (redisHealthy) {
        // SET berhasil dieksekusi tapi tidak kami yang menang → instance lain memegang.
        logger.warn(`[distributed-lock] "${name}" dipegang instance lain — eksekusi dilewati`);
        return;
      }
      // Redis error di tengah jalan → jatuh ke fail-open di bawah.
    }

    await memoryGuard(name, fn);
  };
}
