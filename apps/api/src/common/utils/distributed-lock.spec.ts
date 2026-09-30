import { createDistributedLock } from './distributed-lock';
import type { LockRedisClient } from './distributed-lock';

/**
 * Mock klien Redis yang meniru semantik nyata:
 * - SET NX: hanya sukses bila kunci belum ada.
 * - EVAL release: hanya menghapus bila token cocok (compare-and-delete).
 */
class MockRedis implements LockRedisClient {
  private readonly store = new Map<string, { value: string; px: number }>();
  /** Simulasi instance lain sudah memegang lock. */
  heldByOther = false;
  failPing = false;
  failSet = false;

  async ping(): Promise<string> {
    if (this.failPing) throw new Error('koneksi Redis mati');
    return 'PONG';
  }

  async set(
    key: string,
    value: string,
    _mode: 'PX',
    ttlMs: number,
    _condition: 'NX',
  ): Promise<'OK' | null> {
    if (this.failSet) throw new Error('SET gagal');
    if (this.heldByOther || this.store.has(key)) return null;
    this.store.set(key, { value, px: ttlMs });
    return 'OK';
  }

  async pexpire(key: string, ttlMs: number): Promise<number> {
    const entry = this.store.get(key);
    if (!entry) return 0;
    entry.px = ttlMs;
    return 1;
  }

  async eval(script: string, numKeys: number, key: string, arg: string): Promise<unknown> {
    expect(numKeys).toBe(1);
    expect(script).toContain('del'); // skrip compare-and-delete
    const entry = this.store.get(key);
    if (entry && entry.value === arg) {
      this.store.delete(key);
      return 1;
    }
    return 0;
  }

  async get(key: string): Promise<string | null> {
    return this.store.get(key)?.value ?? null;
  }

  isLocked(key: string): boolean {
    return this.store.has(key);
  }
}

describe('createDistributedLock', () => {
  it('tanpa klien Redis: berjalan sebagai guard in-memory biasa', async () => {
    const lock = createDistributedLock({ warn: jest.fn() });
    await expect(lock('tugas', async () => 42)).resolves.toBeUndefined();
  });

  it('tanpa klien: dua eksekusi bersamaan — yang kedua dilewati (fallback overlap guard)', async () => {
    const warn = jest.fn();
    const lock = createDistributedLock({ warn });
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));

    const first = lock('cron-berat', async () => {
      await gate;
    });
    const secondFn = jest.fn().mockResolvedValue('kedua');
    await lock('cron-berat', secondFn);

    expect(secondFn).not.toHaveBeenCalled(); // guard in-memory menahan
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('cron-berat'));

    release();
    await first;
  });

  it('SET NX sukses: fn dijalankan, lock dirilis via Lua compare-and-delete', async () => {
    const client = new MockRedis();
    const lock = createDistributedLock({ warn: jest.fn() }, { lockClient: client });

    await expect(lock('mail-auto-retry', async () => 'hasil')).resolves.toBeUndefined();

    expect(client.isLocked('lock:cron:mail-auto-retry')).toBe(false); // sudah dirilis
  });

  it('lock dipegang instance lain: fn TIDAK dijalankan', async () => {
    const warn = jest.fn();
    const client = new MockRedis();
    client.heldByOther = true;
    const lock = createDistributedLock({ warn }, { lockClient: client });

    const fn = jest.fn().mockResolvedValue('x');
    await lock('tagihan-bulanan', fn);

    expect(fn).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('dipegang instance lain'));
  });

  it('PING gagal (Redis mati): fail-open — cron tetap jalan via guard in-memory', async () => {
    const error = jest.fn();
    const client = new MockRedis();
    client.failPing = true;
    const lock = createDistributedLock({ warn: jest.fn(), error }, { lockClient: client });

    const fn = jest.fn().mockResolvedValue('tetap-jalan');
    await lock('tugas', fn);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledWith(expect.stringContaining('PING'));
  });

  it('SET NX melempar error: fail-open — cron tetap jalan', async () => {
    const error = jest.fn();
    const client = new MockRedis();
    client.failSet = true;
    const lock = createDistributedLock({ warn: jest.fn(), error }, { lockClient: client });

    const fn = jest.fn().mockResolvedValue('tetap-jalan');
    await lock('tugas', fn);

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('fn melempar error: lock tetap dirilis (finally) dan error diteruskan', async () => {
    const client = new MockRedis();
    const lock = createDistributedLock({ warn: jest.fn() }, { lockClient: client });

    await expect(
      lock('gagal', async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    expect(client.isLocked('lock:cron:gagal')).toBe(false);

    // Lock bebas → eksekusi berikutnya normal.
    await expect(lock('gagal', async () => 'pulih')).resolves.toBeUndefined();
  });

  it('keyPrefix kustom: kunci mengikuti prefix yang diberikan', async () => {
    const client = new MockRedis();
    const lock = createDistributedLock(
      { warn: jest.fn() },
      { lockClient: client, keyPrefix: 'lock:staging' },
    );

    // Pegang lock secara manual lalu coba ambil — harus terdeteksi.
    client.heldByOther = true;
    const fn = jest.fn().mockResolvedValue('x');
    await lock('tugas', fn);
    expect(fn).not.toHaveBeenCalled();
  });
});
