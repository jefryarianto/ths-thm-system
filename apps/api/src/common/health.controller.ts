import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from './decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from './services/cache.service';
import { AuditLogStore } from './services/audit-log-store.service';
import { ApiKeyStore } from './guards/api-key.guard';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly auditLogStore: AuditLogStore,
    private readonly apiKeyStore: ApiKeyStore,
  ) {}

  @Get()
  @Public()
  async check() {
    let dbStatus = 'disconnected';

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbStatus = 'connected';
    } catch {
      dbStatus = 'disconnected';
    }

    const cacheStats = this.cache.getStats();
    const auditStats = this.auditLogStore.getStats();
    const apiKeys = this.apiKeyStore.getAll();

    return {
      success: true,
      data: {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: dbStatus,
        memory: {
          heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
          heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB',
        },
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        cache: {
          entries: cacheStats.size,
          maxEntries: 1000,
        },
        auditLog: {
          totalEntries: auditStats.total,
          recentViolations: auditStats.recentViolations,
        },
        apiKeys: {
          active: apiKeys.length,
        },
      },
    };
  }
}