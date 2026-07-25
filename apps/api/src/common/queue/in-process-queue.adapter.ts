import { Logger } from '@nestjs/common';
import {
  IJobQueue,
  JobPayload,
  JobResult,
  JobLifecycleCallbacks,
  QueueOptions,
} from './queue.interface';

/**
 * In-process queue adapter with concurrency control.
 *
 * - No external dependencies (no Redis required)
 * - Jobs are processed in-process with configurable concurrency
 * - NOT persistent — jobs are lost on server restart
 * - Suitable for dev, staging, or small-scale deployments
 * - Perfect for Phase 1; swap to BullMQ adapter for production
 */
export class InProcessQueueAdapter implements IJobQueue {
  private readonly logger = new Logger(InProcessQueueAdapter.name);
  private readonly queue: JobPayload[] = [];
  private activeCount = 0;
  private paused = false;
  private drainResolve: (() => void) | null = null;
  private drainPromise: Promise<void> | null = null;

  private readonly concurrency: number;
  private readonly maxRetries: number;
  private readonly callbacks: JobLifecycleCallbacks;

  // Retry tracking: jobId → retry count
  private retryMap = new Map<string, number>();

  // Job result tracking for Promise-based completion
  private pendingJobs = new Map<
    string,
    { resolve: (r: JobResult) => void; reject: (e: Error) => void }
  >();

  constructor(
    callbacks: JobLifecycleCallbacks,
    options?: QueueOptions,
  ) {
    this.callbacks = callbacks;
    this.concurrency = options?.concurrency ?? 3;
    this.maxRetries = options?.maxRetries ?? 3;
  }

  async add(payload: JobPayload): Promise<void> {
    this.queue.push(payload);
    this.processNext();
  }

  async addBulk(payloads: JobPayload[]): Promise<void> {
    // Chunk to avoid blocking the event loop
    for (const p of payloads) {
      this.queue.push(p);
    }
    // Kick off processing for up to concurrency slots
    for (let i = 0; i < this.concurrency; i++) {
      this.processNext();
    }
  }

  /**
   * Wait for all pending jobs to complete (useful for testing).
   */
  async onIdle(): Promise<void> {
    if (this.queue.length === 0 && this.activeCount === 0) return;
    this.drainPromise = new Promise((resolve) => {
      this.drainResolve = resolve;
    });
    return this.drainPromise;
  }

  async getPendingCount(): Promise<number> {
    return this.queue.length + this.activeCount;
  }

  async pause(): Promise<void> {
    this.paused = true;
  }

  async resume(): Promise<void> {
    this.paused = false;
    this.processNext();
  }

  async shutdown(): Promise<void> {
    this.queue.length = 0;
    this.activeCount = 0;
    this.retryMap.clear();
    this.pendingJobs.clear();
  }

  private processNext(): void {
    if (this.paused) return;
    if (this.activeCount >= this.concurrency) return;
    if (this.queue.length === 0) {
      // Check drain when nothing is pending
      if (this.activeCount === 0 && this.drainResolve) {
        this.drainResolve();
        this.drainResolve = null;
        this.drainPromise = null;
      }
      return;
    }

    const payload = this.queue.shift()!;
    this.activeCount++;

    const startTime = Date.now();

    // Process in microtask to avoid blocking
    Promise.resolve()
      .then(() => this.callbacks.onProcess(payload))
      .then((result: JobResult) => {
        result.durationMs = Date.now() - startTime;
        this.activeCount--;

        if (result.success) {
          this.retryMap.delete(payload.jobId);
          this.callbacks.onComplete?.(result);
          this.resolveJob(payload.jobId, result);
        } else {
          // Retry logic
          const retryCount = (this.retryMap.get(payload.jobId) ?? 0) + 1;
          if (retryCount <= this.maxRetries) {
            this.retryMap.set(payload.jobId, retryCount);
            const delay = Math.min(1000 * Math.pow(5, retryCount - 1), 25000); // 1s, 5s, 25s
            this.logger.warn(
              `Job ${payload.jobId} failed (attempt ${retryCount}/${this.maxRetries}), retrying in ${delay}ms: ${result.error}`,
            );
            setTimeout(() => {
              this.queue.unshift(payload);
              this.processNext();
            }, delay);
          } else {
            this.retryMap.delete(payload.jobId);
            this.logger.error(
              `Job ${payload.jobId} failed after ${this.maxRetries} attempts: ${result.error}`,
            );
            this.callbacks.onFailed?.(result);
            this.rejectJob(payload.jobId, new Error(result.error || 'Max retries exceeded'));
          }
        }

        this.processNext();
      })
      .catch((error: Error) => {
        this.activeCount--;
        const result: JobResult = {
          jobId: payload.jobId,
          success: false,
          error: error.message,
          durationMs: Date.now() - startTime,
        };
        this.callbacks.onFailed?.(result);
        this.rejectJob(payload.jobId, error);
        this.processNext();
      });
  }

  /**
   * Wrap single job processing in a Promise for caller convenience.
   */
  runJob(payload: JobPayload): Promise<JobResult> {
    return new Promise((resolve, reject) => {
      this.pendingJobs.set(payload.jobId, { resolve, reject });
      this.add(payload);
    });
  }

  private resolveJob(jobId: string, result: JobResult): void {
    const pending = this.pendingJobs.get(jobId);
    if (pending) {
      pending.resolve(result);
      this.pendingJobs.delete(jobId);
    }
  }

  private rejectJob(jobId: string, error: Error): void {
    const pending = this.pendingJobs.get(jobId);
    if (pending) {
      pending.reject(error);
      this.pendingJobs.delete(jobId);
    }
  }
}
