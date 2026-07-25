import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import type { RedisOptions } from 'ioredis';

/**
 * Two-layer cache: **write-through** to Redis + in-memory.
 *
 * - `set()` stores the value in **both** the in-memory Map and Redis (when
 *   connected) so both layers are always warm.
 * - `get()` reads from the in-memory Map (synchronous, fast).  Redis is
 *   not consulted on reads — it serves as a persistence / cross-pod layer.
 * - When Redis is unreachable every operation gracefully degrades to the
 *   in-memory Map without throwing.
 *
 * Key semantics
 * -------------
 * - Redis keys are namespaced under the prefix `cache:` to make `clear()`
 *   and `invalidatePrefix()` safe in a shared Redis instance.
 * - TTL is expressed in **milliseconds** and mapped directly to Redis `PX`.
 * - The in-memory store is always available.
 */
@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);

  /** Redis key prefix – makes `clear()` and `invalidatePrefix()` safe. */
  private static readonly KEY_PREFIX = 'cache:';

  // ── In-memory store (always available) ─────────────────────────────────
  private memoryStore = new Map<string, { value: unknown; expiresAt: number }>();
  private insertOrder: string[] = [];
  private readonly MAX_ENTRIES = 1_000;
  private cleanupInterval: ReturnType<typeof setInterval>;

  // ── Redis store (optional) ────────────────────────────────────────────
  private redisClient: Redis | null = null;
  private redisConnected = false;

  constructor() {
    this.cleanupInterval = setInterval(() => this.cleanup(), 30_000);
    this.tryConnectRedis();
  }

  // ═════════════════════════════════════════════════════════════════════
  //  Public API
  // ═════════════════════════════════════════════════════════════════════

  /**
   * Get a value by key from the **in-memory** store.
   *
   * This method is synchronous and does **not** consult Redis — reads are
   * served exclusively from the local Map.  Because every `set()` call
   * writes to both Redis *and* memory, the in-memory copy is always warm.
   * Returns `undefined` when the key does not exist or has expired.
   */
  get<T = unknown>(key: string): T | undefined {
    const entry = this.memoryStore.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.memoryStore.delete(key);
      return undefined;
    }

    return entry.value as T;
  }

  /**
   * Store a value with an optional TTL (milliseconds, default 60 s).
   *
   * Writes to **both** Redis (if connected) and the in-memory Map so the
   * fallback is always warm and other pods can read the value.
   */
  set(key: string, value: unknown, ttlMs: number = 60_000): void {
    this.setInMemory(key, value, ttlMs);
    if (this.redisConnected) {
      this.setInRedis(key, value, ttlMs);
    }
  }

  /**
   * Delete a single key from both layers.
   */
  del(key: string): void {
    this.delInMemory(key);
    if (this.redisConnected) {
      this.delInRedis(key);
    }
  }

  /**
   * Delete all keys whose name starts with a given prefix.
   */
  invalidatePrefix(prefix: string): void {
    this.invalidatePrefixInMemory(prefix);
    if (this.redisConnected) {
      this.invalidatePrefixInRedis(prefix);
    }
  }

  /**
   * Get a value (cache-aside pattern), computing + caching on a miss.
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttlMs: number = 60_000,
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) return cached;

    const value = await factory();
    this.set(key, value, ttlMs);
    return value;
  }

  /**
   * Return cache statistics.
   */
  getStats(): { size: number; keys: string[] } {
    return { size: this.memoryStore.size, keys: Array.from(this.memoryStore.keys()) };
  }

  /**
   * Remove **all** entries from the cache (both layers).
   */
  clear(): void {
    this.clearMemory();
    if (this.redisConnected) {
      this.clearRedis();
    }
  }

  /**
   * Whether the Redis backend is currently connected.
   */
  isRedisConnected(): boolean {
    return this.redisConnected;
  }

  // ═════════════════════════════════════════════════════════════════════
  //  Lifecycle
  // ═════════════════════════════════════════════════════════════════════

  onModuleDestroy(): void {
    clearInterval(this.cleanupInterval);
    if (this.redisClient) {
      this.redisClient.disconnect();
      this.redisClient = null;
      this.redisConnected = false;
    }
  }

  // ═════════════════════════════════════════════════════════════════════
  //  Internal helpers — Redis
  // ═════════════════════════════════════════════════════════════════════

  /** @visibleForTesting */
  static readonly DEFAULT_REDIS_OPTIONS: RedisOptions = {
    lazyConnect: true,
    maxRetriesPerRequest: 2,
    retryStrategy(times: number) {
      if (times > 3) return null;
      return Math.min(times * 200, 1_000);
    },
    enableOfflineQueue: false,
    connectTimeout: 3_000,
    commandTimeout: 2_000,
  };

  private tryConnectRedis(): void {
    const url = process.env.REDIS_URL;
    if (!url) {
      this.logger.log('REDIS_URL not set — using in-memory cache only');
      return;
    }

    try {
      this.redisClient = new Redis(url, CacheService.DEFAULT_REDIS_OPTIONS);

      this.redisClient.on('connect', () => {
        this.redisConnected = true;
        this.logger.log('Redis cache connected');
      });

      this.redisClient.on('close', () => {
        this.redisConnected = false;
        this.logger.warn('Redis cache connection closed — falling back to in-memory');
      });

      this.redisClient.on('error', (err) => {
        this.redisConnected = false;
        this.logger.warn(`Redis cache error: ${err.message}`);
      });

      this.redisClient.connect().catch((err: Error) => {
        this.redisConnected = false;
        this.logger.warn(`Redis connect failed (${err.message}) — using in-memory cache`);
      });
    } catch (err) {
      this.redisConnected = false;
      this.logger.warn(`Redis init error (${(err as Error).message}) — using in-memory cache`);
    }
  }

  private prefixedKey(key: string): string {
    return `${CacheService.KEY_PREFIX}${key}`;
  }

  private setInRedis(key: string, value: unknown, ttlMs: number): void {
    this.redisClient!
      .set(this.prefixedKey(key), JSON.stringify(value), 'PX', ttlMs)
      .catch((err: Error) => {
        this.logger.warn(`Redis set error: ${err.message}`);
      });
  }

  private delInRedis(key: string): void {
    this.redisClient!
      .del(this.prefixedKey(key))
      .catch((err: Error) => {
        this.logger.warn(`Redis del error: ${err.message}`);
      });
  }

  private invalidatePrefixInRedis(prefix: string): void {
    const pattern = `${this.prefixedKey(prefix)}*`;
    this.scanAndDelete(pattern).catch((err: Error) => {
      this.logger.warn(`Redis invalidatePrefix error: ${err.message}`);
    });
  }

  private async scanAndDelete(pattern: string): Promise<void> {
    let cursor = '0';
    const pipeline = this.redisClient!.pipeline();

    do {
      const result = await this.redisClient!.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = result[0];
      const keys = result[1];
      if (keys.length > 0) {
        pipeline.del(...keys);
      }
    } while (cursor !== '0');

    await pipeline.exec();
  }

  private clearRedis(): void {
    // Only delete keys with our prefix — never flush the whole DB.
    this.invalidatePrefixInRedis('');
  }

  // ═════════════════════════════════════════════════════════════════════
  //  Internal helpers — in-memory
  // ═════════════════════════════════════════════════════════════════════

  private setInMemory(key: string, value: unknown, ttlMs: number): void {
    const existingIndex = this.insertOrder.indexOf(key);
    if (existingIndex !== -1) {
      this.insertOrder.splice(existingIndex, 1);
    }

    this.memoryStore.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
    this.insertOrder.push(key);

    // Evict oldest entries if over limit
    while (this.memoryStore.size > this.MAX_ENTRIES) {
      const oldestKey = this.insertOrder.shift();
      if (oldestKey) this.memoryStore.delete(oldestKey);
    }
  }

  private delInMemory(key: string): void {
    this.memoryStore.delete(key);
    const index = this.insertOrder.indexOf(key);
    if (index !== -1) this.insertOrder.splice(index, 1);
  }

  private invalidatePrefixInMemory(prefix: string): void {
    for (const key of this.insertOrder) {
      if (key.startsWith(prefix)) {
        this.memoryStore.delete(key);
      }
    }
    this.insertOrder = this.insertOrder.filter((k) => !k.startsWith(prefix));
  }

  private clearMemory(): void {
    this.memoryStore.clear();
    this.insertOrder = [];
  }

  private cleanup(): void {
    const now = Date.now();
    const staleKeys = new Set<string>();
    for (const [key, entry] of this.memoryStore.entries()) {
      if (now > entry.expiresAt) {
        this.memoryStore.delete(key);
        staleKeys.add(key);
      }
    }
    if (staleKeys.size > 0) {
      this.insertOrder = this.insertOrder.filter((k) => !staleKeys.has(k));
    }
  }
}
