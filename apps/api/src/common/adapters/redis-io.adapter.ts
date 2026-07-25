import { IoAdapter } from '@nestjs/platform-socket.io';
import { Server, ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { Logger } from '@nestjs/common';

/**
 * Socket.IO adapter backed by Redis (Pub/Sub).
 *
 * Enables **horizontal scaling** and **resilience to container restarts**:
 * - When one API instance goes down, its WebSocket state is NOT lost —
 *   the Redis adapter keeps rooms and sessions in Redis.
 * - Other instances can pick up disconnected clients seamlessly.
 * - After a container restart, the new instance reconnects to Redis and
 *   immediately resumes serving existing rooms / user mappings.
 *
 * Falls back gracefully to the built-in in-memory adapter when
 * `REDIS_URL` is not set (dev/staging).
 */
export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);

  private pubClient: Redis | null = null;
  private subClient: Redis | null = null;

  createIOServer(port: number, options?: ServerOptions): Server {
    const server = super.createIOServer(port, options);

    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      this.logger.log('REDIS_URL not set — using in-memory Socket.IO adapter');
      return server;
    }

    try {
      this.pubClient = new Redis(redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: 3,
        retryStrategy(times: number) {
          if (times > 5) return null;
          return Math.min(times * 200, 2_000);
        },
        connectTimeout: 5_000,
        commandTimeout: 3_000,
      });

      this.subClient = this.pubClient.duplicate();

      this.pubClient.on('error', (err) => {
        this.logger.warn(`Redis adapter (pub) error: ${err.message}`);
      });

      this.subClient.on('error', (err) => {
        this.logger.warn(`Redis adapter (sub) error: ${err.message}`);
      });

      // Both clients must be connected before creating the adapter
      Promise.all([this.pubClient.connect(), this.subClient.connect()])
        .then(() => {
          server.adapter(createAdapter(this.pubClient!, this.subClient!));
          this.logger.log('🔌 Socket.IO Redis adapter attached');
        })
        .catch((err: Error) => {
          this.logger.warn(
            `Socket.IO Redis adapter connect failed (${err.message}) — using in-memory adapter`,
          );
        });
    } catch (err) {
      this.logger.warn(
        `Socket.IO Redis adapter init error (${(err as Error).message}) — using in-memory adapter`,
      );
    }

    return server;
  }

  /**
   * Clean up Redis connections when the adapter is disposed.
   * Called by NestJS lifecycle during shutdown.
   */
  async dispose(): Promise<void> {
    if (this.subClient) {
      this.subClient.disconnect();
      this.subClient = null;
    }
    if (this.pubClient) {
      this.pubClient.disconnect();
      this.pubClient = null;
    }
    super.dispose();
  }
}
