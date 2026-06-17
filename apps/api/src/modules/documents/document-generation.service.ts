/* eslint-disable @typescript-eslint/no-require-imports */
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DocumentGenerationService {
  constructor(private readonly prisma: PrismaService) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async generateMemberCard(memberId: string): Promise<any> {
    const member = await this.prisma.anggota.findUnique({ where: { id: memberId } });
    if (!member) throw new NotFoundException('Anggota tidak ditemukan');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let pdfStream: any;
    try {
      const { renderToStream } = require('@react-pdf/renderer');
      const { MemberCard } = require('@ths-thm/templates/cards/memberCard');
      pdfStream = await renderToStream(
        MemberCard({
          name: member.namaLengkap,
          memberNumber: member.nomorAnggota,
          gender: member.jenisKelamin,
          address: member.alamat,
          phone: member.noHp,
        }),
      );
    } catch {
      const { Readable } = require('stream');
      pdfStream = Readable.from([JSON.stringify(member)]);
    }
    return pdfStream;
  }
}
