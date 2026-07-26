import { Injectable, Logger } from '@nestjs/common';
import * as os from 'os';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../mail/mail.service';
import { CreateMonitoringAlertDto, UpdateMonitoringAlertDto } from './dto/monitoring-alert.dto';

interface HealthSnapshot {
  status: string;
  uptime: number;
  database: { status: string };
  memory: { heapUsed: string; heapTotal: string };
  queue: { status: string; latencyMs?: number | null; counts?: { failed: number } };
}

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  // ── CRUD ─────────────────────────────────────────────

  async findAll() {
    const alerts = await this.prisma.monitoringAlert.findMany({
      orderBy: { metric: 'asc' },
    });
    return { success: true, data: alerts };
  }

  async findOne(id: string) {
    const alert = await this.prisma.monitoringAlert.findUnique({ where: { id } });
    if (!alert) return { success: false, message: 'Alert not found' };
    return { success: true, data: alert };
  }

  async create(dto: CreateMonitoringAlertDto) {
    const alert = await this.prisma.monitoringAlert.create({
      data: {
        name: dto.name,
        metric: dto.metric as never,
        operator: dto.operator,
        threshold: dto.threshold,
        duration: dto.duration ?? 0,
        channels: dto.channels as never,
        telegramBotToken: dto.telegramBotToken,
        telegramChatId: dto.telegramChatId,
        emailRecipients: dto.emailRecipients,
        cooldown: dto.cooldown ?? 300,
        isActive: dto.isActive ?? true,
      },
    });
    return { success: true, data: alert };
  }

  async update(id: string, dto: UpdateMonitoringAlertDto) {
    const existing = await this.prisma.monitoringAlert.findUnique({ where: { id } });
    if (!existing) return { success: false, message: 'Alert not found' };

    const alert = await this.prisma.monitoringAlert.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.metric !== undefined ? { metric: dto.metric as never } : {}),
        ...(dto.operator !== undefined ? { operator: dto.operator } : {}),
        ...(dto.threshold !== undefined ? { threshold: dto.threshold } : {}),
        ...(dto.duration !== undefined ? { duration: dto.duration } : {}),
        ...(dto.channels !== undefined ? { channels: dto.channels as never } : {}),
        ...(dto.telegramBotToken !== undefined ? { telegramBotToken: dto.telegramBotToken } : {}),
        ...(dto.telegramChatId !== undefined ? { telegramChatId: dto.telegramChatId } : {}),
        ...(dto.emailRecipients !== undefined ? { emailRecipients: dto.emailRecipients } : {}),
        ...(dto.cooldown !== undefined ? { cooldown: dto.cooldown } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
    return { success: true, data: alert };
  }

  async delete(id: string) {
    const existing = await this.prisma.monitoringAlert.findUnique({ where: { id } });
    if (!existing) return { success: false, message: 'Alert not found' };
    await this.prisma.monitoringAlert.delete({ where: { id } });
    return { success: true, message: 'Alert deleted' };
  }

  async toggle(id: string) {
    const existing = await this.prisma.monitoringAlert.findUnique({ where: { id } });
    if (!existing) return { success: false, message: 'Alert not found' };
    const alert = await this.prisma.monitoringAlert.update({
      where: { id },
      data: { isActive: !existing.isActive },
    });
    return { success: true, data: alert };
  }

  // ── Alert Evaluation ────────────────────────────────

  /**
   * Evaluate all active alerts against the current health snapshot.
   * Called by the HealthController on each SSE tick.
   * Returns the list of triggered alerts for notification dispatching.
   */
  async evaluateAlerts(health: HealthSnapshot): Promise<{
    triggered: { alertName: string; metric: string; currentValue: number; threshold: number }[];
    sent: number;
  }> {
    const activeAlerts = await this.prisma.monitoringAlert.findMany({
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
        // Check cooldown
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

        // Send notifications
        await this.sendNotifications(alert, currentValue);

        // Update last triggered
        await this.prisma.monitoringAlert.update({
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
        // Use 1-minute load average / CPU count as rough CPU usage %
        const cpuCount = os.cpus().length;
        if (cpuCount === 0) return null;
        const load1 = os.loadavg()[0]; // 1-minute load average
        return Math.min(Math.round((load1 / cpuCount) * 100), 100);
      }
      case 'memory_percent':
        // Parse "128 MB used / 512 MB total" into percentage
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
        await this.mailService.sendMail({
          to: email,
          subject: `🚨 Monitoring Alert: ${alertName}`,
          text: message,
          html: message.replace(/\n/g, '<br/>'),
          metadata: { module: 'monitoring' },
        });
      } catch (err) {
        this.logger.warn(`Email alert to ${email} failed: ${(err as Error).message}`);
      }
    }
  }
}
