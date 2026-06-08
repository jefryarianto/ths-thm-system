// Type declarations for dynamically imported packages used by MailService
// These packages are loaded via dynamic import() at runtime and are optional.
// Install them with: pnpm add nodemailer

declare module 'nodemailer' {
  interface TransportOptions {
    host: string;
    port: number;
    secure: boolean;
    auth: { user: string; pass: string };
  }

  interface SendMailOptions {
    from: string;
    to: string;
    subject: string;
    text: string;
    html?: string;
  }

  interface Transporter {
    sendMail: (opts: SendMailOptions) => Promise<unknown>;
  }

  export function createTransport(opts: TransportOptions): Transporter;
}
