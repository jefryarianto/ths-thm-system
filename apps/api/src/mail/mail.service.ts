import { Injectable, Logger } from '@nestjs/common';
import { env } from '../config/env.validation';

export interface SendMailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  async sendMail(options: SendMailOptions): Promise<void> {
    const { to, subject, text, html } = options;

    if (env.nodeEnv === 'development') {
      this.logger.log(`[DEV] Email would be sent to ${to}: "${subject}"`);
      return;
    }

    // Try Resend first (primary provider)
    const sent = await this.sendViaResend(to, subject, text, html);
    if (sent) return;

    // Fallback to SMTP
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

      let ResendClass: typeof import('resend')['Resend'];
      try {
        ({ Resend: ResendClass } = await import('resend'));
      } catch {
        this.logger.warn('resend package not installed — skipping Resend');
        return false;
      }

      const resend = new ResendClass(apiKey);
      const fromDomain = process.env.RESEND_DOMAIN || process.env.EMAIL_FROM || 'localhost';
      await resend.emails.send({
        from: `THS-THM <notifications@${fromDomain}>`,
        to: [to],
        subject,
        text: text || '',
        html: html || text || '',
      });

      this.logger.log(`Email sent via Resend to ${to}: "${subject}"`);
      return true;
    } catch (error) {
      this.logger.error(`Resend failed: ${(error as Error).message}`);
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
      let nodemailerModule: typeof import('nodemailer');
      try {
        nodemailerModule = await import('nodemailer');
      } catch {
        this.logger.warn('nodemailer package not installed — skipping SMTP');
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
