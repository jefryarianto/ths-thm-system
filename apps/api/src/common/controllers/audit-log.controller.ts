import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { Roles } from '../decorators/roles.decorator';
import { RequireScope } from '../decorators/scope.decorator';
import { AuditLogStore } from '../services/audit-log-store.service';
import { AuditLogQueryDto } from '../dto/audit-log-query.dto';

/**
 * Controller for querying audit log entries.
 *
 * Restricted to superadmin only (national scope).
 * Provides endpoints for viewing scope violations, data access,
 * and mutation events for operational visibility and compliance.
 */
@ApiTags('Audit Logs')
@ApiBearerAuth()
@Controller('audit-logs')
export class AuditLogController {
  constructor(private readonly store: AuditLogStore) {}

  /**
   * Query audit log entries with optional filters.
   * Returns newest entries first with pagination.
   */
  @Get()
  @Roles('superadmin')
  @RequireScope('national')
  @ApiOperation({ summary: 'Query audit log entries (superadmin only)', description: 'Returns paginated audit log entries with optional filters (eventType, userId, role, method, path, date range). Newest entries first.' })
  @ApiOkResponse({ description: 'Paginated audit log entries with total count' })
  findAll(@Query() query: AuditLogQueryDto) {
    return this.store.query({
      eventType: query.eventType,
      userId: query.userId,
      userRole: query.userRole,
      method: query.method,
      path: query.path,
      startDate: query.startDate,
      endDate: query.endDate,
      limit: query.limit,
      offset: query.offset,
    });
  }

  /**
   * Get audit log summary statistics.
   */
  @Get('stats')
  @Roles('superadmin')
  @RequireScope('national')
  @ApiOperation({ summary: 'Get audit log statistics (superadmin only)', description: 'Returns total entry count, breakdown by event type and role, plus recent scope violation count (last hour).' })
  @ApiOkResponse({ description: 'Audit log statistics with event type and role breakdowns' })
  getStats() {
    return this.store.getStats();
  }

  /**
   * Export audit log entries as CSV.
   * Supports the same filters as the query endpoint.
   * Returns a CSV file download with all matching entries (no pagination limit).
   */
  @Get('export')
  @Roles('superadmin')
  @RequireScope('national')
  @ApiOperation({ summary: 'Export audit logs as CSV (superadmin only)', description: 'Downloads all matching entries as a CSV file (max 5000 entries). Supports the same filters as the query endpoint.' })
  exportCsv(@Query() query: AuditLogQueryDto, @Res() res: Response) {
    const entries = this.store.queryAll({
      eventType: query.eventType,
      userId: query.userId,
      userRole: query.userRole,
      method: query.method,
      path: query.path,
      startDate: query.startDate,
      endDate: query.endDate,
    });

    const headers = [
      'Timestamp',
      'Event Type',
      'User ID',
      'User Email',
      'User Role',
      'Method',
      'Path',
      'Status Code',
      'Duration (ms)',
      'Details',
    ];

    const rows = entries.map((e) => [
      e.timestamp,
      e.eventType,
      e.userId || '',
      e.userEmail || '',
      e.userRole || '',
      e.method,
      e.path,
      e.statusCode?.toString() || '',
      e.durationMs?.toString() || '',
      e.details ? JSON.stringify(e.details) : '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => {
          // Escape CSV cells that contain commas, quotes, or newlines
          const str = String(cell);
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        }).join(','),
      ),
    ].join('\n');

    const filename = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
  }
}
