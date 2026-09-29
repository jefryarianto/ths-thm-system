import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { env } from '../config/env.validation';
import { escapeHtml, escapeRegex } from './html-utils';
import { getTemplateDefinition, listTemplateDefinitions } from './template-registry';

export interface SendMailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  metadata?: {
    module?: string;
    template?: string;
    userId?: string;
    [key: string]: unknown;
  };
}

interface ResendResponse {
  id?: string;
  error?: { message: string; name?: string };
}

/** Hasil satu siklus retry (dipakai cron & endpoint manual). */
export interface RetryResult {
  retried: number;
  succeeded: number;
  failed: number;
  /** Email yang melebihi batas percobaan → status `abandoned` (keluar dari auto-retry). */
  abandoned: number;
}

/** Hasil pengiriman ke provider tanpa logging (dipakai sendMail & retry). */
interface DeliveryResult {
  ok: boolean;
  provider: 'resend' | 'smtp' | null;
  resendId?: string;
  reason?: string;
}

/** Kolom minimal untuk retry — batch kecil sehingga content ikut aman dimuat. */
const RETRY_SELECT = {
  id: true,
  to: true,
  subject: true,
  content: true,
  metadata: true,
  retryCount: true,
};

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly RESEND_API_URL = 'https://api.resend.com/emails';

  // ── Konfigurasi auto-retry (insiden retry-loop 2026-09) ──
  // Guard anti-loop: email yang lama / sering gagal tidak diulang terus-menerus.
  /** Batas usia email yang boleh di-retry otomatis (env EMAIL_RETRY_MAX_AGE_HOURS, default 48). */
  private readonly RETRY_MAX_AGE_MS = MailService.positiveIntEnv('EMAIL_RETRY_MAX_AGE_HOURS', 48) * 3_600_000;
  /** Ukuran batch per siklus (env EMAIL_RETRY_BATCH_SIZE, default 25). */
  private readonly RETRY_BATCH_SIZE = MailService.positiveIntEnv('EMAIL_RETRY_BATCH_SIZE', 25);
  /** Batas percobaan retry sebelum email ditandai `abandoned` (env EMAIL_RETRY_MAX_ATTEMPTS, default 3). */
  private readonly RETRY_MAX_ATTEMPTS = MailService.positiveIntEnv('EMAIL_RETRY_MAX_ATTEMPTS', 3);
  /** Jeda minimal antar percobaan per email (env EMAIL_RETRY_BACKOFF_MINUTES, default 60). */
  private readonly RETRY_BACKOFF_MS = MailService.positiveIntEnv('EMAIL_RETRY_BACKOFF_MINUTES', 60) * 60_000;

  /** Baca env integer positif; fallback ke default bila tidak valid. */
  private static positiveIntEnv(name: string, fallback: number): number {
    const parsed = parseInt(process.env[name] || '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  constructor(private readonly prisma: PrismaService) {}

  async sendMail(options: SendMailOptions): Promise<boolean> {
    const { to, subject, text, html, metadata } = options;

    const suppressed = await this.prisma.suppressedEmail.findUnique({
      where: { email: to },
    });
    if (suppressed) {
      this.logger.log(`[SUPPRESSED] Email to ${to} skipped — previously ${suppressed.reason}`);
      await this.logToDb(
        to,
        subject,
        'skipped',
        null,
        `Suppressed: ${suppressed.reason} at ${suppressed.createdAt.toISOString()}`,
        metadata,
        html || text,
      );
      return true;
    }

    if (env.nodeEnv === 'development') {
      this.logger.log(`[DEV] Email would be sent to ${to}: "${subject}"`);
      await this.logToDb(to, subject, 'skipped', 'dev', null, metadata, html || text);
      return true;
    }

    // Kirim via provider utama (Resend) lalu fallback SMTP
    const attempt = await this.deliver(to, subject, text, html);
    if (attempt.ok) {
      const enrichedMetadata = {
        ...(metadata || {}),
        ...(attempt.resendId ? { resendId: attempt.resendId } : {}),
      };
      await this.logToDb(to, subject, 'sent', attempt.provider, null, enrichedMetadata, html || text);
      return true;
    }

    // All providers failed — log as failed
    await this.logToDb(
      to,
      subject,
      'failed',
      null,
      attempt.reason || 'All email providers failed (Resend + SMTP)',
      metadata,
      html || text,
    );
    return false;
  }

  /**
   * Kirim email ke provider TANPA menulis log: Resend dulu, fallback SMTP.
   * Dipakai sendMail (hasilnya di-log) dan retryFailedEmails (log asli di-update).
   */
  private async deliver(
    to: string,
    subject: string,
    text?: string,
    html?: string,
  ): Promise<DeliveryResult> {
    // Try Resend first (primary provider — uses native fetch, no packages needed)
    const { success: resendSent, resendId } = await this.sendViaResend(to, subject, text, html);
    if (resendSent) return { ok: true, provider: 'resend', resendId };

    // Fallback to SMTP
    const smtpSent = await this.sendViaSmtp(to, subject, text, html);
    if (smtpSent) return { ok: true, provider: 'smtp' };

    return { ok: false, provider: null, reason: 'All email providers failed (Resend + SMTP)' };
  }

  /**
   * Render an email template with support for custom DB overrides.
   * If a custom template with the same name exists in the DB and is active,
   * it will replace {{variable}} placeholders with the provided values.
   * Otherwise, it falls back to the default render function.
   *
   * Both the variable key (for the regex) and the variable value (for HTML)
   * are sanitised to prevent injection attacks.
   */
  async renderWithOverride(
    templateName: string,
    defaultRender: () => { subject: string; html: string },
    variables: Record<string, string>,
  ): Promise<{ subject: string; html: string }> {
    try {
      const custom = await this.prisma.emailTemplate.findUnique({
        where: { name: templateName },
      });

      if (custom && custom.isActive) {
        let subject = custom.subject;
        let htmlBody = custom.htmlBody;

        for (const [key, rawValue] of Object.entries(variables)) {
          // Escape regex special chars in key to prevent ReDoS / malformed regex
          const safeKey = escapeRegex(key);
          const regex = new RegExp(`\\{\\{\\s*${safeKey}\\s*\\}\\}`, 'gi');
          // HTML-escape the value to prevent injection into the rendered template
          const safeValue = escapeHtml(rawValue);
          subject = subject.replace(regex, safeValue);
          htmlBody = htmlBody.replace(regex, safeValue);
        }

        return { subject, html: htmlBody };
      }
    } catch {
      // If DB lookup fails, fall back to default
    }

    return defaultRender();
  }

  /**
   * Coba kirim ulang email yang gagal.
   *
   * Perbaikan insiden retry-loop 2026-09:
   *  - Baris log ASLI di-update in-place (status/retryCount/lastRetryAt) — tidak
   *    lagi membuat baris log baru per percobaan, sehingga email yang selalu
   *    gagal tidak membanjiri tabel email_logs (dulu 131 ribu baris duplikat).
   *  - Mode otomatis (dipakai cron, tanpa `ids`): hanya email muda (≤ RETRY_MAX_AGE),
   *    belum kehabisan kuota percobaan, sudah melewati backoff, dibatasi RETRY_BATCH_SIZE.
   *  - Mode manual via `ids` (tombol UI): melewati filter usia & backoff karena
   *    eksplisit diminta operator; tetap di-batch & tetap update status.
   *  - Gagal terus sampai RETRY_MAX_ATTEMPTS → status `abandoned` (keluar dari
   *    antrean auto-retry; operator masih bisa mengaktifkan lagi via retry manual).
   */
  async retryFailedEmails(ids?: string[]): Promise<RetryResult> {
    const now = new Date();
    const where: Record<string, unknown> = {
      status: ids && ids.length > 0 ? { in: ['failed', 'abandoned'] } : 'failed',
      content: { not: null },
    };
    if (ids && ids.length > 0) {
      where.id = { in: ids };
    } else {
      // Guard mode otomatis: usia, kuota percobaan, dan backoff.
      where.retryCount = { lt: this.RETRY_MAX_ATTEMPTS };
      where.createdAt = { gte: new Date(now.getTime() - this.RETRY_MAX_AGE_MS) };
      where.OR = [
        { lastRetryAt: null },
        { lastRetryAt: { lt: new Date(now.getTime() - this.RETRY_BACKOFF_MS) } },
      ];
    }

    const failedLogs = await this.prisma.emailLog.findMany({
      where,
      select: RETRY_SELECT,
      orderBy: { createdAt: 'asc' },
      take: this.RETRY_BATCH_SIZE,
    });
    let succeeded = 0;
    let retried = 0;
    let failed = 0;
    let abandoned = 0;

    for (const log of failedLogs) {
      retried++;

      // Logged content may be truncated (max EMAIL_LOG_CONTENT_LENGTH chars).
      // If so, the re-sent email will contain broken HTML — warn operators to re-render manually.
      if (log.content && log.content.endsWith('...')) {
        this.logger.warn(
          `Retrying email to ${log.to}: content was truncated (max ${this.MAX_LOG_CONTENT_LENGTH} chars). ` +
          `Consider re-rendering the template instead.`,
        );
      }

      try {
        // Penerima yang sudah di-suppress (bounce/complaint) tidak dikirim ulang.
        const suppressed = await this.prisma.suppressedEmail.findUnique({
          where: { email: log.to },
        });
        if (suppressed) {
          await this.prisma.emailLog.update({
            where: { id: log.id },
            data: {
              status: 'skipped',
              error: `Suppressed: ${suppressed.reason}`,
              lastRetryAt: now,
            },
          });
          continue;
        }

        const attempt = await this.deliver(log.to, log.subject, undefined, log.content || undefined);
        // Counter di-update SETELAH update DB sukses — bila update gagal, hasil
        // tidak dihitung agar angka cron mencerminkan outcome yang benar-benar
        // tercatat (kegagalan update dicatat via logger di catch).
        if (attempt.ok) {
          await this.prisma.emailLog.update({
            where: { id: log.id },
            data: {
              status: 'sent',
              provider: attempt.provider,
              error: null,
              retryCount: { increment: 1 },
              lastRetryAt: now,
              metadata: {
                ...((log.metadata as Record<string, unknown> | null) || {}),
                ...(attempt.resendId ? { resendId: attempt.resendId } : {}),
                retriedAt: now.toISOString(),
              },
            },
          });
          succeeded++;
        } else {
          const exhausted = log.retryCount + 1 >= this.RETRY_MAX_ATTEMPTS;
          await this.prisma.emailLog.update({
            where: { id: log.id },
            data: {
              // Habis kuota percobaan → abandoned (keluar dari antrean auto-retry).
              status: exhausted ? 'abandoned' : 'failed',
              error: attempt.reason || 'All email providers failed (Resend + SMTP)',
              retryCount: { increment: 1 },
              lastRetryAt: now,
            },
          });
          if (exhausted) abandoned++;
          failed++;
        }
      } catch (err) {
        // Satu kegagalan DB/update tidak boleh membatalkan sisa batch.
        this.logger.error(`Gagal memproses retry log ${log.id}: ${(err as Error).message}`);
      }
    }

    return { retried, succeeded, failed, abandoned };
  }

  /**
   * Temukan semua placeholder `{{var}}` dalam sebuah string.
   */
  discoverVariables(input: string): string[] {
    const matches = input.match(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g) || [];
    const names = matches.map((m) => {
      const inner = m.replace(/[{}]/g, '').trim();
      return inner.split(/\s+/)[0];
    });
    return [...new Set(names)];
  }

  /**
   * Pratinjau sebuah template email (default atau custom dari DB).
   * Menemukan placeholder {{var}}, lalu menggantinya dengan nilai contoh /
   * nilai yang dikirim pemanggil. Dipakai endpoint preview di mail.controller.
   */
  async previewTemplate(
    name: string,
    custom?: { subject?: string; htmlBody?: string },
    variables?: Record<string, string>,
  ): Promise<{
    name: string;
    isCustom: boolean;
    variables: Array<{ name: string; sample: string; description?: string }>;
    subject: string;
    html: string;
  }> {
    const definition = getTemplateDefinition(name);
    if (!definition) {
      throw new NotFoundException(`Template "${name}" tidak dikenal`);
    }

    // Gabungkan nilai: variabel yang dikirim client menimpa nilai contoh
    const sampleMap: Record<string, string> = {};
    for (const v of definition.variables) {
      sampleMap[v.name] = variables?.[v.name] ?? v.sample;
    }

    // Cari custom override aktif di DB
    const dbCustom = await this.prisma.emailTemplate.findUnique({ where: { name } });
    const useCustom = dbCustom && dbCustom.isActive;
    const isCustom = Boolean(useCustom);

    let subject: string;
    let htmlBody: string;
    if (useCustom) {
      subject = dbCustom.subject;
      htmlBody = dbCustom.htmlBody;
    } else if (custom) {
      subject = custom.subject || '';
      htmlBody = custom.htmlBody || '';
    } else {
      // Render default dengan nilai contoh (nilai dari client menimpa contoh)
      const defaultTpl = definition.renderDefault(sampleMap);
      subject = defaultTpl.subject;
      htmlBody = defaultTpl.html;
    }

    let renderedSubject = subject;
    let renderedHtml = htmlBody;
    for (const [key, rawValue] of Object.entries(sampleMap)) {
      const safeKey = escapeRegex(key);
      const regex = new RegExp(`\\{\\{\\s*${safeKey}\\s*\\}\\}`, 'gi');
      const safeValue = escapeHtml(rawValue);
      renderedSubject = renderedSubject.replace(regex, safeValue);
      renderedHtml = renderedHtml.replace(regex, safeValue);
    }

    return {
      name,
      isCustom,
      variables: definition.variables,
      subject: renderedSubject,
      html: renderedHtml,
    };
  }

  /** Daftar semua template + definisi variabelnya (untuk UI admin). */
  listTemplateDefinitions() {
    return listTemplateDefinitions().map((def) => ({
      name: def.name,
      label: def.label,
      variables: def.variables,
    }));
  }

  /**
   * Maximum length of email content to store in the log.
   * Full content is truncated to protect PII (names, email bodies, etc.)
   * from long-term storage in the email_logs table.
   *
   * Configurable via EMAIL_LOG_CONTENT_LENGTH env var so admins can raise it
   * (e.g. 20000) to keep the full email body for audit purposes.
   */
  private readonly MAX_LOG_CONTENT_LENGTH = (() => {
    const parsed = parseInt(process.env.EMAIL_LOG_CONTENT_LENGTH || '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 5000;
  })();

  private async logToDb(
    to: string,
    subject: string,
    status: 'sent' | 'failed' | 'skipped',
    provider: string | null,
    error: string | null,
    metadata?: Record<string, unknown> | null,
    content?: string | null,
  ): Promise<void> {
    try {
      // Truncate content to protect PII — full HTML bodies often contain
      // names, addresses, phone numbers, and other personal data
      const safeContent =
        content && content.length > this.MAX_LOG_CONTENT_LENGTH
          ? content.slice(0, this.MAX_LOG_CONTENT_LENGTH) + '...'
          : content || undefined;

      await this.prisma.emailLog.create({
        data: {
          to,
          subject,
          status,
          provider,
          error,
          content: safeContent,
          metadata: (metadata as never) || undefined,
        },
      });
    } catch (err) {
      this.logger.error(`Failed to write email log: ${(err as Error).message}`);
    }
  }

  private async sendViaResend(
    to: string,
    subject: string,
    text?: string,
    html?: string,
  ): Promise<{ success: boolean; resendId?: string }> {
    try {
      const apiKey = process.env.RESEND_API_KEY;
      if (!apiKey) {
        this.logger.warn('RESEND_API_KEY not set — skipping Resend');
        return { success: false };
      }

      const fromDomain = process.env.RESEND_DOMAIN;
      if (!fromDomain) {
        this.logger.warn('RESEND_DOMAIN not set — skipping Resend');
        return { success: false };
      }

      const response = await fetch(this.RESEND_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `THS-THM <notifications@${fromDomain}>`,
          to: [to],
          subject,
          text: text || '',
          html: html || text || '',
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as ResendResponse;
        this.logger.error(
          `Resend API error (${response.status}): ${errorData.error?.message || response.statusText}`,
        );
        return { success: false };
      }

      const responseData = (await response.json().catch(() => ({}))) as ResendResponse;
      this.logger.log(
        `Email sent via Resend to ${to}: "${subject}" (id: ${responseData.id || 'unknown'})`,
      );
      return { success: true, resendId: responseData.id };
    } catch (error) {
      this.logger.error(`Resend request failed: ${(error as Error).message}`);
      return { success: false };
    }
  }

  private async sendViaSmtp(
    to: string,
    subject: string,
    text?: string,
    html?: string,
  ): Promise<boolean> {
    if (!env.smtp.user || !env.smtp.pass) {
      this.logger.warn('SMTP not configured — email not sent');
      return false;
    }

    try {
      let nodemailerModule: typeof import('nodemailer');
      try {
        nodemailerModule = await import('nodemailer');
      } catch {
        this.logger.warn(
          'nodemailer package not installed — SMTP fallback unavailable. ' +
            'Install with: cd apps/api && pnpm add nodemailer',
        );
        return false;
      }

      const transporter = nodemailerModule.createTransport({
        host: env.smtp.host,
        port: env.smtp.port,
        secure: env.smtp.port === 465,
        auth: { user: env.smtp.user, pass: env.smtp.pass },
      });

      await transporter.sendMail({
        from: `"THS-THM" <${env.smtp.user}>`,
        to,
        subject,
        text: text || '',
        html: html || text || '',
      });

      this.logger.log(`Email sent via SMTP to ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`SMTP fallback failed: ${(error as Error).message}`);
      return false;
    }
  }
}
