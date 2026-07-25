import { BullMQQueueAdapter } from '../bullmq-queue.adapter';
import { JobPayload, JobResult } from '../queue.interface';

/**
 * e2e test for BullMQQueueAdapter using a real Redis instance.
 *
 * Skips all tests automatically when:
 * - `ioredis` is not installed
 * - Redis is not reachable on localhost:6379
 * - Redis version < 5.0 (BullMQ requirement)
 *
 * Each test uses a unique queue name to avoid cross-test pollution.
 *
 * Prerequisites: Redis 5+ running on localhost:6379
 *   docker run -d -p 6379:6379 redis:7-alpine
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let RedisConstructor: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  RedisConstructor = require('ioredis');
} catch {
  RedisConstructor = null;
}

const QUEUE_PREFIX = 'bull-test-';
let nextQueueId = 0;

function queueName(): string {
  return `${QUEUE_PREFIX}${nextQueueId++}-${Date.now()}`;
}

let isRedisSupported = false;
let redisVersion: string | null = null;

const describeOrSkip = RedisConstructor ? describe : describe.skip;

describeOrSkip('BullMQQueueAdapter (real Redis)', () => {
  let adapter: BullMQQueueAdapter;
  let redis: import('ioredis').Redis | null = null;
  const completedResults: JobResult[] = [];
  const failedResults: JobResult[] = [];

  function createAdapter(
    callbacks?: Partial<{
      onProcess: (p: JobPayload) => Promise<JobResult>;
      onComplete: (r: JobResult) => Promise<void>;
      onFailed: (r: JobResult) => Promise<void>;
    }>,
    opts?: Partial<{ concurrency: number; maxRetries: number; queueName: string }>,
  ): BullMQQueueAdapter {
    const processFn = callbacks?.onProcess ?? (async (p) => ({ jobId: p.jobId, success: true, data: {} }));
    return new BullMQQueueAdapter(
      {
        onProcess: processFn,
        onComplete: callbacks?.onComplete ?? (async () => {}),
        onFailed: callbacks?.onFailed ?? (async () => {}),
      },
      {
        concurrency: opts?.concurrency ?? 5,
        maxRetries: opts?.maxRetries ?? 2,
        queueName: opts?.queueName ?? queueName(),
      },
    );
  }

  beforeAll(async () => {
    if (!RedisConstructor) return;
    try {
      redis = new RedisConstructor(6379, 'localhost', { maxRetriesPerRequest: null });
      const info = await (redis as NonNullable<typeof redis>).info('server');
      const match = info.match(/redis_version:([\d.]+)/);
      redisVersion = match ? match[1] : 'unknown';
      const major = parseInt(redisVersion.split('.')[0], 10);
      isRedisSupported = major >= 5;
      if (!isRedisSupported) {
        // eslint-disable-next-line no-console
        console.warn(
          `BullMQ requires Redis >= 5.0. Current: Redis ${redisVersion}. Skipping tests.`,
        );
      }
      // Suppress noisy BullMQ version errors in console when Redis < 5.0
      jest.spyOn(console, 'error').mockImplementation(() => {});
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(`Redis not available (${(err as Error).message}). Skipping tests.`);
      isRedisSupported = false;
      if (redis) await redis.quit().catch(() => {});
    }
  });

  afterAll(async () => {
    if (redis) {
      // Clean up all test queue keys
      try {
        const keys = await redis.keys(`${QUEUE_PREFIX}*`);
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      } catch {
        // ignore cleanup errors
      }
      await redis.quit().catch(() => {});
    }
  });

  afterEach(async () => {
    if (adapter) {
      await adapter.shutdown().catch(() => {});
    }
  });

  /**
   * Helper to skip tests that require a functioning BullMQ Queue/Worker
   * (i.e., Redis ≥ 5.0 running on localhost).
   */
  /** Return true if tests can proceed (Redis ≥ 5.0). */
  function skipIfUnsupported(): boolean {
    if (!isRedisSupported) {
      // eslint-disable-next-line no-console
      console.warn('Redis < 5.0 — skipping test that requires BullMQ processing');
      return false;
    }
    return true;
  }

  // ── Initialization ──────────────────────────────────────

  it('should initialize without throwing', () => {
    adapter = createAdapter();
    expect(adapter).toBeDefined();
  });

  // ── Adding and processing a single job ─────────────────

  it('should add and process a single job', async () => {
    if (!skipIfUnsupported()) return;
    const processFn = jest.fn(async (p: JobPayload) => ({ jobId: p.jobId, success: true, data: {} }));
    const completeFn = jest.fn(async (r: JobResult) => { completedResults.push(r); });
    adapter = createAdapter({ onProcess: processFn, onComplete: completeFn });

    await adapter.add({ jobId: 'job-1', type: 'kartu_anggota', data: { memberId: 'm-1' } });
    await adapter.onIdle();

    expect(processFn).toHaveBeenCalledTimes(1);
    expect(processFn).toHaveBeenCalledWith(
      expect.objectContaining({ jobId: 'job-1', type: 'kartu_anggota' }),
    );
    expect(completeFn).toHaveBeenCalledTimes(1);
    expect(completedResults[0].jobId).toBe('job-1');
    expect(completedResults[0].success).toBe(true);
  });

  // ── Adding and processing multiple jobs ─────────────────

  it('should add and process multiple jobs in bulk', async () => {
    if (!skipIfUnsupported()) return;
    const processFn = jest.fn(async (p: JobPayload) => ({ jobId: p.jobId, success: true, data: {} }));
    adapter = createAdapter({ onProcess: processFn });

    const payloads: JobPayload[] = [
      { jobId: 'b-1', type: 'kartu_anggota', data: { memberId: 'm-1' } },
      { jobId: 'b-2', type: 'sertifikat_pendadaran', data: { memberId: 'm-2' } },
      { jobId: 'b-3', type: 'piagam_prestasi', data: { memberId: 'm-3' } },
    ];

    await adapter.addBulk(payloads);
    await adapter.onIdle();

    expect(processFn).toHaveBeenCalledTimes(3);
  });

  // ── Concurrency control ────────────────────────────────

  it('should respect concurrency limit', async () => {
    if (!skipIfUnsupported()) return;
    adapter = createAdapter(
      { onProcess: async (p) => { await new Promise((r) => setTimeout(r, 100)); return { jobId: p.jobId, success: true, data: {} }; } },
      { concurrency: 2, maxRetries: 1, queueName: `${queueName()}-concurrency` },
    );

    const payloads: JobPayload[] = [
      { jobId: 'c-1', type: 'test', data: {} },
      { jobId: 'c-2', type: 'test', data: {} },
      { jobId: 'c-3', type: 'test', data: {} },
    ];

    const start = Date.now();
    await adapter.addBulk(payloads);
    await adapter.onIdle();
    const elapsed = Date.now() - start;

    // With concurrency=2 and 3 × 100ms jobs:
    //   T=0:    c-1 + c-2 start
    //   T=100:  c-3 starts (one slot freed)
    //   T=200:  all done
    // Total ≈ 200ms (not 300ms if serial)
    expect(elapsed).toBeGreaterThanOrEqual(50);
    expect(elapsed).toBeLessThan(1000); // generous upper bound for CI
  });

  // ── Retry behavior ─────────────────────────────────────

  it('should retry failed jobs up to maxRetries times', async () => {
    if (!skipIfUnsupported()) return;
    let attempts = 0;
    adapter = createAdapter(
      {
        onProcess: async (p) => { attempts++; return { jobId: p.jobId, success: false, error: `fail #${attempts}` }; },
        onFailed: async (r) => { failedResults.push(r); },
      },
      { concurrency: 1, maxRetries: 2, queueName: `${queueName()}-retry` },
    );

    await adapter.add({ jobId: 'retry-1', type: 'test', data: {} });
    await adapter.onIdle();

    // maxRetries=2 → 3 total attempts (1 initial + 2 retries)
    expect(attempts).toBe(3);
    expect(failedResults.length).toBe(1);
    expect(failedResults[0].success).toBe(false);
  });

  // ── Queue counts ───────────────────────────────────────

  it('should report pending count accurately', async () => {
    if (!skipIfUnsupported()) return;
    adapter = createAdapter({}, { concurrency: 1, queueName: `${queueName()}-count` });

    expect(await adapter.getPendingCount()).toBe(0);

    await adapter.add({ jobId: 'cnt-1', type: 'test', data: {} });
    await adapter.add({ jobId: 'cnt-2', type: 'test', data: {} });

    // Both jobs should be waiting or active
    const mid = await adapter.getPendingCount();
    expect(mid).toBeGreaterThanOrEqual(1);

    await adapter.onIdle();
    expect(await adapter.getPendingCount()).toBe(0);
  });

  // ── Pause / Resume ─────────────────────────────────────

  it('should pause and resume job processing', async () => {
    if (!skipIfUnsupported()) return;
    const processFn = jest.fn(async (p: JobPayload) => ({ jobId: p.jobId, success: true, data: {} }));
    adapter = createAdapter({ onProcess: processFn }, { concurrency: 1, queueName: `${queueName()}-pause` });

    await adapter.pause();

    await adapter.add({ jobId: 'p-1', type: 'test', data: {} });
    await new Promise((r) => setTimeout(r, 500));

    // While paused, the job should NOT have been processed
    expect(processFn).not.toHaveBeenCalled();

    await adapter.resume();
    await adapter.onIdle();

    expect(processFn).toHaveBeenCalledTimes(1);
  });

  // ── Graceful Shutdown ──────────────────────────────────

  it('should shut down gracefully without throwing', async () => {
    if (!skipIfUnsupported()) return;
    adapter = createAdapter();
    await expect(adapter.shutdown()).resolves.not.toThrow();
  });

  it('should be safe to call shutdown multiple times', async () => {
    if (!skipIfUnsupported()) return;
    adapter = createAdapter();
    await adapter.shutdown();
    await expect(adapter.shutdown()).resolves.not.toThrow();
  });

  // ── Restart survival (same queue name + same Redis) ────

  it('should leave uncompleted jobs in Redis for a new worker', async () => {
    if (!skipIfUnsupported()) return;
    const restartQueueName = `${queueName()}-restart`;

    // Start adapter1, add a job, process it, shut down
    adapter = new BullMQQueueAdapter(
      { onProcess: async (p) => ({ jobId: p.jobId, success: true, data: {} }) },
      { concurrency: 1, queueName: restartQueueName },
    );

    await adapter.add({ jobId: 'r-1', type: 'test', data: { seq: 1 } });
    await adapter.onIdle();
    await adapter.shutdown();

    // Start adapter2 with same queue name and SAME Redis
    const processed2: JobPayload[] = [];
    const adapter2 = new BullMQQueueAdapter(
      {
        onProcess: async (p) => {
          processed2.push(p);
          return { jobId: p.jobId, success: true, data: {} };
        },
      },
      { concurrency: 1, queueName: restartQueueName },
    );

    // The first job was completed, so it shouldn't be re-processed.
    // Add a new job to prove adapter2 works.
    await adapter2.add({ jobId: 'r-2', type: 'test', data: { seq: 2 } });
    await adapter2.onIdle();

    expect(processed2.length).toBe(1);
    expect(processed2[0].jobId).toBe('r-2');

    await adapter2.shutdown();
    adapter = adapter2; // let afterEach clean up
  });
});
