import { Module, OnModuleInit, OnModuleDestroy, Logger, INestApplication } from '@nestjs/common';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import type { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { QueueStatsController } from './queue-stats.controller';

/** Minimal interface for the BullMQ Queue methods used by the dashboard. */
interface BullMqQueueLike {
  getJobCounts(...types: string[]): Promise<Record<string, number>>;
  isPaused(): Promise<boolean>;
  getName(): string;
  close(): Promise<void>;
}

/**
 * NestJS module that integrates Bull Board queue monitoring at /api/admin/queues.
 *
 * Dashboard is active only when:
 *   - USE_BULLMQ=true (BullMQ adapter selected)
 *   - bullmq package is installed
 *   - Redis is reachable
 *
 * When these conditions are not met, the dashboard route returns a JSON message.
 *
 * Authentication: JWT Bearer token (same secret as API). Only admin/super_admin roles.
 *
 * Mounting:
 *   Call `QueueDashboardModule.setup()` in main.ts AFTER `NestFactory.create()`:
 *     const app = await NestFactory.create(AppModule);
 *     QueueDashboardModule.setup(app);
 *
 * This mounts the Bull Board dashboard at /api/admin/queues.
 */
@Module({
  controllers: [QueueStatsController],
})
export class QueueDashboardModule implements OnModuleInit, OnModuleDestroy {
  private static readonly logger = new Logger(QueueDashboardModule.name);
  private static serverAdapter: ExpressAdapter | null = null;
  private static boardInitialized = false;
  /** Reference to the BullMQ Queue so we can close it on shutdown. */
  private static documentQueue: BullMqQueueLike | null = null;

  /**
   * Mount the Bull Board dashboard on the NestJS Express app.
   * Must be called after NestFactory.create() in main.ts.
   */
  static setup(app: INestApplication): void {
    const expressApp = app.getHttpAdapter().getInstance() as import('express').Application;

    // ── JWT auth middleware ──────────────────────────────
    const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ message: 'Unauthorized — missing Bearer token' });
        return;
      }

      const token = authHeader.slice(7);
      try {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
          res.status(500).json({ message: 'JWT_SECRET not configured' });
          return;
        }

        const decoded = jwt.verify(token, secret) as { sub?: string; role?: string };
        if (!decoded.sub) {
          res.status(401).json({ message: 'Invalid token payload' });
          return;
        }

        // Only allow admin-level roles (matching the role names used in the API)
        const allowedRoles = ['superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting'];
        if (!decoded.role || !allowedRoles.includes(decoded.role)) {
          res.status(403).json({ message: 'Forbidden — admin access required' });
          return;
        }

        // Attach user info for downstream use          (req as unknown as Record<string, unknown>).user = decoded;
        next();
      } catch (err) {
        const message = (err as Error).name === 'TokenExpiredError'
          ? 'Token expired'
          : 'Invalid token';
        res.status(401).json({ message });
      }
    };

    // ── Mount the dashboard or a fallback route ──────────
    if (QueueDashboardModule.boardInitialized && QueueDashboardModule.serverAdapter) {
      expressApp.use(
        '/api/admin/queues',
        authMiddleware,
        QueueDashboardModule.serverAdapter.getRouter(),
      );
      QueueDashboardModule.logger.log(
        'Bull Board dashboard mounted at /api/admin/queues (JWT auth required)',
      );
    } else {
      expressApp.use('/api/admin/queues', (_req: Request, res: Response) => {
        const reason = process.env.USE_BULLMQ !== 'true'
          ? 'USE_BULLMQ is not set to true. Enable BullMQ to use the dashboard.'
          : 'BullMQ packages could not be loaded. Make sure bullmq is installed and Redis is running.';
        res.json({ message: 'Bull Board dashboard is not available.', reason, queues: [] });
      });
      QueueDashboardModule.logger.log(
        'Bull Board dashboard skipped (USE_BULLMQ != true or BullMQ unavailable). ' +
        'Set USE_BULLMQ=true and ensure Redis is running to enable queue monitoring.',
      );
    }
  }

  /**
   * Initialize the Bull Board server adapter and register the document-generation queue.
   * Called automatically by NestJS during module initialization.
   */
  onModuleInit() {
    if (process.env.USE_BULLMQ !== 'true') return;

    try {
      // Dynamic require — bullmq may not be installed
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { Queue } = require('bullmq');

      const adapter = new ExpressAdapter();
      adapter.setBasePath('/api/admin/queues');

      const connection = {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
      };

      const documentQueue = new Queue('document-generation', { connection });
      QueueDashboardModule.documentQueue = documentQueue;

      createBullBoard({
        queues: [new BullMQAdapter(documentQueue)],
        serverAdapter: adapter,
      });

      QueueDashboardModule.serverAdapter = adapter;
      QueueDashboardModule.boardInitialized = true;

      QueueDashboardModule.logger.log(
        `Bull Board dashboard initialized for queue "document-generation" ` +
        `(Redis ${connection.host}:${connection.port})`,
      );
    } catch (error) {
      QueueDashboardModule.logger.warn(
        `Bull Board initialization failed: ${(error as Error).message}. ` +
        'Dashboard route will show an informational message.',
      );
    }
  }

  /**
   * Close the BullMQ Queue connection when the NestJS app shuts down.
   * Prevents orphaned Redis connections.
   */
  /**
   * Get the BullMQ Queue instance for the document-generation queue.
   * Returns null if BullMQ is not active or not initialized.
   */
  static getDocumentQueue(): BullMqQueueLike | null {
    return QueueDashboardModule.documentQueue;
  }

  /**
   * Close the BullMQ Queue connection when the NestJS app shuts down.
   * Prevents orphaned Redis connections.
   */
  onModuleDestroy() {
    if (QueueDashboardModule.documentQueue) {
      QueueDashboardModule.documentQueue.close().catch(() => {});
      QueueDashboardModule.documentQueue = null;
    }
  }
}
