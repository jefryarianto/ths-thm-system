import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { env } from '../config/env.validation';
import { escapeHtml, escapeRegex } from './html-utils';

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

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly RESEND_API_URL = 'https://api.resend.com/emails';

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

    // Try Resend first (primary provider — uses native fetch, no packages needed)
    let provider = 'resend';
    let sent: boolean;
    const { success: resendSent, resendId } = await this.sendViaResend(to, subject, text, html);
    sent = resendSent;
    if (sent) {
      const enrichedMetadata = { ...(metadata || {}), ...(resendId ? { resendId } : {}) };
      await this.logToDb(to, subject, 'sent', provider, null, enrichedMetadata, html || text);
      return true;
    }

    // Fallback to SMTP
    provider = 'smtp';
    sent = await this.sendViaSmtp(to, subject, text, html);
    if (sent) {
      await this.logToDb(to, subject, 'sent', provider, null, metadata, html || text);
      return true;
    }

    // All providers failed — log as failed
    await this.logToDb(
      to,
      subject,
      'failed',
      null,
      'All email providers failed (Resend + SMTP)',
      metadata,
      html || text,
    );
    return false;
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

  async retryFailedEmails(
    ids?: string[],
  ): Promise<{ retried: number; succeeded: number; failed: number }> {
    const where: Record<string, unknown> = { status: 'failed' };
    if (ids && ids.length > 0) where.id = { in: ids };

    const failedLogs = await this.prisma.emailLog.findMany({ where });
    let succeeded = 0;
    let retried = 0;

    for (const log of failedLogs) {
      retried++;

      // Logged content may be truncated (max 500 chars). If so, the re-sent
      // email will contain broken HTML — warn operators to re-render manually.
      if (log.content && log.content.endsWith('...')) {
        this.logger.warn(
          `Retrying email to ${log.to}: content was truncated (max ${this.MAX_LOG_CONTENT_LENGTH} chars). ` +
          `Consider re-rendering the template instead.`,
        );
      }

      const metadata = (log.metadata as Record<string, unknown> | null) || undefined;
      const sent = await this.sendMail({
        to: log.to,
        subject: log.subject,
        html: log.content || undefined,
        metadata,
      });
      if (sent) succeeded++;
    }

    return { retried, succeeded, failed: retried - succeeded };
  }

  /**
   * Maximum length of email content to store in the log.
   * Full content is truncated to protect PII (names, email bodies, etc.)
   * from long-term storage in the email_logs table.
   */
  private readonly MAX_LOG_CONTENT_LENGTH = 500;

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
