import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import * as os from 'os';
import { PrismaService } from '../../prisma/prisma.service';
import { ScopeHelper } from '../../common/utils/scope-helpers';
import { CacheService } from '../../common/services/cache.service';
import { PersistentAuditService } from '../../common/services/persistent-audit.service';
import { BaseCrudService } from '../../common/utils/base-crud.service';
import { MailService } from '../../mail/mail.service';
import { monitoringAlertEmail } from '../../mail/email-templates';
import { CreateMonitoringAlertDto, UpdateMonitoringAlertDto } from './dto/monitoring-alert.dto';

interface HealthSnapshot {
  status: string;
  uptime: number;
  database: { status: string };
  memory: { heapUsed: string; heapTotal: string };
  queue: { status: string; latencyMs?: number | null; counts?: { failed: number } };
}

@Injectable()
export class MonitoringService extends BaseCrudService<CreateMonitoringAlertDto, UpdateMonitoringAlertDto> {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly scopeHelper: ScopeHelper,
    protected readonly cache: CacheService,
    private readonly mailService: MailService,
    @Optional() protected readonly persistentAudit?: PersistentAuditService,
  ) {
    super(prisma, scopeHelper, cache, {
      model: 'monitoringAlert',
      prefix: 'monitoring:',
      notFound: 'Alert tidak ditemukan',
    }, persistentAudit);
  }

  // ── Hooks: transform DTO before create/update ───────
  // Eliminates the 3 `as never` casts for metric and channels

  protected async beforeCreate(
    dto: CreateMonitoringAlertDto,
  ): Promise<Record<string, unknown>> {
    return {
      name: dto.name,
      metric: dto.metric,
      operator: dto.operator,
      threshold: dto.threshold,
      duration: dto.duration ?? 0,
      channels: dto.channels,
      telegramBotToken: dto.telegramBotToken,
      telegramChatId: dto.telegramChatId,
      emailRecipients: dto.emailRecipients,
      cooldown: dto.cooldown ?? 300,
      isActive: dto.isActive ?? true,
    };
  }

  protected async beforeUpdate(
    _id: string,
    dto: UpdateMonitoringAlertDto,
  ): Promise<Record<string, unknown>> {
    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.metric !== undefined) data.metric = dto.metric;
    if (dto.operator !== undefined) data.operator = dto.operator;
    if (dto.threshold !== undefined) data.threshold = dto.threshold;
    if (dto.duration !== undefined) data.duration = dto.duration;
    if (dto.channels !== undefined) data.channels = dto.channels;
    if (dto.telegramBotToken !== undefined) data.telegramBotToken = dto.telegramBotToken;
    if (dto.telegramChatId !== undefined) data.telegramChatId = dto.telegramChatId;
    if (dto.emailRecipients !== undefined) data.emailRecipients = dto.emailRecipients;
    if (dto.cooldown !== undefined) data.cooldown = dto.cooldown;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    return data;
  }

  // ── CRUD Overrides ──────────────────────────────────

  async findAll() {
    return this.baseFindAll(
      `${this.CACHE_PREFIX}list`,
      async () => ({}),
      {
        orderBy: { metric: 'asc' },
      },
      30,
    );
  }

  async findOne(id: string) {
    return this.baseFindOne(id);
  }

  async create(dto: CreateMonitoringAlertDto) {
    return this.baseCreate(dto);
  }

  async update(id: string, dto: UpdateMonitoringAlertDto) {
    return this.baseUpdate(id, dto);
  }

  async delete(id: string) {
    return this.baseRemove(id);
  }

  // ── Domain: toggle alert active state ───────────────

  async toggle(id: string) {
    const existing = await this.prismaDelegate.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Alert tidak ditemukan');

    const alert = await this.prismaDelegate.update({
      where: { id },
      data: { isActive: !(existing as any).isActive },
    });
    this.invalidateCache();
    return alert;
  }

  // ── Domain: Alert Evaluation ────────────────────────

  async evaluateAlerts(health: HealthSnapshot): Promise<{
    triggered: { alertName: string; metric: string; currentValue: number; threshold: number }[];
    sent: number;
  }> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const activeAlerts = await (this.prisma as any).monitoringAlert.findMany({
      where: { isActive: true },
    });

    const triggered: {
      alertName: string;
      metric: string;
      currentValue: number;
      threshold: number;
    }[] = [];
    let sent = 0;

    for (const alert of activeAlerts) {
      const currentValue = this.extractMetric(health, alert.metric);
      if (currentValue === null) continue;

      const isTriggered = this.compareThreshold(currentValue, alert.threshold, alert.operator);

      if (isTriggered) {
        if (alert.lastTriggeredAt) {
          const elapsed = (Date.now() - alert.lastTriggeredAt.getTime()) / 1000;
          if (elapsed < alert.cooldown) continue;
        }

        triggered.push({
          alertName: alert.name,
          metric: alert.metric,
          currentValue,
          threshold: alert.threshold,
        });

        await this.sendNotifications(alert, currentValue);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (this.prisma as any).monitoringAlert.update({
          where: { id: alert.id },
          data: { lastTriggeredAt: new Date() },
        });

        sent++;
      }
    }

    return { triggered, sent };
  }

  private extractMetric(health: HealthSnapshot, metric: string): number | null {
    switch (metric) {
      case 'cpu_percent': {
        const cpuCount = os.cpus().length;
        if (cpuCount === 0) return null;
        const load1 = os.loadavg()[0];
        return Math.min(Math.round((load1 / cpuCount) * 100), 100);
      }
      case 'memory_percent':
        return this.parseMemoryPercent(health.memory);
      case 'db_down':
        return health.database.status === 'connected' ? 0 : 1;
      case 'queue_down':
        return health.queue.status === 'connected' ? 0 : 1;
      case 'api_down':
        return health.status === 'ok' ? 0 : 1;
      case 'queue_latency_ms':
        return health.queue.latencyMs ?? 0;
      case 'queue_failed_jobs':
        return health.queue.counts?.failed ?? 0;
      default:
        return null;
    }
  }

  private parseMemoryPercent(memory: { heapUsed: string; heapTotal: string }): number | null {
    const used = parseFloat(memory.heapUsed?.replace(' MB', '') || '0');
    const total = parseFloat(memory.heapTotal?.replace(' MB', '') || '1');
    if (total === 0) return null;
    return Math.round((used / total) * 100);
  }

  private compareThreshold(value: number, threshold: number, operator: string): boolean {
    switch (operator) {
      case 'gt': return value > threshold;
      case 'gte': return value >= threshold;
      case 'lt': return value < threshold;
      case 'lte': return value <= threshold;
      default: return false;
    }
  }

  // ── Notifications ──────────────────────────────────

  private async sendNotifications(
    alert: {
      name: string;
      channels: string[];
      telegramBotToken?: string | null;
      telegramChatId?: string | null;
      emailRecipients?: string | null;
      metric: string;
      threshold: number;
    },
    currentValue: number,
  ): Promise<void> {
    const message = `🚨 ALERT: ${alert.name}\nMetric: ${alert.metric}\nThreshold: ${alert.threshold}\nCurrent: ${currentValue}\nTime: ${new Date().toISOString()}`;

    for (const channel of alert.channels) {
      if (channel === 'telegram') {
        await this.sendTelegram(alert.telegramBotToken, alert.telegramChatId, message);
      }
      if (channel === 'email' && alert.emailRecipients) {
        await this.sendEmailAlert(alert.emailRecipients, alert.name, message);
      }
    }
  }

  private async sendTelegram(botToken?: string | null, chatId?: string | null, message?: string): Promise<void> {
    if (!botToken || !chatId) return;
    try {
      const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'Markdown',
        }),
      });
    } catch (err) {
      this.logger.warn(`Telegram alert failed: ${(err as Error).message}`);
    }
  }

  private async sendEmailAlert(recipients: string, alertName: string, message: string): Promise<void> {
    const emails = recipients.split(',').map((e) => e.trim()).filter(Boolean);
    for (const email of emails) {
      try {
        const tpl = monitoringAlertEmail(alertName, message);
        await this.mailService.sendMail({
          to: email,
          subject: tpl.subject,
          html: tpl.html,
          metadata: { module: 'monitoring', template: 'monitoringAlertEmail' },
        });
      } catch (err) {
        this.logger.warn(`Email alert to ${email} failed: ${(err as Error).message}`);
      }
    }
  }
}
