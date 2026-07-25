/**
 * Queue interface abstraction for async job processing.
 *
 * Allows swapping between in-process queue (dev/staging) and
 * BullMQ (production) without changing business logic.
 */

export interface JobPayload {
  /** Unique job identifier */
  jobId: string;
  /** Job type for routing */
  type: string;
  /** Arbitrary payload data */
  data: Record<string, unknown>;
}

export interface JobResult {
  jobId: string;
  success: boolean;
  data?: unknown;
  error?: string;
  durationMs?: number;
}

export interface JobProgress {
  jobId: string;
  progress: number; // 0–100
}

export interface QueueOptions {
  /** Max concurrent jobs (default: 3) */
  concurrency?: number;
  /** Max retry attempts (default: 3) */
  maxRetries?: number;
  /** Delay between retries in ms (default: exponential 1s, 5s, 25s) */
  retryDelayMs?: number;
  /** Redis connection for BullMQ adapter.
   * - `{ host, port }` — connection details (default: localhost:6379)
   * - An existing Redis/ioredis-mock instance (duck-typed via `duplicate` method) */
  /** Redis connection for BullMQ adapter.
   * - `{ host, port }` — connection details (default: localhost:6379)
   * - An existing Redis/ioredis-mock instance (duck-typed via `duplicate` method) */
  connection?: { host: string; port: number } | { duplicate: () => unknown };
  /** Queue name for BullMQ (default: 'document-generation') */
  queueName?: string;
}

export interface IJobQueue {
  /** Add a single job to the queue */
  add(payload: JobPayload): Promise<void>;

  /** Add multiple jobs at once */
  addBulk(payloads: JobPayload[]): Promise<void>;

  /** Get the number of pending jobs */
  getPendingCount(): Promise<number>;

  /** Pause job processing */
  pause(): Promise<void>;

  /** Resume job processing */
  resume(): Promise<void>;

  /** Wait for all pending jobs to drain (useful for testing) */
  onIdle?(): Promise<void>;

  /** Clean up resources */
  shutdown(): Promise<void>;
}

/**
 * Callback types for job lifecycle events.
 * These are set by the service that owns the queue.
 */
export interface JobLifecycleCallbacks {
  onProcess: (payload: JobPayload) => Promise<JobResult>;
  onProgress?: (progress: JobProgress) => Promise<void>;
  onComplete?: (result: JobResult) => Promise<void>;
  onFailed?: (result: JobResult) => Promise<void>;
}
