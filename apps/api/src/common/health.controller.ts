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
    const dbPool = { active: 0, idle: 0, total: 0 };

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbStatus = 'connected';

      // Query PostgreSQL connection pool stats via pg_stat_activity
      try {
        const poolStats = await this.prisma.$queryRaw<
          Array<{ state: string | null; count: bigint }>
        >`SELECT state, COUNT(*)::int as count FROM pg_stat_activity WHERE datname = current_database() GROUP BY state`;

        for (const row of poolStats) {
          if (row.state === 'active') dbPool.active = Number(row.count);
          if (row.state === 'idle') dbPool.idle = Number(row.count);
          dbPool.total += Number(row.count);
        }
      } catch {
        // pg_stat_activity may not be available in all environments
      }
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
        database: {
          status: dbStatus,
          pool: dbPool,
        },
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
          latency: this.auditLogStore.getLatencyPercentiles(),
        },
        apiKeys: {
          active: apiKeys.length,
        },
      },
    };
  }
}