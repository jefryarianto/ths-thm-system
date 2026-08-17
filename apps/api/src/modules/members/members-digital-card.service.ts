import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserScope } from '../../common/interfaces/user-scope.interface';
import { ScopeHelper } from '../../common/utils/scope-helpers';
import { PenandatanganService } from '../penandatangan/penandatangan.service';
import { TingkatanService } from '../tingkatan/tingkatan.service';
import { assertSelfMember, SelfScopeUser } from '../../common/utils/self-scope.helper';
import * as QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class MembersDigitalCardService {
  private readonly logger = new Logger(MembersDigitalCardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeHelper: ScopeHelper,
    private readonly penandatanganService: PenandatanganService,
    private readonly tingkatanService: TingkatanService,
  ) {}

  /**
   * Baca foto anggota dari disk sebagai data URL base64 untuk ditanam di PDF.
   * Fallback ke null bila file tidak ada / gagal dibaca (placeholder 'FOTO' dipakai).
   */
  private async resolvePhotoDataUrl(fotoPath?: string | null, preferBg = false): Promise<string | null> {
    if (!fotoPath) return null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require('fs');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const path = require('path');
      const uploadDir = process.env.UPLOAD_DIR || './uploads';
      const filePath = path.join(uploadDir, fotoPath);
      if (!fs.existsSync(filePath)) return null;

      // Foto kartu: prefer versi tanpa background (`<file>.bg.png`) ala SIM.
      // Bila belum ada, generate on-demand via sharp (lazy, sekali saja).
      let targetPath = filePath;
      if (preferBg) {
        const bgPath = path.join(uploadDir, `${fotoPath}.bg.png`);
        if (fs.existsSync(bgPath)) {
          targetPath = bgPath;
        } else {
          try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const { removePhotoBackground } = require('../../common/utils/photo-bg.util');
            const out = await removePhotoBackground(fs.readFileSync(filePath));
            fs.writeFileSync(bgPath, out);
            targetPath = bgPath;
          } catch {
            targetPath = filePath;
          }
        }
      }

      const ext = path.extname(targetPath).toLowerCase();
      const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
      const base64 = fs.readFileSync(targetPath).toString('base64');
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

  /** Resolve gambar tanda tangan & stempel aktif (dari tabel settings). */
  private async resolveSignatureStamp() {
    try {
      const [signature, stamp] = await Promise.all([
        this.prisma.tandaTangan.findFirst({ where: { isActive: true }, orderBy: { updatedAt: 'desc' } }),
        this.prisma.stempel.findFirst({ where: { isActive: true }, orderBy: { updatedAt: 'desc' } }),
      ]);
      return {
        signatureImage: signature?.imagePath || null,
        stampImage: stamp?.imagePath || null,
      };
    } catch {
      return { signatureImage: null, stampImage: null };
    }
  }

  async getDigitalCard(memberId: string, scope?: UserScope, user?: SelfScopeUser) {
    const { card, memberData, verificationUrl, levelVisual } = await this.prepareDigitalCardData(memberId, scope, user);
    const qrDataUrl = await this.buildQr(verificationUrl);
    const { signatureImage, stampImage } = await this.resolveSignatureStamp();

    return {
      success: true,
      data: {
        card,
        member: memberData,
        qrCode: qrDataUrl,
        levelVisual,
        signatureImage,
        stampImage,
      },
    };
  }

  async getDigitalCardImage(memberId: string, scope?: UserScope, user?: SelfScopeUser): Promise<Buffer> {
    // PNG 2 sisi: render halaman gabungan (depan+belakang) lalu konversi ke PNG
    const { card, memberData, verificationUrl, levelVisual } = await this.prepareDigitalCardData(memberId, scope, user);
    const qrDataUrl = await this.buildQr(verificationUrl);
    const pdfBuffer = await this.renderCardPdf({ card, memberData, verificationUrl, levelVisual, qrDataUrl }, { combined: true });
    const { pdfToPng } = require('../documents/pdf-templates/pdf-to-image');
    return pdfToPng(pdfBuffer);
  }

  private async buildQr(verificationUrl: string): Promise<string> {
    return QRCode.toDataURL(verificationUrl, {
      width: 300,
      margin: 2,
      color: { dark: '#1a365d', light: '#ffffff' },
    });
  }

  private async renderCardPdf(
    data: {
      card: any;
      memberData: any;
      verificationUrl: string;
      levelVisual: any;
      qrDataUrl: string;
    },
    opts?: { combined?: boolean },
  ): Promise<Buffer> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const ReactPDF = require('@react-pdf/renderer');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { buildMemberCardPdf } = require('../documents/pdf-templates/member-card');

      const pdfDoc = buildMemberCardPdf(
        {
          member: {
            namaLengkap: data.memberData.namaLengkap,
            nomorAnggota: data.memberData.nomorAnggota,
            tempatLahir: data.memberData.tempatLahir,
            tanggalLahir: data.memberData.tanggalLahir,
            jenisKelamin: data.memberData.jenisKelamin || 'L',
            tingkat: data.memberData.tingkat,
            tempatDadar: data.memberData.tempatDadar,
            tahunDadar: data.memberData.tahunDadar,
            ranting: data.memberData.ranting,
            wilayah: data.memberData.wilayah,
            distrik: data.memberData.distrik,
            statusKeanggotaan: data.memberData.statusKeanggotaan,
          },
          cardConfig: {
            nomorDokumen: data.card.nomorDokumen,
            qrDataUrl: data.qrDataUrl,
            verificationUrl: data.card.verificationUrl,
            signers: data.card.signers,
            signerName: data.card.signerName,
            signerTitle: data.card.signerTitle,
          },
          photoDataUrl: await this.resolvePhotoDataUrl(data.memberData.fotoPath, true),
          signatureDataUrl: await this.resolvePhotoDataUrl(data.card.signatureImage),
          stampDataUrl: await this.resolvePhotoDataUrl(data.card.stampImage),
          levelVisual: data.levelVisual,
        },
        opts,
      );

      return await ReactPDF.renderToBuffer(pdfDoc);
    } catch (error) {
      this.logger.error('PDF generation failed, returning JSON fallback:', (error as Error).message);
      throw new Error('PDF generation requires react-pdf setup. Use /digital-card JSON endpoint instead.');
    }
  }

  async getDigitalCardPdf(memberId: string, scope?: UserScope, user?: SelfScopeUser): Promise<Buffer> {
    const { card, memberData, verificationUrl, levelVisual } = await this.prepareDigitalCardData(memberId, scope, user);
    const qrDataUrl = await this.buildQr(verificationUrl);
    return this.renderCardPdf({ card, memberData, verificationUrl, levelVisual, qrDataUrl });
  }

  private async prepareDigitalCardData(memberId: string, scope?: UserScope, user?: SelfScopeUser) {
    // Anggota hanya boleh ambil kartu miliknya sendiri (admin dicakup oleh scope)
    await assertSelfMember(this.prisma as any, user, memberId);

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
      alamatDistrik: member.ranting?.wilayah?.distrik?.alamat,
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

    const levelVisual = await this.tingkatanService.resolveLevelVisual(member.tingkat);

    return { card, memberData, verificationUrl: card.verificationUrl, levelVisual };
  }
}
