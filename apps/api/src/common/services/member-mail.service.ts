import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService, SendMailOptions } from '../../mail/mail.service';

@Injectable()
export class MemberMailService {
  private readonly logger = new Logger(MemberMailService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  /**
   * Find an anggota by ID and send an email using the provided template function.
   * Silently skips if the member has no email or is not found.
   * Catches and logs errors to never crash the caller.
   */
  async sendToMember(
    anggotaId: string,
    templateFn: (nama: string) => { subject: string; html?: string; text?: string },
    metadata: Record<string, unknown>,
    moduleName: string,
  ): Promise<void> {
    try {
      const member = await this.prisma.anggota.findUnique({
        where: { id: anggotaId },
        select: { email: true, namaLengkap: true },
      });
      if (!member?.email) return;

      const tpl = templateFn(member.namaLengkap);
      const mailOptions: SendMailOptions = {
        to: member.email,
        subject: tpl.subject,
        html: tpl.html,
        text: tpl.text,
        metadata: { module: moduleName, ...metadata },
      };
      await this.mailService.sendMail(mailOptions);
    } catch (error) {
      this.logger.error(`sendToMember failed for member ${anggotaId}: ${(error as Error).message}`);
    }
  }

  /**
   * Send email with a template that includes additional parameters beyond member name.
   * The templateFn receives all extra args as a spread.
   */
  async sendToMemberWithArgs<T extends unknown[]>(
    anggotaId: string,
    templateFn: (nama: string, ...args: T) => { subject: string; html?: string; text?: string },
    args: T,
    metadata: Record<string, unknown>,
    moduleName: string,
  ): Promise<void> {
    try {
      const member = await this.prisma.anggota.findUnique({
        where: { id: anggotaId },
        select: { email: true, namaLengkap: true },
      });
      if (!member?.email) return;

      const tpl = templateFn(member.namaLengkap, ...args);
      const mailOptions: SendMailOptions = {
        to: member.email,
        subject: tpl.subject,
        html: tpl.html,
        text: tpl.text,
        metadata: { module: moduleName, ...metadata },
      };
      await this.mailService.sendMail(mailOptions);
    } catch (error) {
      this.logger.error(
        `sendToMemberWithArgs failed for member ${anggotaId}: ${(error as Error).message}`,
      );
    }
  }
}
