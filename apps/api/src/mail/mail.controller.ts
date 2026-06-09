import { Controller, Get, Post, Query, Body, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { MailService } from './mail.service';
import { TestMailDto } from './dto/test-mail.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { env } from '../config/env.validation';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Mail')
@Controller('mail')
@ApiBearerAuth()
export class MailController {
  constructor(
    private readonly mailService: MailService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('status')
  @Roles('superadmin')
  async getStatus() {
    return {
      success: true,
      data: {
        mode: env.nodeEnv === 'development' ? 'development' : 'production',
        resend: {
          configured: !!(process.env.RESEND_API_KEY && process.env.RESEND_DOMAIN),
          hasApiKey: !!process.env.RESEND_API_KEY,
          hasDomain: !!process.env.RESEND_DOMAIN,
        },
        smtp: {
          configured: !!(env.smtp.user && env.smtp.pass),
          host: env.smtp.host || null,
          port: env.smtp.port || null,
          hasCredentials: !!(env.smtp.user && env.smtp.pass),
        },
      },
    };
  }

  @Post('test')
  @Roles('superadmin')
  async test(@Body() dto: TestMailDto) {
    const sent = await this.mailService.sendMail({
      to: dto.email,
      subject: 'Test Email dari THS-THM System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #1a56db;">Test Email Berhasil!</h1>
          <p>Halo,</p>
          <p>Email ini adalah <strong>test email</strong> dari sistem THS-THM untuk memverifikasi konfigurasi email telah berfungsi dengan baik.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="color: #6b7280; font-size: 12px;">
            THS-THM System &mdash; dikirim via Resend
          </p>
        </div>
      `,
    });

    if (sent) {
      return { success: true, message: 'Test email sent successfully' };
    }
    return { success: false, message: 'Test email failed. Check API logs for details.' };
  }

  // ─── Email Logs ───

  @Get('logs')
  @Roles('superadmin')
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'module', required: false })
  async getLogs(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: string,
    @Query('module') module?: string,
  ) {
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (module) where.metadata = { path: ['module'], equals: module };

    const [data, total] = await Promise.all([
      this.prisma.emailLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.emailLog.count({ where }),
    ]);

    return {
      success: true,
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  @Get('modules')
  @Roles('superadmin')
  async getModules() {
    const modules = await this.prisma.$queryRaw<Array<{ module: string; count: bigint }>>`
      SELECT DISTINCT metadata->>'module' as module, COUNT(*)::bigint as count
      FROM email_logs
      WHERE metadata->>'module' IS NOT NULL
      GROUP BY metadata->>'module'
      ORDER BY module ASC
    `;

    return {
      success: true,
      data: modules.map((m) => ({
        module: m.module,
        label: m.module,
        count: Number(m.count),
      })),
    };
  }

  @Get('logs/stats')
  @Roles('superadmin')
  @ApiQuery({ name: 'module', required: false })
  async getLogStats(
    @Query('module') module?: string,
  ) {
    const moduleFilter = module ? { metadata: { path: ['module'], equals: module } } : {};

    const [total, sent, failed, skipped, topRecipients] = await Promise.all([
      this.prisma.emailLog.count({ where: moduleFilter }),
      this.prisma.emailLog.count({ where: { status: 'sent', ...moduleFilter } }),
      this.prisma.emailLog.count({ where: { status: 'failed', ...moduleFilter } }),
      this.prisma.emailLog.count({ where: { status: 'skipped', ...moduleFilter } }),
      this.prisma.emailLog.groupBy({
        by: ['to'],
        where: Object.keys(moduleFilter).length > 0 ? moduleFilter : undefined,
        _count: true,
        orderBy: { _count: { to: 'desc' } },
        take: 10,
      }),
    ]);

    // Get status breakdown per recent day (7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentLogs = await this.prisma.emailLog.findMany({
      where: { createdAt: { gte: sevenDaysAgo }, ...moduleFilter },
      select: { status: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });

    const dailyStats: Record<string, { sent: number; failed: number; skipped: number }> = {};
    for (const log of recentLogs) {
      const day = log.createdAt.toISOString().slice(0, 10);
      if (!dailyStats[day]) dailyStats[day] = { sent: 0, failed: 0, skipped: 0 };
      dailyStats[day][log.status as 'sent' | 'failed' | 'skipped']++;
    }

    return {
      success: true,
      data: {
        total,
        sent,
        failed,
        skipped,
        successRate: total > 0 ? Math.round((sent / total) * 100) : 0,
        dailyStats: Object.entries(dailyStats)
          .map(([date, stats]) => ({ date, ...stats }))
          .sort((a, b) => b.date.localeCompare(a.date)),
        topRecipients: topRecipients.map((r) => ({
          email: r.to,
          count: r._count,
        })),
      },
    };
  }
}
