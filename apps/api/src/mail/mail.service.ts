import { Injectable, Logger } from '@nestjs/common';
import { env } from '../config/env.validation';

export interface SendMailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

interface ResendResponse {
  id?: string;
  error?: { message: string; name?: string };
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly RESEND_API_URL = 'https://api.resend.com/emails';

  async sendMail(options: SendMailOptions): Promise<void> {
    const { to, subject, text, html } = options;

    if (env.nodeEnv === 'development') {
      this.logger.log(`[DEV] Email would be sent to ${to}: "${subject}"`);
      return;
    }

    // Try Resend first (primary provider — uses native fetch, no packages needed)
    const sent = await this.sendViaResend(to, subject, text, html);
    if (sent) return;

    // Fallback to SMTP (requires nodemailer package to be installed)
    await this.sendViaSmtp(to, subject, text, html);
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
  ): Promise<void> {
    if (!env.smtp.user || !env.smtp.pass) {
      this.logger.warn('SMTP not configured — email not sent');
      return;
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
        return;
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
    } catch (error) {
      this.logger.error(`SMTP fallback failed: ${(error as Error).message}`);
    }
  }
}
