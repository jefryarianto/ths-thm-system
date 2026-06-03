import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { renderToStream } from '@react-pdf/renderer';
import * as stream from 'stream';
import { MemberCard } from '@ths-thm/templates/cards/memberCard'; // path alias to package

@Injectable()
export class DocumentGenerationService {
  constructor(private readonly prisma: PrismaService) {}

  async generateMemberCard(memberId: string): Promise<stream.Readable> {
    const member = await this.prisma.anggota.findUnique({ where: { id: memberId } });
    if (!member) throw new NotFoundException('Anggota tidak ditemukan');
    // render PDF stream
    const pdfStream = await renderToStream(
      MemberCard({
        name: member.namaLengkap,
        memberNumber: member.nomorAnggota,
        gender: member.jenisKelamin,
        address: member.alamat,
        phone: member.noHp,
      })
    );
    return pdfStream;
  }
}
