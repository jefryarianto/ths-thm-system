import { Injectable, Logger } from '@nestjs/common';
import { AuditLogStore } from './audit-log-store.service';

/**
 * Audit event types for classification.
 */
export enum AuditEventType {
  SCOPE_VIOLATION = 'SCOPE_VIOLATION',
  DATA_ACCESS = 'DATA_ACCESS',
  DATA_MUTATION = 'DATA_MUTATION',
  AUTH_FAILURE = 'AUTH_FAILURE',
}

/**
 * Structure of an audit log entry.
 */
export interface AuditLogEntry {
  timestamp: string;
  eventType: AuditEventType;
  userId?: string;
  userEmail?: string;
  userRole?: string;
  userScope?: {
    rantingId?: string;
    wilayahId?: string;
    distrikId?: string;
  };
  method: string;
  path: string;
  statusCode?: number;
  durationMs?: number;
  details?: Record<string, unknown>;
}

/**
 * Centralized audit logging service.
 *
 * Provides structured JSON logging for:
 * - Scope violations (access denied due to insufficient scope level)
 * - Data access events (read/mutation operations)
 * - Authentication failures
 *
 * Logs are output in structured JSON format for easy ingestion by
 * log aggregation tools (ELK, Datadog, CloudWatch, etc.)
 *
 * Also stores entries in AuditLogStore for querying via /audit-logs endpoint.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger('Audit');

  constructor(private readonly store: AuditLogStore) {}

  /**
   * Log a scope violation (access denied by ScopeGuard).
   */
  logScopeViolation(params: {
    userId?: string;
    userEmail?: string;
    userRole?: string;
    userScope?: { rantingId?: string; wilayahId?: string; distrikId?: string };
    requiredScope: string;
    method: string;
    path: string;
    ip?: string;
  }): void {
    const entry: AuditLogEntry = {
      timestamp: new Date().toISOString(),
      eventType: AuditEventType.SCOPE_VIOLATION,
      userId: params.userId,
      userEmail: params.userEmail,
      userRole: params.userRole,
      userScope: params.userScope,
      method: params.method,
      path: params.path,
      details: {
        requiredScope: params.requiredScope,
        ip: params.ip,
        reason: 'Insufficient scope level for endpoint',
      },
    };

    this.logger.warn(
      `[SCOPE_VIOLATION] User ${params.userEmail || 'unknown'} (${params.userRole || 'unknown'}) ` +
      `denied access to ${params.method} ${params.path} ` +
      `(required: ${params.requiredScope})`,
    );

    this.logger.log(JSON.stringify(entry));
    this.store.add(entry);
  }

  /**
   * Log a successful data access event (read).
   */
  logDataAccess(params: {
    userId?: string;
    userEmail?: string;
    userRole?: string;
    method: string;
    path: string;
    statusCode: number;
    durationMs: number;
    details?: Record<string, unknown>;
  }): void {
    const entry: AuditLogEntry = {
      timestamp: new Date().toISOString(),
      eventType: AuditEventType.DATA_ACCESS,
      userId: params.userId,
      userEmail: params.userEmail,
      userRole: params.userRole,
      method: params.method,
      path: params.path,
      statusCode: params.statusCode,
      durationMs: params.durationMs,
      details: params.details,
    };

    this.logger.debug(JSON.stringify(entry))
    // Note: DATA_ACCESS events are logged but not stored to avoid
    // flooding the in-memory buffer. Only mutations, violations,
    // and auth failures are stored for querying.
  }

  /**
   * Log a data mutation event (create/update/delete).
   */
  logDataMutation(params: {
    userId?: string;
    userEmail?: string;
    userRole?: string;
    method: string;
    path: string;
    statusCode: number;
    durationMs: number;
    details?: Record<string, unknown>;
  }): void {
    const entry: AuditLogEntry = {
      timestamp: new Date().toISOString(),
      eventType: AuditEventType.DATA_MUTATION,
      userId: params.userId,
      userEmail: params.userEmail,
      userRole: params.userRole,
      method: params.method,
      path: params.path,
      statusCode: params.statusCode,
      durationMs: params.durationMs,
      details: params.details,
    };

    this.logger.log(JSON.stringify(entry));
    this.store.add(entry);
  }

  /**
   * Log an authentication failure.
   */
  logAuthFailure(params: {
    method: string;
    path: string;
    reason: string;
    ip?: string;
  }): void {
    const entry: AuditLogEntry = {
      timestamp: new Date().toISOString(),
      eventType: AuditEventType.AUTH_FAILURE,
      method: params.method,
      path: params.path,
      details: {
        reason: params.reason,
        ip: params.ip,
      },
    };

    this.logger.warn(
      `[AUTH_FAILURE] ${params.method} ${params.path} — ${params.reason}`,
    );

    this.logger.log(JSON.stringify(entry));
    this.store.add(entry);
  }
}
