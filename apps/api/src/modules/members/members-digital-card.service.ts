import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserScope } from '../../common/interfaces/user-scope.interface';
import { ScopeHelper } from '../../common/utils/scope-helpers';
import * as QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class MembersDigitalCardService {
  private readonly logger = new Logger(MembersDigitalCardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeHelper: ScopeHelper,
  ) {}

  async getDigitalCard(memberId: string, scope?: UserScope) {
    const { card, memberData, verificationUrl } = await this.prepareDigitalCardData(memberId, scope);
    const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
      width: 300,
      margin: 2,
      color: { dark: '#1a365d', light: '#ffffff' },
    });

    return {
      success: true,
      data: {
        card,
        member: memberData,
        qrCode: qrDataUrl,
      },
    };
  }

  async getDigitalCardImage(memberId: string, scope?: UserScope): Promise<Buffer> {
    const pdfBuffer = await this.getDigitalCardPdf(memberId, scope);
    const { pdfToPng } = require('../documents/pdf-templates/pdf-to-image');
    return pdfToPng(pdfBuffer);
  }

  async getDigitalCardPdf(memberId: string, scope?: UserScope): Promise<Buffer> {
    const { card, memberData, verificationUrl } = await this.prepareDigitalCardData(memberId, scope);
    const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
      width: 300,
      margin: 2,
      color: { dark: '#1a365d', light: '#ffffff' },
    });

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const ReactPDF = require('@react-pdf/renderer');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { buildMemberCardPdf } = require('../documents/pdf-templates/member-card');

      const pdfDoc = buildMemberCardPdf({
        member: {
          namaLengkap: memberData.namaLengkap,
          nomorAnggota: memberData.nomorAnggota,
          tempatLahir: memberData.tempatLahir,
          tanggalLahir: memberData.tanggalLahir,
          jenisKelamin: memberData.jenisKelamin || 'L',
          ranting: memberData.ranting,
          wilayah: memberData.wilayah,
          distrik: memberData.distrik,
          statusKeanggotaan: memberData.statusKeanggotaan,
        },
        cardConfig: {
          nomorDokumen: card.nomorDokumen,
          qrDataUrl,
          verificationUrl: card.verificationUrl,
          signerName: process.env.SIGNER_NAME || 'Koordinator Distrik',
          signerTitle: process.env.SIGNER_TITLE || 'THS-THM',
        },
      });

      const pdfBuffer = await ReactPDF.renderToBuffer(pdfDoc);
      return pdfBuffer;
    } catch (error) {
      this.logger.error('PDF generation failed, returning JSON fallback:', (error as Error).message);
      throw new Error('PDF generation requires react-pdf setup. Use /digital-card JSON endpoint instead.');
    }
  }

  private async prepareDigitalCardData(memberId: string, scope?: UserScope) {
    const member = await this.prisma.anggota.findUnique({
      where: { id: memberId, deletedAt: null },
      include: {
        ranting: { include: { wilayah: { include: { distrik: true } } } },
        dokumen: { where: { tipe: 'kartu_anggota', status: { not: 'revoked' } }, take: 1 },
      },
    });

    if (!member) throw new NotFoundException('Anggota tidak ditemukan');

    if (
      scope &&
      !(await this.scopeHelper.hasAccessToResourceAsync(this.prisma, scope, member.rantingId))
    ) {
      throw new ForbiddenException('Akses ditolak: diluar cakupan wilayah Anda');
    }

    // Generate or reuse existing card token
    let existingCard = member.dokumen[0];
    if (!existingCard) {
      const token = uuidv4();
      const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify/${token}`;
      const nomorDokumen = `KTA-${member.nomorAnggota}`;

      existingCard = await this.prisma.dokumen.create({
        data: {
          anggotaId: member.id,
          tipe: 'kartu_anggota',
          nomorDokumen,
          verificationUrl,
          status: 'generated',
        },
      });

      await this.prisma.qRValidation.create({
        data: { dokumenId: existingCard.id, token, isValid: true },
      });
    }

    const memberData = {
      id: member.id,
      nomorAnggota: member.nomorAnggota,
      namaLengkap: member.namaLengkap,
      jenisKelamin: member.jenisKelamin,
      tempatLahir: member.tempatLahir,
      tanggalLahir: member.tanggalLahir,
      alamat: member.alamat,
      noHp: member.noHp,
      email: member.email,
      fotoPath: member.fotoPath,
      statusKeanggotaan: member.statusKeanggotaan,
      ranting: member.ranting?.nama,
      wilayah: member.ranting?.wilayah?.nama,
      distrik: member.ranting?.wilayah?.distrik?.nama,
    };

    const card = {
      id: existingCard.id,
      nomorDokumen: existingCard.nomorDokumen,
      verificationUrl: existingCard.verificationUrl || '',
      status: existingCard.status,
      signerName: process.env.SIGNER_NAME || 'Koordinator Distrik',
      signerTitle: process.env.SIGNER_TITLE || 'THS-THM',
    };

    return { card, memberData, verificationUrl: card.verificationUrl };
  }
}
