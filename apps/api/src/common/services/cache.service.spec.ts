import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from './cache.service';

describe('CacheService (integration)', () => {
  let cache: CacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CacheService],
    }).compile();

    cache = module.get<CacheService>(CacheService);
    cache.clear();
  });

  afterEach(() => {
    cache.onModuleDestroy();
  });

  it('should be defined', () => {
    expect(cache).toBeDefined();
  });

  // ─── Basic get/set ───
  describe('get/set', () => {
    it('should store and retrieve a value', () => {
      cache.set('key1', { data: 'test' });
      expect(cache.get('key1')).toEqual({ data: 'test' });
    });

    it('should return undefined for non-existent key', () => {
      expect(cache.get('nonexistent')).toBeUndefined();
    });

    it('should overwrite existing key', () => {
      cache.set('key1', 'first');
      cache.set('key1', 'second');
      expect(cache.get('key1')).toBe('second');
    });

    it('should store different value types', () => {
      cache.set('string', 'hello');
      cache.set('number', 42);
      cache.set('boolean', true);
      cache.set('array', [1, 2, 3]);
      cache.set('object', { nested: { value: true } });

      expect(cache.get('string')).toBe('hello');
      expect(cache.get('number')).toBe(42);
      expect(cache.get('boolean')).toBe(true);
      expect(cache.get('array')).toEqual([1, 2, 3]);
      expect(cache.get('object')).toEqual({ nested: { value: true } });
    });
  });

  // ─── TTL expiry ───
  describe('TTL expiry', () => {
    it('should expire entries after TTL', async () => {
      cache.set('short-lived', 'value', 50); // 50ms TTL
      expect(cache.get('short-lived')).toBe('value');

      // Wait for expiry
      await new Promise((r) => setTimeout(r, 80));
      expect(cache.get('short-lived')).toBeUndefined();
    });

    it('should keep entries alive within TTL', async () => {
      cache.set('still-alive', 'value', 200); // 200ms TTL
      await new Promise((r) => setTimeout(r, 50));
      expect(cache.get('still-alive')).toBe('value');
    });

    it('should use default TTL of 60 seconds', () => {
      cache.set('default-ttl', 'value');
      const stats = cache.getStats();
      expect(stats.keys).toContain('default-ttl');
      // Should not be expired immediately
      expect(cache.get('default-ttl')).toBe('value');
    });
  });

  // ─── getOrSet (cache-aside pattern) ───
  describe('getOrSet', () => {
    it('should call factory and cache on first call', async () => {
      const factory = jest.fn().mockResolvedValue({ computed: true });

      const result = await cache.getOrSet('computed-key', factory, 60_000);

      expect(result).toEqual({ computed: true });
      expect(factory).toHaveBeenCalledTimes(1);
    });

    it('should return cached value on second call (cache hit)', async () => {
      const factory = jest.fn().mockResolvedValue({ computed: true });

      await cache.getOrSet('cached-key', factory, 60_000);
      const result = await cache.getOrSet('cached-key', factory, 60_000);

      expect(result).toEqual({ computed: true });
      expect(factory).toHaveBeenCalledTimes(1); // Only called once
    });

    it('should re-compute after TTL expiry', async () => {
      const factory = jest.fn()
        .mockResolvedValueOnce('first-call')
        .mockResolvedValueOnce('second-call');

      const result1 = await cache.getOrSet('ttl-key', factory, 50);
      expect(result1).toBe('first-call');
      expect(factory).toHaveBeenCalledTimes(1);

      await new Promise((r) => setTimeout(r, 80));

      const result2 = await cache.getOrSet('ttl-key', factory, 50);
      expect(result2).toBe('second-call');
      expect(factory).toHaveBeenCalledTimes(2);
    });

    it('should re-compute after invalidation', async () => {
      const factory = jest.fn()
        .mockResolvedValueOnce('before-invalidation')
        .mockResolvedValueOnce('after-invalidation');

      await cache.getOrSet('invalidate-key', factory, 60_000);
      cache.del('invalidate-key');

      const result = await cache.getOrSet('invalidate-key', factory, 60_000);
      expect(result).toBe('after-invalidation');
      expect(factory).toHaveBeenCalledTimes(2);
    });

    it('should work with async factories', async () => {
      const result = await cache.getOrSet('async-key', async () => {
        await new Promise((r) => setTimeout(r, 10));
        return 'async-result';
      }, 60_000);

      expect(result).toBe('async-result');
      // Second call should be instant (cached)
      const result2 = await cache.getOrSet('async-key', async () => {
        throw new Error('Should not be called');
      }, 60_000);
      expect(result2).toBe('async-result');
    });
  });

  // ─── del ───
  describe('del', () => {
    it('should delete a specific key', () => {
      cache.set('to-delete', 'value');
      expect(cache.get('to-delete')).toBe('value');

      cache.del('to-delete');
      expect(cache.get('to-delete')).toBeUndefined();
    });

    it('should not affect other keys', () => {
      cache.set('keep', 'keep-value');
      cache.set('delete-me', 'delete-value');

      cache.del('delete-me');

      expect(cache.get('keep')).toBe('keep-value');
      expect(cache.get('delete-me')).toBeUndefined();
    });

    it('should be safe to delete non-existent key', () => {
      expect(() => cache.del('nonexistent')).not.toThrow();
    });
  });

  // ─── invalidatePrefix ───
  describe('invalidatePrefix', () => {
    it('should invalidate all keys with matching prefix', () => {
      cache.set('members:list:all:1:10', { data: 'page1' });
      cache.set('members:list:all:2:10', { data: 'page2' });
      cache.set('members:list:r1:1:10', { data: 'ranting1' });
      cache.set('candidates:list:all:1:10', { data: 'candidates' });

      cache.invalidatePrefix('members:');

      expect(cache.get('members:list:all:1:10')).toBeUndefined();
      expect(cache.get('members:list:all:2:10')).toBeUndefined();
      expect(cache.get('members:list:r1:1:10')).toBeUndefined();
      expect(cache.get('candidates:list:all:1:10')).toEqual({ data: 'candidates' }); // Not affected
    });

    it('should handle empty prefix gracefully', () => {
      cache.set('key1', 'v1');
      cache.set('key2', 'v2');

      // Empty prefix would match everything — test it doesn't crash
      expect(() => cache.invalidatePrefix('')).not.toThrow();
    });

    it('should be safe when no keys match', () => {
      cache.set('existing', 'value');
      cache.invalidatePrefix('nonexistent:');
      expect(cache.get('existing')).toBe('value');
    });
  });

  // ─── FIFO eviction (MAX_ENTRIES) ───
  describe('FIFO eviction', () => {
    it('should evict oldest entries when MAX_ENTRIES exceeded', () => {
      // CacheService MAX_ENTRIES is 1000
      // Set 1001 entries to trigger eviction
      for (let i = 0; i < 1001; i++) {
        cache.set(`entry-${i}`, `value-${i}`, 60_000);
      }

      const stats = cache.getStats();
      expect(stats.size).toBe(1000);
      // Oldest entry should be evicted
      expect(cache.get('entry-0')).toBeUndefined();
      // Newest entry should exist
      expect(cache.get('entry-1000')).toBe('value-1000');
    });

    it('should update insert order when overwriting existing keys', () => {
      // Fill to limit
      for (let i = 0; i < 1000; i++) {
        cache.set(`entry-${i}`, `value-${i}`, 60_000);
      }
      // Overwrite first entry (should move to end of insert order)
      cache.set('entry-0', 'updated', 60_000);
      // Add one more to trigger eviction
      cache.set('entry-new', 'new', 60_000);

      // entry-0 should survive (moved to end), entry-1 should be evicted
      expect(cache.get('entry-0')).toBe('updated');
      expect(cache.get('entry-1')).toBeUndefined();
    });
  });

  // ─── Cross-service invalidation patterns ───
  describe('Cross-service invalidation', () => {
    it('should simulate Members cache invalidation on mutation', async () => {
      // Simulate MembersService caching
      await cache.getOrSet('members:list:all:1:10:', async () => ({ data: ['member1'] }), 30_000);
      await cache.getOrSet('members:list:r1:1:10:', async () => ({ data: ['member2'] }), 30_000);
      expect(cache.getStats().size).toBe(2);

      // Simulate mutation (create/update/remove) — invalidate all members cache
      cache.invalidatePrefix('members:');
      expect(cache.getStats().size).toBe(0);
    });

    it('should simulate cross-service invalidation (Dues → Reports)', async () => {
      // Simulate ReportsService dashboard cache
      await cache.getOrSet('reports:dashboard:all', async () => ({ totalMembers: 100 }), 30_000);
      // Simulate DuesService dashboard cache
      await cache.getOrSet('dues:dashboard', async () => ({ totalIuran: 5000000 }), 30_000);

      expect(cache.getStats().size).toBe(2);

      // Simulate Dues mutation — should invalidate both dues and reports caches
      cache.invalidatePrefix('dues:');
      cache.invalidatePrefix('reports:');

      expect(cache.getStats().size).toBe(0);
    });

    it('should preserve unrelated caches during partial invalidation', async () => {
      await cache.getOrSet('members:list:all:1:10:', async () => 'members', 30_000);
      await cache.getOrSet('candidates:list:all:1:10:', async () => 'candidates', 30_000);
      await cache.getOrSet('reports:dashboard:all', async () => 'reports', 30_000);

      cache.invalidatePrefix('members:');

      expect(cache.get('members:list:all:1:10:')).toBeUndefined();
      expect(cache.get('candidates:list:all:1:10:')).toBe('candidates');
      expect(cache.get('reports:dashboard:all')).toBe('reports');
    });
  });

  // ─── Stats ───
  describe('getStats', () => {
    it('should return correct stats', () => {
      cache.set('a', 1);
      cache.set('b', 2);

      const stats = cache.getStats();
      expect(stats.size).toBe(2);
      expect(stats.keys).toContain('a');
      expect(stats.keys).toContain('b');
    });

    it('should reflect size changes after operations', () => {
      expect(cache.getStats().size).toBe(0);

      cache.set('a', 1);
      expect(cache.getStats().size).toBe(1);

      cache.del('a');
      expect(cache.getStats().size).toBe(0);
    });
  });

  // ─── clear ───
  describe('clear', () => {
    it('should remove all entries', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      cache.clear();

      expect(cache.getStats().size).toBe(0);
      expect(cache.get('a')).toBeUndefined();
      expect(cache.get('b')).toBeUndefined();
      expect(cache.get('c')).toBeUndefined();
    });
  });

  // ─── onModuleDestroy ───
  describe('onModuleDestroy', () => {
    it('should clear cleanup interval without error', () => {
      expect(() => cache.onModuleDestroy()).not.toThrow();
    });
  });
});
