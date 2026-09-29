/**
 * Resolusi koneksi Redis untuk BullMQ (adapter & dashboard & health).
 *
 * Prioritas:
 *  1. Instance Redis eksplisit (punya method `duplicate`) — dipakai apa adanya
 *     (dipakai test via ioredis-mock).
 *  2. `options.connection.host` eksplisit dari pemanggil.
 *  3. Env `REDIS_URL` (redis://[user[:pass]@]host[:port][/db] atau rediss://).
 *  4. Env `REDIS_HOST` + `REDIS_PORT` (kompatibilitas lama).
 *  5. Default localhost:6379.
 *
 * Latar belakang: docker-compose produksi hanya menyetel `REDIS_URL=redis://valkey:6379`,
 * sedangkan kode lama hanya membaca REDIS_HOST/REDIS_PORT — sehingga BullMQ
 * akan konek ke localhost di dalam container (selalu gagal).
 */

export interface RedisConnectionDetails {
  host: string;
  port: number;
}

/** Instance Redis seperti ioredis (duck-typed via method `duplicate`). */
export type RedisInstanceConnection = { duplicate: () => unknown };

export type RedisConnection = RedisConnectionDetails | RedisInstanceConnection;

/** Parse redis:// atau rediss:// menjadi {host, port}. Null bila tidak valid. */
export function parseRedisUrl(url: string): RedisConnectionDetails | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'redis:' && parsed.protocol !== 'rediss:') return null;
    if (!parsed.hostname) return null;
    return {
      host: parsed.hostname,
      port: parsed.port ? parseInt(parsed.port, 10) || 6379 : 6379,
    };
  } catch {
    return null;
  }
}

/**
 * Resolusi koneksi Redis dari options pemanggil + environment.
 * Tidak pernah melempar — selalu mengembalikan detail yang layak dipakai.
 */
export function resolveRedisConnection(
  options?: { connection?: unknown },
  env: NodeJS.ProcessEnv = process.env,
): RedisConnection {
  const raw = options?.connection as RedisConnection | undefined;

  // 1. Instance eksplisit (ioredis / ioredis-mock) — pakai apa adanya
  if (raw && typeof (raw as RedisInstanceConnection).duplicate === 'function') {
    return raw;
  }

  // 2. Detail eksplisit dari pemanggil
  const explicit = raw as Partial<RedisConnectionDetails> | undefined;
  if (explicit?.host) {
    return { host: explicit.host, port: Number(explicit.port ?? 6379) };
  }

  // 3. REDIS_URL (format compose produksi: redis://valkey:6379)
  if (env.REDIS_URL) {
    const fromUrl = parseRedisUrl(env.REDIS_URL);
    if (fromUrl) return fromUrl;
  }

  // 4. Format lama REDIS_HOST/REDIS_PORT, lalu 5. default
  return {
    host: env.REDIS_HOST || 'localhost',
    port: parseInt(env.REDIS_PORT || '6379', 10) || 6379,
  };
}
