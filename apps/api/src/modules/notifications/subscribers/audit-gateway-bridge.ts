import { Injectable, Logger } from '@nestjs/common';

/**
 * Audit event streaming has been migrated from WebSocket broadcast to
 * Server-Sent Events (SSE) via AuditSseController (GET /audit-logs/stream).
 *
 * SSE is superior for the audit use case because:
 *  - Native EventSource API in browsers — no extra client library
 *  - Works through all proxies and load balancers without special config
 *  - Automatic reconnection built into the browser
 *  - Lighter than a full WebSocket connection
 *
 * This bridge is kept as a no-op stub to avoid breaking the DI chain
 * in NotificationsModule. It can be removed after the next deployment
 * cycle when all clients have migrated to SSE.
 */
@Injectable()
export class AuditGatewayBridge {
  private readonly logger = new Logger('AuditGatewayBridge');

  constructor() {
    this.logger.log(
      'AuditGatewayBridge: audit streaming has moved to SSE (GET /audit-logs/stream). ' +
        'This WebSocket bridge is disabled.',
    );
  }
}
