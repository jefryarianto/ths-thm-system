import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../mail/mail.service';
import { generalNotificationEmail } from '../../mail/email-templates';

export interface BroadcastEmailDto {
  subject: string;
  content: string;
  targetType?: 'all' | 'ranting' | 'wilayah' | 'distrik';
  targetId?: string;
}

@Injectable()
export class BroadcastService {
  private readonly logger = new Logger(BroadcastService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async sendEmail(dto: BroadcastEmailDto) {
    // Get target members
    const members = await this.getTargetMembers(dto.targetType, dto.targetId);

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    // Send in batches of 50
    const batchSize = 50;
    for (let i = 0; i < members.length; i += batchSize) {
      const batch = members.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map(async (member) =>
          this.mailService.sendMail({
            to: member.email,
            subject: dto.subject,
            html: (await this.mailService.renderWithOverride(
              'generalNotificationEmail',
              () => generalNotificationEmail(member.namaLengkap, dto.subject, dto.content),
              { nama: member.namaLengkap, judul: dto.subject, isi: dto.content },
            )).html,
            metadata: { module: 'broadcast', template: 'generalNotificationEmail', userId: member.id },
          }),
        ),
      );

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          sent++;
        } else {
          failed++;
          if (result.status === 'rejected') {
            errors.push(result.reason?.message || 'Unknown error');
          }
        }
      }
    }

    this.logger.log(`Broadcast email: ${sent} sent, ${failed} failed out of ${members.length} targets`);

    return {
      success: true,
      data: {
        total: members.length,
        sent,
        failed,
        errors: errors.slice(0, 10), // Return first 10 errors
      },
      message: `Email broadcast ke ${sent}/${members.length} anggota berhasil dikirim`,
    };
  }

  private async getTargetMembers(targetType?: string, targetId?: string) {
    const where: Record<string, unknown> = {
      email: { not: null },
      statusKeanggotaan: 'aktif',
      deletedAt: null,
    };

    if (targetType && targetId) {
      switch (targetType) {
        case 'ranting':
          where.rantingId = targetId;
          break;
        case 'wilayah': {
          const rantingIds = await this.prisma.ranting.findMany({
            where: { wilayahId: targetId },
            select: { id: true },
          });
          where.rantingId = { in: rantingIds.map((r) => r.id) };
          break;
        }
        case 'distrik': {
          const rantingIds = await this.prisma.ranting.findMany({
            where: { wilayah: { distrikId: targetId } },
            select: { id: true },
          });
          where.rantingId = { in: rantingIds.map((r) => r.id) };
          break;
        }
      }
    }

    const members = await this.prisma.anggota.findMany({
      where,
      select: { id: true, email: true, namaLengkap: true },
    });

    return members.filter((m) => m.email) as Array<{ id: string; email: string; namaLengkap: string }>;
  }
}