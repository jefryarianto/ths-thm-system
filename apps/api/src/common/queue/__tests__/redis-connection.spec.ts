import { parseRedisUrl, resolveRedisConnection } from '../redis-connection';

describe('parseRedisUrl', () => {
  it('mem-parse redis://host:port', () => {
    expect(parseRedisUrl('redis://valkey:6379')).toEqual({ host: 'valkey', port: 6379 });
  });

  it('mem-parse redis:// tanpa port (default 6379)', () => {
    expect(parseRedisUrl('redis://myredis')).toEqual({ host: 'myredis', port: 6379 });
  });

  it('mem-parse kredensial & db tanpa membocorkan keduanya dari hasil', () => {
    const result = parseRedisUrl('redis://user:pass@host1:6380/2');
    expect(result).toEqual({ host: 'host1', port: 6380 });
  });

  it('mem-parse rediss:// (TLS)', () => {
    expect(parseRedisUrl('rediss://secure:6381')).toEqual({ host: 'secure', port: 6381 });
  });

  it('menolak protokol non-redis dan URL rusak', () => {
    expect(parseRedisUrl('postgresql://db:5432')).toBeNull();
    expect(parseRedisUrl('bukan-url')).toBeNull();
  });
});

describe('resolveRedisConnection', () => {
  it('mengembalikan instance Redis (punya duplicate) apa adanya', () => {
    const instance = { duplicate: () => ({}) };
    expect(resolveRedisConnection({ connection: instance }, {})).toBe(instance);
  });

  it('memprioritaskan host eksplisit dari pemanggil', () => {
    expect(resolveRedisConnection({ connection: { host: 'caller-host', port: 7000 } }, {})).toEqual({
      host: 'caller-host',
      port: 7000,
    });
  });

  it('memakai REDIS_URL bila tidak ada detail eksplisit (format compose produksi)', () => {
    expect(resolveRedisConnection({}, { REDIS_URL: 'redis://valkey:6379' })).toEqual({
      host: 'valkey',
      port: 6379,
    });
  });

  it('REDIS_URL rusak jatuh ke REDIS_HOST/PORT lalu default', () => {
    expect(
      resolveRedisConnection({}, { REDIS_URL: 'rusak', REDIS_HOST: 'h', REDIS_PORT: '7001' }),
    ).toEqual({ host: 'h', port: 7001 });
    expect(resolveRedisConnection({}, { REDIS_URL: 'rusak' })).toEqual({
      host: 'localhost',
      port: 6379,
    });
  });

  it('kompatibilitas format lama REDIS_HOST/REDIS_PORT', () => {
    expect(resolveRedisConnection({}, { REDIS_HOST: 'redis-lama', REDIS_PORT: '6382' })).toEqual({
      host: 'redis-lama',
      port: 6382,
    });
  });

  it('default localhost:6379 tanpa env apa pun', () => {
    expect(resolveRedisConnection({}, {})).toEqual({ host: 'localhost', port: 6379 });
  });
});
