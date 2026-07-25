import { Controller, Get, Header, Logger } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { QueueDashboardModule } from './queue-dashboard.module';

export interface RecentJob {
  id: string;
  memberId: string;
  memberName: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string | null;
  nomorDokumen?: string | null;
  createdAt: string;
  completedAt?: string | null;
}

/**
 * REST endpoint returning queue job counts and metrics as JSON.
 *
 * Two data sources depending on the active queue adapter:
 *   1. BullMQ (USE_BULLMQ=true) — real-time counts from Redis via Queue.getJobCounts()
 *   2. In-process queue (default) — counts derived from the DocumentJob Prisma table
 *
 * Access: Requires JWT auth with superadmin or admin_distrik role.
 */
@ApiTags('Admin / Queue')
@Controller('admin/queue-stats')
export class QueueStatsController {
  private readonly logger = new Logger(QueueStatsController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get queue metrics as JSON',
    description:
      'Returns job counts and status for the document-generation queue. ' +
      'When BullMQ is active, counts come from Redis in real time. ' +
      'Otherwise, counts are derived from the DocumentJob database records.',
  })
  @Roles('superadmin', 'admin_distrik')
  async getStats(): Promise<{
    success: boolean;
    data: {
      queueName: string;
      queueType: 'bullmq' | 'in-process';
      counts: Record<string, number>;
      isPaused?: boolean;
      oldestJobAge?: number;
      recentJobRate?: { last1h: number; last24h: number };
      recentJobs: RecentJob[];
    };
  }> {
    const bullmqQueue = QueueDashboardModule.getDocumentQueue();

    if (bullmqQueue) {
      return this.getBullMqStats(bullmqQueue);
    }

    return this.getInProcessStats();
  }

  /**
   * Fetch the latest completed/failed DocumentJob records with their
   * corresponding Anggota member names. Used by both BullMQ and in-process
   * stats paths since the DocumentJob table is populated regardless of
   * the active queue adapter.
   */
  private async fetchRecentJobs(limit = 50): Promise<RecentJob[]> {
    try {
      const jobs = await this.prisma.documentJob.findMany({
        where: { status: { in: ['completed', 'failed'] } },
        orderBy: { completedAt: 'desc' },
        take: limit,
      });

      if (jobs.length === 0) return [];

      // Batch-fetch member names
      const memberIds = [...new Set(jobs.map((j) => j.memberId))];
      const members = await this.prisma.anggota.findMany({
        where: { id: { in: memberIds } },
        select: { id: true, namaLengkap: true },
      });
      const nameMap = new Map(members.map((m) => [m.id, m.namaLengkap]));

      return jobs.map((j) => ({
        id: j.id,
        memberId: j.memberId,
        memberName: nameMap.get(j.memberId) || 'Unknown',
        status: j.status as RecentJob['status'],
        error: j.error,
        nomorDokumen: j.nomorDokumen,
        createdAt: j.createdAt.toISOString(),
        completedAt: j.completedAt?.toISOString() || null,
      }));
    } catch (error) {
      this.logger.error(`Failed to fetch recent jobs: ${(error as Error).message}`);
      return [];
    }
  }

  /**
   * Return real-time stats from BullMQ Queue.getJobCounts().
   */
  private async getBullMqStats(
    queue: NonNullable<ReturnType<typeof QueueDashboardModule.getDocumentQueue>>,
  ): Promise<{
    success: boolean;
    data: {
      queueName: string;
      queueType: 'bullmq';
      counts: Record<string, number>;
      isPaused: boolean;
      oldestJobAge?: number;
      recentJobs: RecentJob[];
    };
  }> {
    const [counts, isPaused, recentJobs] = await Promise.all([
      queue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed', 'paused'),
      queue.isPaused(),
      this.fetchRecentJobs(),
    ]);

    return {
      success: true,
      data: {
        queueName: 'document-generation',
        queueType: 'bullmq',
        counts: {
          waiting: counts.waiting ?? 0,
          active: counts.active ?? 0,
          completed: counts.completed ?? 0,
          failed: counts.failed ?? 0,
          delayed: counts.delayed ?? 0,
          paused: counts.paused ?? 0,
        },
        isPaused,
        recentJobs,
      },
    };
  }

  /**
   * Return queue stats derived from the DocumentJob Prisma table.
   * Used when the in-process queue adapter is active (USE_BULLMQ != true).
   */
  private async getInProcessStats(): Promise<{
    success: boolean;
    data: {
      queueName: string;
      queueType: 'in-process';
      counts: Record<string, number>;
      oldestJobAge?: number;
      recentJobRate: { last1h: number; last24h: number };
      recentJobs: RecentJob[];
    };
  }> {
    try {
      const [pending, processing, completed, failed, recent1h, recent24h, recentJobs] = await Promise.all([
        this.prisma.documentJob.count({ where: { status: 'pending' } }),
        this.prisma.documentJob.count({ where: { status: 'processing' } }),
        this.prisma.documentJob.count({ where: { status: 'completed' } }),
        this.prisma.documentJob.count({ where: { status: 'failed' } }),
        // Jobs completed in the last hour
        this.prisma.documentJob.count({
          where: {
            status: 'completed',
            completedAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
          },
        }),
        // Jobs completed in the last 24 hours
        this.prisma.documentJob.count({
          where: {
            status: 'completed',
            completedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        }),
        this.fetchRecentJobs(),
      ]);

      // Find the oldest pending/processing job to estimate backlog age
      const oldestJob = await this.prisma.documentJob.findFirst({
        where: { status: { in: ['pending', 'processing'] } },
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true },
      });

      const oldestJobAge = oldestJob
        ? Date.now() - oldestJob.createdAt.getTime()
        : undefined;

      return {
        success: true,
        data: {
          queueName: 'document-generation',
          queueType: 'in-process',
          counts: {
            waiting: pending,
            active: processing,
            completed,
            failed,
            delayed: 0,
            paused: 0,
          },
          oldestJobAge,
          recentJobRate: {
            last1h: recent1h,
            last24h: recent24h,
          },
          recentJobs,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to fetch in-process queue stats: ${(error as Error).message}`);
      return {
        success: true,
        data: {
          queueName: 'document-generation',
          queueType: 'in-process',
          counts: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0, paused: 0 },
          recentJobRate: { last1h: 0, last24h: 0 },
          recentJobs: [],
        },
      };
    }
  }
}
