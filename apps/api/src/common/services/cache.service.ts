import { Injectable } from '@nestjs/common';

/**
 * Lightweight in-memory cache with TTL support.
 *
 * Provides simple key-value caching for high-traffic queries
 * to reduce database load. No external dependencies required.
 *
 * Usage:
 *   - Cache scope filter results to avoid repeated Prisma queries
 *   - Cache dashboard stats for a short TTL
 *   - Cache list queries with pagination
 *
 * Can be replaced with Redis-backed implementation later
 * by changing the internal Map to a Redis client.
 */
@Injectable()
export class CacheService {
  private store = new Map<string, { value: unknown; expiresAt: number }>();
  private insertOrder: string[] = [];
  private cleanupInterval: ReturnType<typeof setInterval>;
  private readonly MAX_ENTRIES = 1_000;

  constructor() {
    // Cleanup expired entries every 30 seconds
    this.cleanupInterval = setInterval(() => this.cleanup(), 30_000);
  }

  /**
   * Get a value from cache by key.
   * Returns undefined if not found or expired.
   */
  get<T = unknown>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }

    return entry.value as T;
  }

  /**
   * Set a value in cache with a TTL in milliseconds.
   * Default TTL is 60 seconds.
   */
  set(key: string, value: unknown, ttlMs: number = 60_000): void {
    // If key already exists, update its position
    const existingIndex = this.insertOrder.indexOf(key);
    if (existingIndex !== -1) {
      this.insertOrder.splice(existingIndex, 1);
    }

    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
    this.insertOrder.push(key);

    // Evict oldest entries if over limit
    while (this.store.size > this.MAX_ENTRIES) {
      const oldestKey = this.insertOrder.shift();
      if (oldestKey) this.store.delete(oldestKey);
    }
  }

  /**
   * Delete a specific key from cache.
   */
  del(key: string): void {
    this.store.delete(key);
    const index = this.insertOrder.indexOf(key);
    if (index !== -1) this.insertOrder.splice(index, 1);
  }

  /**
   * Delete all keys matching a prefix.
   * Useful for invalidating cache when data changes.
   *
   * @example
   *   cache.invalidatePrefix('members:');
   *   // Removes all members-related cache entries
   */
  invalidatePrefix(prefix: string): void {
    for (const key of this.insertOrder) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
    this.insertOrder = this.insertOrder.filter((k) => !k.startsWith(prefix));
  }

  /**
   * Get a value or compute and cache it if not present.
   * Useful for cache-aside pattern.
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
   * Get cache statistics.
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.store.size,
      keys: Array.from(this.store.keys()),
    };
  }

  /**
   * Clear all cache entries.
   */
  clear(): void {
    this.store.clear();
    this.insertOrder = [];
  }

  /**
   * Remove expired entries.
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Cleanup interval on module destroy.
   */
  onModuleDestroy(): void {
    clearInterval(this.cleanupInterval);
  }
}
