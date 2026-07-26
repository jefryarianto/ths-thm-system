import { Controller, Get, Req, Res, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response, Request } from 'express';
import { Public } from '../decorators/public.decorator';
import { EventBusService } from '../services/event-bus.service';
import type { AuditLogEntry } from '../services/audit.service';
import * as jwt from 'jsonwebtoken';

/**
 * Extracts and verifies a JWT from the request (Bearer header or query param).
 * Returns the decoded payload or null if invalid.
 */
function verifyToken(req: Request): { sub: string; role: string } | null {
  const authHeader = req.headers.authorization;
  const queryToken = req.query.token as string | undefined;

  const rawToken =
    authHeader?.replace('Bearer ', '') || queryToken || '';

  if (!rawToken) return null;

  const secret =
    process.env.JWT_SECRET || (process.env.NODE_ENV === 'test' ? 'test-secret' : '');

  if (!secret) return null;

  try {
    return jwt.verify(rawToken, secret) as { sub: string; role: string };
  } catch {
    return null;
  }
}

/**
 * SSE (Server-Sent Events) controller for real-time audit log streaming.
 *
 * Instead of polling GET /audit-logs, admin clients can connect to
 * GET /audit-logs/stream and receive new audit entries as they happen.
 *
 * Benefits over WebSocket for this use case:
 *  - Standard HTTP — works through all proxies and load balancers
 *  - No extra client library (uses native EventSource API)
 *  - Automatic reconnection built into the browser
 *  - Lighter than a full WebSocket connection
 */
@ApiTags('Audit Logs')
@Controller('audit-logs')
export class AuditSseController {
  private readonly logger = new Logger('AuditSseController');

  /** Track active SSE connections per user to enforce limits */
  private activeConnections = new Map<string, Response[]>();

  constructor(private readonly eventBus: EventBusService) {}

  /**
   * Stream audit log events via Server-Sent Events.
   *
   * Authentication is via Bearer token (Authorization header) or `token` query
   * parameter (since EventSource API doesn't support custom headers — the token
   * should have a short TTL to mitigate exposure in server logs).
   *
   * Only superadmin users are allowed to stream audit events.
   * Max 3 concurrent SSE connections per user.
   *
   * Works behind nginx — requires `proxy_buffering off;` in the nginx config,
   * plus the `X-Accel-Buffering: no` header set below.
   */
  @Get('stream')
  @Public()
  @ApiOperation({
    summary: 'Stream audit log events via SSE (superadmin only)',
    description:
      'Opens a Server-Sent Events connection that pushes new audit log entries ' +
      'in real-time. Requires a valid JWT token via Bearer header or ?token= query param. ' +
      'Only superadmin users are authorized to stream audit events.',
  })
  stream(@Req() req: Request, @Res() res: Response): void {
    const payload = verifyToken(req);

    if (!payload) {
      // Send an error event before closing so the client can stop reconnecting
      res.writeHead(401, { 'Content-Type': 'text/event-stream' });
      res.write(`event: error\ndata: ${JSON.stringify({ code: 'UNAUTHORIZED', message: 'Token tidak valid atau kadaluarsa' })}\n\n`);
      res.end();
      return;
    }

    if (payload.role !== 'superadmin') {
      res.writeHead(403, { 'Content-Type': 'text/event-stream' });
      res.write(`event: error\ndata: ${JSON.stringify({ code: 'FORBIDDEN', message: 'Hanya superadmin yang bisa streaming audit log' })}\n\n`);
      res.end();
      return;
    }

    // Enforce max connections per user
    const userConnections = this.activeConnections.get(payload.sub) || [];
    if (userConnections.length >= 3) {
      res.writeHead(429, { 'Content-Type': 'text/event-stream' });
      res.write(`event: error\ndata: ${JSON.stringify({ code: 'TOO_MANY_CONNECTIONS', message: 'Max 3 koneksi SSE per user' })}\n\n`);
      res.end();
      return;
    }

    // ── SSE Headers ──
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    res.flushHeaders();

    // Track this connection
    userConnections.push(res);
    this.activeConnections.set(payload.sub, userConnections);

    // Send an initial connection event so the client knows it's connected
    res.write(`event: connected\ndata: ${JSON.stringify({ userId: payload.sub, timestamp: new Date().toISOString() })}\n\n`);

    this.logger.log(`SSE client connected: user=${payload.sub} (active: ${userConnections.length})`);

    // ── Listen for audit events ──
    const onAuditEvent = (entry: unknown) => {
      try {
        const auditEntry = entry as AuditLogEntry;
        res.write(`event: audit:new\ndata: ${JSON.stringify(auditEntry)}\n\n`);
      } catch {
        // skip malformed events
      }
    };

    // Keep-alive heartbeat to prevent proxy timeouts
    const heartbeat = setInterval(() => {
      try {
        res.write(`:heartbeat\n\n`);
      } catch {
        clearInterval(heartbeat);
      }
    }, 15_000);

    this.eventBus.on('audit:new', onAuditEvent);

    // ── Cleanup on disconnect (using res.on('close') for better proxy compatibility) ──
    const cleanup = () => {
      this.eventBus.off('audit:new', onAuditEvent);
      clearInterval(heartbeat);

      // Remove from active connections tracking
      const conns = this.activeConnections.get(payload.sub);
      if (conns) {
        const idx = conns.indexOf(res);
        if (idx !== -1) conns.splice(idx, 1);
        if (conns.length === 0) this.activeConnections.delete(payload.sub);
      }

      this.logger.log(`SSE client disconnected: user=${payload.sub}`);
    };

    res.on('close', cleanup);
    req.on('close', cleanup); // fallback for environments where res.on('close') isn't reliable
  }

  /**
   * Get the number of active SSE connections per user (for monitoring).
   */
  getActiveConnectionCount(): number {
    let total = 0;
    this.activeConnections.forEach((conns) => (total += conns.length));
    return total;
  }
}
