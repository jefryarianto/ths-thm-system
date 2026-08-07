import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserScope } from '../../common/interfaces/user-scope.interface';
import { ScopeHelper } from '../../common/utils/scope-helpers';
import { PenandatanganService } from '../penandatangan/penandatangan.service';
import * as QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class MembersDigitalCardService {
  private readonly logger = new Logger(MembersDigitalCardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeHelper: ScopeHelper,
    private readonly penandatanganService: PenandatanganService,
  ) {}

  /**
   * Baca foto anggota dari disk sebagai data URL base64 untuk ditanam di PDF.
   * Fallback ke null bila file tidak ada / gagal dibaca (placeholder 'FOTO' dipakai).
   */
  private async resolvePhotoDataUrl(fotoPath?: string | null): Promise<string | null> {
    if (!fotoPath) return null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require('fs');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const path = require('path');
      const uploadDir = process.env.UPLOAD_DIR || './uploads';
      const filePath = path.join(uploadDir, fotoPath);
      if (!fs.existsSync(filePath)) return null;
      const ext = path.extname(filePath).toLowerCase();
      const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
      const base64 = fs.readFileSync(filePath).toString('base64');
      return `data:${mime};base64,${base64}`;
    } catch {
      return null;
    }
  }

  /**
   * Resolve nama penandatangan: prioritas dari tabel `penandatangans` (yang aktif),
   * fallback ke env SIGNER_NAME/SIGNER_TITLE, lalu default.
   */
  private async resolveSigner() {
    return this.penandatanganService.resolveActive();
  }

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
          tingkat: memberData.tingkat,
          tempatDadar: memberData.tempatDadar,
          tahunDadar: memberData.tahunDadar,
          ranting: memberData.ranting,
          wilayah: memberData.wilayah,
          distrik: memberData.distrik,
          statusKeanggotaan: memberData.statusKeanggotaan,
        },
        cardConfig: {
          nomorDokumen: card.nomorDokumen,
          qrDataUrl,
          verificationUrl: card.verificationUrl,
          signers: card.signers,
          signerName: card.signerName,
          signerTitle: card.signerTitle,
        },
        photoDataUrl: await this.resolvePhotoDataUrl(memberData.fotoPath),
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
      tingkat: member.tingkat,
      tempatDadar: member.tempatDadar,
      tahunDadar: member.tahunDadar,
      ranting: member.ranting?.nama,
      wilayah: member.ranting?.wilayah?.nama,
      distrik: member.ranting?.wilayah?.distrik?.nama,
    };

    const signers = await this.penandatanganService.resolveSigners('kartu_anggota');
    const card = {
      id: existingCard.id,
      nomorDokumen: existingCard.nomorDokumen,
      verificationUrl: existingCard.verificationUrl || '',
      status: existingCard.status,
      // Backward-compat: signer pertama tetap di `signerName`/`signerTitle`.
      signers,
      signerName: signers[0]?.signerName,
      signerTitle: signers[0]?.signerTitle,
    };

    return { card, memberData, verificationUrl: card.verificationUrl };
  }
}
