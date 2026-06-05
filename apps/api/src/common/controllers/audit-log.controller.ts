import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'Query audit log entries (superadmin only)' })
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
  @ApiOperation({ summary: 'Get audit log statistics (superadmin only)' })
  getStats() {
    return this.store.getStats();
  }
}
