import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Query,
  Body,
  Param,
  Req,
  ParseIntPipe,
  DefaultValuePipe,
  Logger,
  Headers,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request } from 'express';
import * as crypto from 'crypto';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiExcludeEndpoint } from '@nestjs/swagger';
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
  @Roles('superadmin', 'admin_distrik')
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
  @Roles('superadmin', 'admin_distrik')
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

  @Post('templates/test-send')
  @Roles('superadmin', 'admin_distrik')
  @ApiOperation({ summary: 'Kirim test email menggunakan template custom (subject & HTML body dari editor)' })
  async testSendTemplate(
    @Body()
    body: {
      name: string;
      subject: string;
      htmlBody: string;
      to: string;
      variables?: Record<string, string>;
    },
  ) {
    if (!body.to || !body.to.includes('@')) {
      return { success: false, message: 'Alamat email tujuan tidak valid' };
    }
    if (!body.subject.trim() || !body.htmlBody.trim()) {
      return { success: false, message: 'Subject dan konten HTML harus diisi' };
    }

    // Replace {{variable}} placeholders with sample/default values
    const defaultVars: Record<string, string> = {
      nama: 'John Doe',
      email: 'john@example.com',
      nomorAnggota: 'THM-2026-0001',
      alasan: 'Test alasan',
      resetUrl: 'https://app.ths-thm.org/reset?token=test',
      kegiatanNama: 'Latihan Rutin Sabtu',
      tanggal: '20 Juni 2026',
      lokasi: 'GOR THS-THM',
      jenisMateri: 'Teknik Dasar',
      hadir: 'Hadir',
      hariTanggal: 'Sabtu, 20 Juni 2026',
      jumlah: 'Rp 50.000',
      periode: 'Juni 2026',
      docType: 'Kartu Anggota',
      nomorDokumen: 'THM-2026-0001',
      status: 'disetujui',
      namaPendadaran: 'Pendadaran THS-THM',
      lulus: 'Lulus',
      skor: '85',
      setPasswordUrl: 'https://app.ths-thm.org/set-password?token=test',
      role: 'admin',
      namaPenerima: 'Budi Santoso',
      pengirim: 'Admin THS-THM',
      perihalSurat: 'Undangan Rapat',
      isiDisposisi: 'Mohon ditindaklanjuti',
      judul: 'Notifikasi Test',
      isi: 'Ini adalah isi notifikasi test',
      kategori: 'Internal',
      badgeName: 'Rajin Berlatih',
      badgeIcon: '🏅',
      description: 'Telah mengikuti 10 kali latihan',
      oldLevel: 'Bronze',
      newLevel: 'Silver',
      points: '1500',
      password: 'password123',
      ...(body.variables || {}),
    };

    let renderedSubject = body.subject;
    let renderedHtml = body.htmlBody;
    for (const [key, value] of Object.entries(defaultVars)) {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi');
      renderedSubject = renderedSubject.replace(regex, value);
      renderedHtml = renderedHtml.replace(regex, value);
    }

    const sent = await this.mailService.sendMail({
      to: body.to,
      subject: `[TEST] ${renderedSubject}`,
      html: renderedHtml,
      metadata: {
        module: 'mail-settings',
        template: `test-${body.name}`,
      },
    });

    if (sent) {
      return {
        success: true,
        message: `✅ Email test berhasil dikirim ke ${body.to}`,
      };
    }
    return {
      success: false,
      message: '❌ Gagal mengirim email test. Periksa konfigurasi email atau log untuk detail.',
    };
  }

  @Post('retry')
  @Roles('superadmin', 'admin_distrik')
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

  private async sendRetryNotification(result: {
    retried: number;
    succeeded: number;
    failed: number;
  }): Promise<void> {
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
          data: {
            type: 'email_retry',
            retried: result.retried,
            succeeded: result.succeeded,
            failed: result.failed,
          },
        });
      }
    } catch (error) {
      this.logger.error(`Failed to send retry notification: ${(error as Error).message}`);
    }
  }

  // ─── Email Logs ───

  @Get('logs')
  @Roles('superadmin', 'admin_distrik')
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
  @Roles('superadmin', 'admin_distrik')
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
    @Headers('svix-timestamp') svixTimestamp?: string,
    @Headers('svix-signature') svixSignature?: string,
    @Req() req?: Request,
  ) {
    // ── Verify webhook signature ──
    const secret = env.resendWebhookSecret;
    // Tanpa secret, tidak ada cara memverifikasi keaslian payload — tolak selalu.
    if (!secret) {
      this.logger.error('Webhook diterima tapi RESEND_WEBHOOK_SECRET tidak dikonfigurasi — menolak payload');
      throw new ForbiddenException('Webhook tidak dikonfigurasi');
    }

    // Access rawBody via NestJS rawBody:true option (type-asserted as not all Express types include it)
    const rawBodyBuffer = (req as unknown as { rawBody?: Buffer })?.rawBody;
    if (!svixId || !svixTimestamp || !svixSignature || !rawBodyBuffer) {
      this.logger.warn('Webhook missing required Svix headers — menolak payload');
      throw new ForbiddenException('Webhook signature header tidak lengkap');
    }

    try {
      // Timestamp check: reject if older than 5 minutes (replay protection)
      const timestampSec = parseInt(svixTimestamp, 10);
      const nowSec = Math.floor(Date.now() / 1000);
      if (Math.abs(nowSec - timestampSec) > 300) {
        this.logger.warn(`Webhook timestamp rejected: ${svixTimestamp} (now: ${nowSec})`);
        return { success: false, message: 'Timestamp too old' };
      }

      // Decode the signing secret (strip whsec_ prefix, base64 decode)
      const rawSecret = secret.startsWith('whsec_')
        ? Buffer.from(secret.slice(6), 'base64')
        : Buffer.from(secret, 'utf-8');

      // Build signed content: svix-id + '.' + svix-timestamp + '.' + rawBody
      const rawBody =
        rawBodyBuffer instanceof Buffer
          ? rawBodyBuffer.toString('utf-8')
          : JSON.stringify(payload);
      const signedContent = `${svixId}.${svixTimestamp}.${rawBody}`;

      // Compute expected HMAC SHA-256 signature
      const expectedSig = crypto
        .createHmac('sha256', rawSecret)
        .update(signedContent, 'utf-8')
        .digest('base64');

      // Extract signatures from header (format: v1,sig1 v1,sig2 ...)
      const signatures = svixSignature.split(' ');
      const isValid = signatures.some((sig) => {
        const [version, sigValue] = sig.split(',');
        if (version !== 'v1') return false;
        // Constant-time comparison to prevent timing attacks
        const sigBuffer = Buffer.from(sigValue || '', 'base64');
        const expectedBuffer = Buffer.from(expectedSig, 'base64');
        if (sigBuffer.length !== expectedBuffer.length) return false;
        return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
      });

      if (!isValid) {
        this.logger.warn(`Webhook signature verification failed for ${svixId}`);
        return { success: false, message: 'Invalid signature' };
      }

      this.logger.log(`Webhook signature verified for ${svixId}`);
    } catch (err) {
      this.logger.error(`Webhook signature verification error: ${(err as Error).message}`);
      throw new ForbiddenException('Signature verification error');
    }

    // Idempotency ATOMIK: klaim via unique constraint pada webhook_events.event_id
    // (svix-id). Insert yang sukses = proses; P2002 = sudah diproses (aman dari
    // webhook ganda yang datang konkurren / retry provider).
    const eventType = (payload.type as string) || '';
    if (svixId) {
      try {
        await this.prisma.webhookEvent.create({
          data: {
            eventId: svixId,
            provider: 'resend',
            eventType,
            payload: payload as never,
          },
          select: { id: true },
        });
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          this.logger.log(`Webhook ${svixId} already processed, skipping`);
          return { success: true, message: 'Already processed' };
        }
        throw err;
      }
    }

    try {
      await this.processWebhookEvent(payload, svixId);
    } catch (err) {
      // Proses gagal → lepaskan klaim agar provider bisa retry.
      if (svixId) {
        await this.prisma.webhookEvent
          .deleteMany({ where: { eventId: svixId } })
          .catch(() => undefined);
      }
      throw err;
    }

    return { success: true };
  }

  private async processWebhookEvent(
    payload: Record<string, unknown>,
    svixId?: string,
  ): Promise<void> {
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

    const createdEvent = await this.prisma.emailEvent.create({
      data: {
        emailLogId,
        event: mappedEvent,
        recipient: (eventData.to as string[])?.[0] || null,
        data: { ...payload, svixId } as never,
      },
    });

    // Auto-suppress on bounce or complaint
    if ((mappedEvent === 'bounced' || mappedEvent === 'complained') && createdEvent.recipient) {
      try {
        await this.prisma.suppressedEmail.upsert({
          where: { email: createdEvent.recipient },
          create: {
            email: createdEvent.recipient,
            reason: mappedEvent,
            eventId: createdEvent.id,
          },
          update: { reason: mappedEvent, eventId: createdEvent.id },
        });
        this.logger.log(`Auto-suppressed ${createdEvent.recipient} (${mappedEvent})`);
      } catch (err) {
        this.logger.error(
          `Failed to auto-suppress ${createdEvent.recipient}: ${(err as Error).message}`,
        );
      }
    }
  }

  @Get('logs/engagement')
  @Roles('superadmin', 'admin_distrik')
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

    // ── Daily trend (7 days) ──
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Get all events from the last 7 days
    const recentEvents = await this.prisma.emailEvent.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { event: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    // Get daily sent counts
    const recentLogs = await this.prisma.emailLog.findMany({
      where: { createdAt: { gte: sevenDaysAgo }, status: 'sent' },
      select: { createdAt: true },
    });

    // Build daily aggregations
    const dailySent: Record<string, number> = {};
    for (const log of recentLogs) {
      const day = log.createdAt.toISOString().slice(0, 10);
      dailySent[day] = (dailySent[day] || 0) + 1;
    }

    const dailyEvents: Record<string, Record<string, number>> = {};
    for (const evt of recentEvents) {
      const day = evt.createdAt.toISOString().slice(0, 10);
      if (!dailyEvents[day]) dailyEvents[day] = {};
      dailyEvents[day][evt.event] = (dailyEvents[day][evt.event] || 0) + 1;
    }

    // Build daily trend data
    const dailyTrend: Array<{
      date: string;
      sent: number;
      opened: number;
      clicked: number;
      bounced: number;
      openRate: number;
      clickRate: number;
      bounceRate: number;
    }> = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateKey = d.toISOString().slice(0, 10);
      const sent = dailySent[dateKey] || 0;
      const dayEvents = dailyEvents[dateKey] || {};
      const opened = dayEvents.opened || 0;
      const clicked = dayEvents.clicked || 0;
      const bounced = dayEvents.bounced || 0;

      dailyTrend.push({
        date: dateKey,
        sent,
        opened,
        clicked,
        bounced,
        openRate: sent > 0 ? Math.round((opened / sent) * 100) : 0,
        clickRate: sent > 0 ? Math.round((clicked / sent) * 100) : 0,
        bounceRate: sent > 0 ? Math.round((bounced / sent) * 100) : 0,
      });
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
          complained:
            totalSent > 0 ? Math.round(((eventMap.complained || 0) / totalSent) * 100) : 0,
        },
        dailyTrend,
      },
    };
  }

  @Get('suppressions')
  @Roles('superadmin', 'admin_distrik')
  async getSuppressions(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    const [data, total] = await Promise.all([
      this.prisma.suppressedEmail.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { event: { select: { event: true, timestamp: true } } },
      }),
      this.prisma.suppressedEmail.count(),
    ]);

    return {
      success: true,
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  @Delete('suppressions/:id')
  @Roles('superadmin', 'admin_distrik')
  async removeSuppression(@Param('id') id: string) {
    try {
      await this.prisma.suppressedEmail.delete({ where: { id } });
      return { success: true, message: 'Suppressed email removed' };
    } catch (err) {
      return { success: false, message: (err as Error).message };
    }
  }

  @Post('suppressions')
  @Roles('superadmin', 'admin_distrik')
  async addSuppression(@Body() body: { email: string; reason?: string }) {
    if (!body.email || !body.email.includes('@')) {
      return { success: false, message: 'Email tidak valid' };
    }
    try {
      const suppressed = await this.prisma.suppressedEmail.upsert({
        where: { email: body.email.trim().toLowerCase() },
        create: {
          email: body.email.trim().toLowerCase(),
          reason: body.reason || 'manual',
        },
        update: { reason: body.reason || 'manual' },
      });
      return { success: true, data: suppressed, message: 'Email ditambahkan ke daftar supresi' };
    } catch (err) {
      return { success: false, message: (err as Error).message };
    }
  }

  @Post('suppressions/clear')
  @Roles('superadmin', 'admin_distrik')
  async clearSuppressions(@Body() body: { ids?: string[] }) {
    if (body.ids && body.ids.length > 0) {
      await this.prisma.suppressedEmail.deleteMany({
        where: { id: { in: body.ids } },
      });
      return { success: true, message: `${body.ids.length} alamat dihapus dari supresi` };
    }
    // Clear all
    const { count } = await this.prisma.suppressedEmail.deleteMany();
    return { success: true, message: `Semua ${count} alamat dihapus dari supresi` };
  }

  // ─── Email Templates (custom overrides) ───

  @Get('templates')
  @Roles('superadmin', 'admin_distrik')
  @ApiOperation({ summary: 'Ambil semua email template dengan override dari DB' })
  async getTemplates() {
    const customTemplates = await this.prisma.emailTemplate.findMany();
    const customMap = new Map(customTemplates.map((t) => [t.name, t]));

    const registry = this.mailService.listTemplateDefinitions();
    const data = registry.map((def) => {
      const custom = customMap.get(def.name);
      return {
        name: def.name,
        label: def.label,
        variables: def.variables,
        isCustom: Boolean(custom && custom.isActive),
        ...(custom
          ? {
              id: custom.id,
              subject: custom.subject,
              htmlBody: custom.htmlBody,
              isActive: custom.isActive,
              updatedAt: custom.updatedAt,
            }
          : {}),
      };
    });

    return { success: true, data };
  }

  @Get('templates/registry')
  @Roles('superadmin', 'admin_distrik')
  @ApiOperation({ summary: 'Daftar semua template + katalog variabel {{...}} untuk editor' })
  async getTemplateRegistry() {
    const customs = await this.prisma.emailTemplate.findMany();
    const customMap = new Map(customs.map((t) => [t.name, t]));
    const data = this.mailService.listTemplateDefinitions().map((def) => ({
      name: def.name,
      label: def.label,
      variables: def.variables,
      isCustom: Boolean(customMap.get(def.name)?.isActive),
    }));
    return { success: true, data };
  }

  @Get('templates/:name')
  @Roles('superadmin', 'admin_distrik')
  @ApiOperation({ summary: 'Ambil detail email template (custom override jika ada)' })
  async getTemplate(@Param('name') name: string) {
    const custom = await this.prisma.emailTemplate.findUnique({
      where: { name },
    });
    return {
      success: true,
      data: custom
        ? {
            id: custom.id,
            name: custom.name,
            subject: custom.subject,
            htmlBody: custom.htmlBody,
            isActive: custom.isActive,
            updatedAt: custom.updatedAt,
          }
        : null,
    };
  }

  @Post('templates/:name/preview')
  @Roles('superadmin', 'admin_distrik')
  @ApiOperation({ summary: 'Pratinjau template (default/custom/draft) dengan variabel contoh' })
  async previewTemplate(
    @Param('name') name: string,
    @Body() body: { subject?: string; htmlBody?: string; variables?: Record<string, string> },
  ) {
    const preview = await this.mailService.previewTemplate(
      name,
      body.subject !== undefined || body.htmlBody !== undefined
        ? { subject: body.subject || '', htmlBody: body.htmlBody || '' }
        : undefined,
      body.variables,
    );

    // Variabel yang tersisa (belum diisi) agar editor tahu yang kurang
    const unresolved = this.mailService.discoverVariables(preview.subject + preview.html);

    return {
      success: true,
      data: { ...preview, unresolved },
    };
  }

  @Put('templates/:name')
  @Roles('superadmin', 'admin_distrik')
  @ApiOperation({ summary: 'Simpan/ubah custom email template override' })
  async upsertTemplate(
    @Param('name') name: string,
    @Body() body: { subject: string; htmlBody: string; isActive?: boolean },
  ) {
    const data: Record<string, unknown> = {
      subject: body.subject,
      htmlBody: body.htmlBody,
    };
    if (body.isActive !== undefined) data.isActive = body.isActive;

    const template = await this.prisma.emailTemplate.upsert({
      where: { name },
      create: {
        name,
        subject: body.subject,
        htmlBody: body.htmlBody,
        isActive: body.isActive ?? true,
      },
      update: data,
    });

    return { success: true, data: template, message: 'Template berhasil disimpan' };
  }

  @Delete('templates/:name')
  @Roles('superadmin', 'admin_distrik')
  @ApiOperation({ summary: 'Hapus custom email template (kembali ke default)' })
  async deleteTemplate(@Param('name') name: string) {
    await this.prisma.emailTemplate.delete({ where: { name } }).catch(() => {
      // Ignore if not found
    });
    return { success: true, message: 'Custom template dihapus, kembali ke default' };
  }

  @Get('modules')
  @Roles('superadmin', 'admin_distrik')
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
  @Roles('superadmin', 'admin_distrik')
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
    const recentWhere: Record<string, unknown> = {
      createdAt: { gte: sevenDaysAgo },
      ...moduleFilter,
    };
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
