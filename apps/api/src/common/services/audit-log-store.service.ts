import { Injectable } from '@nestjs/common';
import { AuditLogEntry } from './audit.service';

/**
 * Maximum number of audit log entries to keep in memory.
 * Oldest entries are evicted when this limit is reached.
 */
const MAX_ENTRIES = 10_000;

/**
 * In-memory store for audit log entries.
 *
 * Captures structured audit events from AuditService for querying
 * via the /audit-logs endpoint. Designed for operational visibility
 * — not a replacement for persistent log aggregation (ELK, CloudWatch).
 *
 * Oldest entries are evicted when MAX_ENTRIES is reached.
 */
@Injectable()
export class AuditLogStore {
  private entries: AuditLogEntry[] = [];

  /**
   * Add an audit log entry to the store.
   */
  add(entry: AuditLogEntry): void {
    this.entries.push(entry);

    // Evict oldest entries if over limit
    if (this.entries.length > MAX_ENTRIES) {
      this.entries = this.entries.slice(this.entries.length - MAX_ENTRIES);
    }
  }

  /**
   * Query audit log entries with optional filters and pagination.
   */
  query(filters?: {
    eventType?: string;
    userId?: string;
    userRole?: string;
    method?: string;
    path?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }): { data: AuditLogEntry[]; total: number } {
    let filtered = [...this.entries];

    if (filters?.eventType) {
      filtered = filtered.filter((e) => e.eventType === filters.eventType);
    }
    if (filters?.userId) {
      filtered = filtered.filter((e) => e.userId === filters.userId);
    }
    if (filters?.userRole) {
      filtered = filtered.filter((e) => e.userRole === filters.userRole);
    }
    if (filters?.method) {
      filtered = filtered.filter((e) => e.method === filters.method);
    }
    if (filters?.path) {
      filtered = filtered.filter((e) => e.path.includes(filters.path!));
    }
    if (filters?.startDate) {
      const start = new Date(filters.startDate).getTime();
      filtered = filtered.filter((e) => new Date(e.timestamp).getTime() >= start);
    }
    if (filters?.endDate) {
      const end = new Date(filters.endDate).getTime();
      filtered = filtered.filter((e) => new Date(e.timestamp).getTime() <= end);
    }

    // Sort newest first
    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const total = filtered.length;
    const limit = filters?.limit ?? 50;
    const offset = filters?.offset ?? 0;
    const data = filtered.slice(offset, offset + limit);

    return { data, total };
  }

  /**
   * Get summary statistics of audit events.
   */
  getStats(): {
    total: number;
    byEventType: Record<string, number>;
    byRole: Record<string, number>;
    recentViolations: number;
  } {
    const byEventType: Record<string, number> = {};
    const byRole: Record<string, number> = {};
    let recentViolations = 0;

    const oneHourAgo = Date.now() - 60 * 60 * 1000;

    for (const entry of this.entries) {
      byEventType[entry.eventType] = (byEventType[entry.eventType] || 0) + 1;
      if (entry.userRole) {
        byRole[entry.userRole] = (byRole[entry.userRole] || 0) + 1;
      }
      if (
        entry.eventType === 'SCOPE_VIOLATION' &&
        new Date(entry.timestamp).getTime() >= oneHourAgo
      ) {
        recentViolations++;
      }
    }

    return {
      total: this.entries.length,
      byEventType,
      byRole,
      recentViolations,
    };
  }

  /**
   * Get the current number of entries in the store.
   */
  get size(): number {
    return this.entries.length;
  }
}
