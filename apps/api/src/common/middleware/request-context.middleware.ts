import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { createRequestId, requestContextStore } from '../utils/request-context';
import { structuredLog } from '../utils/structured-logger';

/**
 * Middleware global: menetapkan `X-Request-Id` (terima dari client bila valid,
 * selain itu generate UUID), membungkus request di AsyncLocalStorage, dan
 * menulis satu baris log JSON terstruktur per request (method, path, status,
 * durasi, requestId, userId bila terautentikasi).
 */
@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const requestId = createRequestId(req.headers['x-request-id'] as string | undefined);
    const startedAt = Date.now();

    res.setHeader('X-Request-Id', requestId);

    const ctx = { requestId, startedAt };

    requestContextStore.run(ctx, () => {
      res.on('finish', () => {
        const durationMs = Date.now() - startedAt;
        const authHeader = req.headers.authorization || '';
        const requestCtx = requestContextStore.getStore();
        structuredLog('info', 'request', {
          requestId,
          context: 'http',
          method: req.method,
          path: req.originalUrl || req.url,
          status: res.statusCode,
          durationMs,
          ip: req.ip,
          userAgent: req.get('user-agent'),
          userId: requestCtx?.userId ?? undefined,
          auth: authHeader ? 'bearer' : undefined,
        });
      });

      next();
    });
  }
}