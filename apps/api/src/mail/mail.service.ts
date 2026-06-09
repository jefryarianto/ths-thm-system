import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { env } from '../config/env.validation';

export interface SendMailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  /** Optional metadata for logging: which module, template, userId triggered this email */
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

  /**
   * Send email via Resend (primary) or SMTP (fallback).
   * Always logs the result to the email_logs table.
   * @returns true if email was sent successfully, false if skipped/failed
   */
  async sendMail(options: SendMailOptions): Promise<boolean> {
    const { to, subject, text, html, metadata } = options;

    if (env.nodeEnv === 'development') {
      this.logger.log(`[DEV] Email would be sent to ${to}: "${subject}"`);
      await this.logToDb(to, subject, 'skipped', 'dev', null, metadata);
      return true;
    }

    // Try Resend first (primary provider — uses native fetch, no packages needed)
    let provider = 'resend';
    let sent = await this.sendViaResend(to, subject, text, html);
    if (sent) {
      await this.logToDb(to, subject, 'sent', provider, null, metadata);
      return true;
    }

    // Fallback to SMTP
    provider = 'smtp';
    sent = await this.sendViaSmtp(to, subject, text, html);
    if (sent) {
      await this.logToDb(to, subject, 'sent', provider, null, metadata);
      return true;
    }

    // All providers failed — log as failed
    await this.logToDb(to, subject, 'failed', null, 'All email providers failed (Resend + SMTP)', metadata);
    return false;
  }

  private async logToDb(
    to: string,
    subject: string,
    status: 'sent' | 'failed' | 'skipped',
    provider: string | null,
    error: string | null,
    metadata?: Record<string, unknown> | null,
  ): Promise<void> {
    try {
      await this.prisma.emailLog.create({
        data: {
          to,
          subject,
          status,
          provider,
          error,
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
  ): Promise<boolean> {
    try {
      const apiKey = process.env.RESEND_API_KEY;
      if (!apiKey) {
        this.logger.warn('RESEND_API_KEY not set — skipping Resend');
        return false;
      }

      const fromDomain = process.env.RESEND_DOMAIN;
      if (!fromDomain) {
        this.logger.warn('RESEND_DOMAIN not set — skipping Resend');
        return false;
      }

      const response = await fetch(this.RESEND_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
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
        this.logger.error(`Resend API error (${response.status}): ${errorData.error?.message || response.statusText}`);
        return false;
      }

      this.logger.log(`Email sent via Resend to ${to}: "${subject}"`);
      return true;
    } catch (error) {
      this.logger.error(`Resend request failed: ${(error as Error).message}`);
      return false;
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
      // nodemailer is optional — install with: pnpm add nodemailer
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
