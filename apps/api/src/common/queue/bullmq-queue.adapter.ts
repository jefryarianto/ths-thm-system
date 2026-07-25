import { Logger } from '@nestjs/common';
import {
  IJobQueue,
  JobPayload,
  JobResult,
  JobLifecycleCallbacks,
  QueueOptions,
} from './queue.interface';

/**
 * BullMQ queue adapter for persistent, Redis-backed job processing.
 *
 * - Jobs survive server restarts (persisted in Redis)
 * - Horizontal scaling: multiple worker instances can share a queue
 * - Built-in retry with exponential backoff
 * - Configurable concurrency
 *
 * Requires a Redis instance. Falls back gracefully if Redis is unavailable.
 *
 * Enable with USE_BULLMQ=true env var and configure Redis via
 * REDIS_HOST (default: localhost) and REDIS_PORT (default: 6379).
 */

/** Minimal local type for the BullMQ Job object (event handler shape). */
interface BullJob {
  id?: string;
  name: string;
  data: unknown;
  attemptsMade: number;
  finishedOn?: number;
  processedOn?: number;
}

/** Minimal local type for the BullMQ Queue object. */
interface BullQueue {
  add(name: string, data: unknown, opts?: Record<string, unknown>): Promise<unknown>;
  addBulk(entries: Array<{ name: string; data: unknown; opts?: Record<string, unknown> }>): Promise<unknown>;
  getJobCounts(...types: string[]): Promise<Record<string, number>>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  close(): Promise<void>;
}

/** Minimal local type for the BullMQ Worker object. */
interface BullWorker {
  pause(): Promise<void>;
  resume(): Promise<void>;
  close(force?: boolean): Promise<void>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on(event: string, handler: (...args: any[]) => void): void;
}

/** Constructor opts type for BullMQ Queue & Worker. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BullOpts = Record<string, any>;

export class BullMQQueueAdapter implements IJobQueue {
  private readonly logger = new Logger(BullMQQueueAdapter.name);

  private queue: BullQueue | null = null;
  private worker: BullWorker | null = null;
  private readonly concurrency: number;
  private readonly maxRetries: number;
  private readonly callbacks: JobLifecycleCallbacks;
  /** The resolved connection — either connection details {host,port} or an existing Redis/ioredis-mock instance */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly connection: any;
  private readonly queueName: string;
  private shutdownInitiated = false;

  constructor(
    callbacks: JobLifecycleCallbacks,
    options?: QueueOptions,
  ) {
    this.callbacks = callbacks;
    this.concurrency = options?.concurrency ?? 3;
    this.maxRetries = options?.maxRetries ?? 3;
    // If the caller passed an existing Redis-like instance (has `duplicate`), use it directly.
    // Otherwise treat it as connection details { host, port }.
    const rawConn = options?.connection;
    if (rawConn && typeof (rawConn as Record<string, unknown>).duplicate === 'function') {
      // Pre-existing Redis/ioredis-mock instance — use as-is
      this.connection = rawConn;
    } else {
      const conn = rawConn as { host?: string; port?: string | number } | undefined;
      this.connection = {
        host: conn?.host || process.env.REDIS_HOST || 'localhost',
        port: (conn?.port ? Number(conn.port) : parseInt(process.env.REDIS_PORT || '6379', 10)) || 6379,
      };
    }
    this.queueName = options?.queueName || 'document-generation';

    this.initialize();
  }

  /**
   * Initialize BullMQ Queue and Worker.  Uses dynamic require so the adapter
   * can be imported even when bullmq is not installed (the adapter stays in a
   * "dead" state and all methods become no-ops or throw).
   */
  private initialize(): void {
    try {
      // Dynamic require — bullmq may not be installed
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const BullMQ: { Queue: new (...a: unknown[]) => BullQueue; Worker: new (...a: unknown[]) => BullWorker } = require('bullmq');

      const connection = this.connection;

      this.queue = new BullMQ.Queue(this.queueName, {
        connection,
        defaultJobOptions: {
          attempts: this.maxRetries + 1,
          backoff: { type: 'exponential' as const, delay: 1000 },
          removeOnComplete: { age: 3600 * 24 },
          removeOnFail: { age: 3600 * 24 * 7 },
        },
      } as BullOpts);

      this.worker = new BullMQ.Worker(
        this.queueName,
        async (job: BullJob) => {
          const payload: JobPayload = {
            jobId: job.id || '',
            type: job.name,
            data: (job.data || {}) as Record<string, unknown>,
          };
          return this.callbacks.onProcess(payload);
        },
        {
          connection,
          concurrency: this.concurrency,
        } as BullOpts,
      );

      // Wire up lifecycle events
      this.worker.on('completed', async (job: BullJob, result: unknown) => {
        const jobResult: JobResult = {
          jobId: job.id || '',
          success: true,
          data: result,
        };
        if (job.processedOn) {
          jobResult.durationMs = Date.now() - new Date(job.processedOn).getTime();
        }
        await this.callbacks.onComplete?.(jobResult);
      });

      this.worker.on('failed', async (job: BullJob | null | undefined, error: Error) => {
        if (!job) return;
        // BullMQ fires 'failed' on each retry attempt; we only care about the final one
        if (job.attemptsMade < this.maxRetries + 1 && !job.finishedOn) return;

        const jobResult: JobResult = {
          jobId: job.id || '',
          success: false,
          error: error?.message || 'Unknown error',
        };
        if (job.processedOn) {
          jobResult.durationMs = Date.now() - new Date(job.processedOn).getTime();
        }
        await this.callbacks.onFailed?.(jobResult);
      });

      this.worker.on('progress', async (job: BullJob, progress: unknown) => {
        if (this.callbacks.onProgress && job.id) {
          await this.callbacks.onProgress({
            jobId: job.id,
            progress: typeof progress === 'number' ? progress : 0,
          });
        }
      });

      this.logger.log(
        `BullMQ queue "${this.queueName}" initialized ` +
        `(Redis ${this.connection.host}:${this.connection.port}, ` +
        `concurrency: ${this.concurrency}, maxRetries: ${this.maxRetries})`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to initialize BullMQ queue: ${(error as Error).message}. ` +
        'Make sure bullmq is installed and Redis is running.',
      );
    }
  }

  async add(payload: JobPayload): Promise<void> {
    if (!this.queue) {
      throw new Error('BullMQ queue not initialized. Check logs for initialization errors.');
    }
    await this.queue.add(payload.type, payload.data, {
      jobId: payload.jobId,
      attempts: this.maxRetries + 1,
      backoff: { type: 'exponential', delay: 1000 },
    });
  }

  async addBulk(payloads: JobPayload[]): Promise<void> {
    if (!this.queue) {
      throw new Error('BullMQ queue not initialized. Check logs for initialization errors.');
    }
    await this.queue.addBulk(
      payloads.map((p) => ({
        name: p.type,
        data: p.data,
        opts: {
          jobId: p.jobId,
          attempts: this.maxRetries + 1,
          backoff: { type: 'exponential', delay: 1000 },
        },
      })),
    );
  }

  async getPendingCount(): Promise<number> {
    if (!this.queue) return 0;
    try {
      const counts = await this.queue.getJobCounts('waiting', 'active', 'delayed');
      return (counts.waiting || 0) + (counts.active || 0) + (counts.delayed || 0);
    } catch (error) {
      this.logger.warn(`Failed to get pending count: ${(error as Error).message}`);
      return 0;
    }
  }

  async pause(): Promise<void> {
    await this.worker?.pause();
    await this.queue?.pause();
  }

  async resume(): Promise<void> {
    await this.worker?.resume();
    await this.queue?.resume();
  }

  async onIdle(): Promise<void> {
    if (!this.queue || this.shutdownInitiated) return;
    const poll = async (): Promise<void> => {
      const counts = await this.queue!.getJobCounts('waiting', 'active');
      if ((counts.waiting || 0) === 0 && (counts.active || 0) === 0) return;
      await new Promise((r) => setTimeout(r, 500));
      return poll();
    };
    await poll();
  }

  async shutdown(): Promise<void> {
    this.shutdownInitiated = true;
    const errors: string[] = [];
    if (this.worker) {
      try { await this.worker.close(true); } catch (e) { errors.push(`worker: ${(e as Error).message}`); }
    }
    if (this.queue) {
      try { await this.queue.close(); } catch (e) { errors.push(`queue: ${(e as Error).message}`); }
    }
    if (errors.length > 0) {
      this.logger.warn(`BullMQ shutdown completed with errors: ${errors.join('; ')}`);
    } else {
      this.logger.log('BullMQ queue shut down gracefully');
    }
  }
}
