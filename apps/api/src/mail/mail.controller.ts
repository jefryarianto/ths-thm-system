import { Controller, Get, Post, Query, Body, ParseIntPipe, DefaultValuePipe, Logger, Headers } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery, ApiExcludeEndpoint } from '@nestjs/swagger';
import { MailService } from './mail.service';
import { TestMailDto } from './dto/test-mail.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { env } from '../config/env.validation';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../modules/notifications/notifications.service';

@ApiTags('Mail')
@Controller('mail')
@ApiBearerAuth()
export class MailController {
  private readonly logger = new Logger(MailController.name);

  constructor(
    private readonly mailService: MailService,
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
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

  @Post('retry')
  @Roles('superadmin')
  async retryFailed(@Body() body: { ids?: string[] }) {
    const result = await this.mailService.retryFailedEmails(body.ids);

    // Send notification to all superadmin users about retry result
    this.sendRetryNotification(result);

    return {
      success: true,
      data: result,
      message: `${result.retried} email gagal dicoba kirim ulang, ${result.succeeded} berhasil, ${result.failed} gagal`,
    };
  }

  private async sendRetryNotification(result: { retried: number; succeeded: number; failed: number }): Promise<void> {
    try {
      const superadmins = await this.prisma.user.findMany({
        where: { role: 'superadmin', isActive: true },
        select: { id: true, namaLengkap: true },
      });

      const statusIcon = result.failed === 0 ? '✅' : '⚠️';
      const statusText = result.failed === 0 ? 'Semua berhasil' : `${result.failed} masih gagal`;

      for (const admin of superadmins) {
        await this.notificationsService.send(admin.id, {
          userId: admin.id,
          judul: `${statusIcon} Retry Email Selesai`,
          isi: `${result.retried} email gagal dicoba kirim ulang — ${result.succeeded} berhasil, ${result.failed} gagal. (${statusText})`,
          tipe: 'umum' as never,
          data: { type: 'email_retry', retried: result.retried, succeeded: result.succeeded, failed: result.failed },
        });
      }
    } catch (error) {
      this.logger.error(`Failed to send retry notification: ${(error as Error).message}`);
    }
  }

  // ─── Email Logs ───

  @Get('logs')
  @Roles('superadmin')
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'module', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getLogs(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: string,
    @Query('module') module?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (module) where.metadata = { path: ['module'], equals: module };
    if (startDate || endDate) {
      const createdAt: Record<string, Date> = {};
      if (startDate) createdAt.gte = new Date(startDate);
      if (endDate) createdAt.lte = new Date(endDate + 'T23:59:59.999Z');
      where.createdAt = createdAt;
    }

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

  @Get('logs/export')
  @Roles('superadmin')
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'module', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async exportLogs(
    @Query('limit', new DefaultValuePipe(5000), ParseIntPipe) limit: number,
    @Query('status') status?: string,
    @Query('module') module?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (module) where.metadata = { path: ['module'], equals: module };
    if (startDate || endDate) {
      const createdAt: Record<string, Date> = {};
      if (startDate) createdAt.gte = new Date(startDate);
      if (endDate) createdAt.lte = new Date(endDate + 'T23:59:59.999Z');
      where.createdAt = createdAt;
    }

    const data = await this.prisma.emailLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return {
      success: true,
      data: data.map((log) => ({
        id: log.id,
        to: log.to,
        subject: log.subject,
        status: log.status,
        provider: log.provider || '-',
        error: log.error || '',
        module: ((log.metadata as Record<string, unknown> | null)?.module as string) || '',
        createdAt: log.createdAt.toISOString(),
      })),
    };
  }

  @Post('webhook')
  @Public()
  @ApiExcludeEndpoint()
  async handleWebhook(
    @Body() payload: Record<string, unknown>,
    @Headers('svix-id') svixId?: string,
  ) {
    // Idempotency: check if we already processed this webhook (by svix-id)
    if (svixId) {
      const exists = await this.prisma.emailEvent.findFirst({
        where: { data: { path: ['svixId'], equals: svixId } },
      });
      if (exists) {
        this.logger.log(`Webhook ${svixId} already processed, skipping`);
        return { success: true, message: 'Already processed' };
      }
    }

    const eventType = (payload.type as string) || '';
    const eventData = (payload.data as Record<string, unknown>) || {};
    const emailId = eventData.email_id as string | undefined;

    this.logger.log(`Received webhook: ${eventType} for email ${emailId || 'unknown'}`);

    // Try to find matching EmailLog by Resend ID stored in metadata
    let emailLogId: string | undefined;
    if (emailId) {
      const log = await this.prisma.emailLog.findFirst({
        where: { metadata: { path: ['resendId'], equals: emailId } },
        select: { id: true },
      });
      if (log) emailLogId = log.id;
    }

    // Map Resend event type to our event types
    const eventMap: Record<string, string> = {
      'email.delivered': 'delivered',
      'email.opened': 'opened',
      'email.clicked': 'clicked',
      'email.bounced': 'bounced',
      'email.complained': 'complained',
      'email.sent': 'delivered',
    };
    const mappedEvent = eventMap[eventType] || eventType;

    await this.prisma.emailEvent.create({
      data: {
        emailLogId,
        event: mappedEvent,
        recipient: (eventData.to as string[])?.[0] || null,
        data: { ...payload, svixId } as never,
      },
    });

    return { success: true };
  }

  @Get('logs/engagement')
  @Roles('superadmin')
  async getEngagement() {
    // Aggregate EmailEvent counts by event type
    const events = await this.prisma.emailEvent.groupBy({
      by: ['event'],
      _count: true,
    });

    const totalEvents = events.reduce((sum, e) => sum + e._count, 0);

    // Calculate rates based on sent email count from EmailLog
    const totalSent = await this.prisma.emailLog.count({
      where: { status: 'sent' },
    });

    const eventMap: Record<string, number> = {};
    for (const e of events) {
      eventMap[e.event] = e._count;
    }

    return {
      success: true,
      data: {
        totalSent,
        totalEvents,
        events: eventMap,
        rates: {
          delivered: totalSent > 0 ? Math.round(((eventMap.delivered || 0) / totalSent) * 100) : 0,
          opened: totalSent > 0 ? Math.round(((eventMap.opened || 0) / totalSent) * 100) : 0,
          clicked: totalSent > 0 ? Math.round(((eventMap.clicked || 0) / totalSent) * 100) : 0,
          bounced: totalSent > 0 ? Math.round(((eventMap.bounced || 0) / totalSent) * 100) : 0,
          complained: totalSent > 0 ? Math.round(((eventMap.complained || 0) / totalSent) * 100) : 0,
        },
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
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getLogStats(
    @Query('module') module?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const moduleFilter = module ? { metadata: { path: ['module'], equals: module } } : {};
    const dateFilter: Record<string, unknown> = {};
    if (startDate || endDate) {
      const createdAt: Record<string, Date> = {};
      if (startDate) createdAt.gte = new Date(startDate);
      if (endDate) createdAt.lte = new Date(endDate + 'T23:59:59.999Z');
      dateFilter.createdAt = createdAt;
    }

    const combinedFilter = { ...moduleFilter, ...dateFilter };
    const combinedFilterKeys = Object.keys(combinedFilter);
    const combinedFilterForGroupBy = combinedFilterKeys.length > 0 ? combinedFilter : undefined;

    const [total, sent, failed, skipped, topRecipients] = await Promise.all([
      this.prisma.emailLog.count({ where: combinedFilter }),
      this.prisma.emailLog.count({ where: { status: 'sent', ...combinedFilter } }),
      this.prisma.emailLog.count({ where: { status: 'failed', ...combinedFilter } }),
      this.prisma.emailLog.count({ where: { status: 'skipped', ...combinedFilter } }),
      this.prisma.emailLog.groupBy({
        by: ['to'],
        where: combinedFilterForGroupBy,
        _count: true,
        orderBy: { _count: { to: 'desc' } },
        take: 10,
      }),
    ]);

    // Get status breakdown per recent day (7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentWhere: Record<string, unknown> = { createdAt: { gte: sevenDaysAgo }, ...moduleFilter };
    if (Object.keys(dateFilter).length > 0) {
      const dateCreatedAt = dateFilter.createdAt as Record<string, Date>;
      const existingCreatedAt = recentWhere.createdAt as Record<string, Date>;
      recentWhere.createdAt = { ...existingCreatedAt, ...dateCreatedAt };
    }
    const recentLogs = await this.prisma.emailLog.findMany({
      where: recentWhere,
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
