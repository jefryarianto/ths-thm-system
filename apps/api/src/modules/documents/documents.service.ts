import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { documentReadyEmail } from '../../mail/email-templates';
import {
  GenerateDocumentDto,
  BatchGenerateDocumentDto,
  DocumentFilterDto,
} from './dto/document.dto';
import { UserScope } from '../../common/interfaces/user-scope.interface';
import { ScopeHelper } from '../../common/utils/scope-helpers';
import { CacheService } from '../../common/services/cache.service';
import { MemberMailService } from '../../common/services/member-mail.service';
import { paginate } from '../../common/utils/pagination';
import * as QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as fs from 'fs';

export interface AspectScore {
  name: string;
  score: string | number;
  items: string[];
}

export interface GenerateCertificateDto {
  memberId: string;
  eventTitle: string;
  location: string;
  finalScore: string | number;
  predicate: string;
  aspects: AspectScore[];
  signerName?: string;
  signerTitle?: string;
  pastorName?: string;
  pastorTitle?: string;
}

export interface GenerateAwardDto {
  memberId: string;
  awardTitle: string;
  description: string;
  signerName?: string;
  signerTitle?: string;
}

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);
  private readonly outputDir: string;
  private readonly CACHE_PREFIX = 'documents:';

  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeHelper: ScopeHelper,
    private readonly cache: CacheService,
    private readonly memberMailService: MemberMailService,
  ) {
    this.outputDir = path.resolve('storage', 'documents');
    fs.mkdirSync(this.outputDir, { recursive: true });
  }

  async findAll(query: DocumentFilterDto, scope?: UserScope) {
    const cacheKey = `${this.CACHE_PREFIX}list:${scope?.rantingId || 'all'}:${query.page || 1}:${query.limit || 10}:${query.tipe || ''}:${query.anggotaId || ''}`;

    return this.cache.getOrSet(
      cacheKey,
      async () => {
        const scopeFilter = this.scopeHelper.buildIndirectScopeFilter(scope || {}, 'anggota');
        const where: Record<string, unknown> = { ...scopeFilter };
        if (query.tipe) where.tipe = query.tipe;
        if (query.anggotaId) where.anggotaId = query.anggotaId;

        return paginate(this.prisma.dokumen, where, {
          page: query.page,
          limit: query.limit,
          orderBy: { createdAt: 'desc' },
          include: { anggota: { select: { nomorAnggota: true, namaLengkap: true } } },
        });
      },
      30,
    );
  }

  async findOne(id: string, scope?: UserScope) {
    const doc = await this.prisma.dokumen.findUnique({
      where: { id },
      include: { qrValidation: true, anggota: { select: { rantingId: true } } },
    });
    if (!doc) throw new NotFoundException('Dokumen tidak ditemukan');
    if (
      scope &&
      !(await this.scopeHelper.hasAccessToResourceAsync(this.prisma, scope, doc.anggota?.rantingId))
    ) {
      throw new ForbiddenException('Akses ditolak: diluar cakupan wilayah Anda');
    }
    return { success: true, data: doc };
  }

  async generate(dto: GenerateDocumentDto) {
    const token = uuidv4();
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/api/documents/verify/${token}`;
    const nomorDokumen = `DOC-${new Date().getFullYear()}-${uuidv4().slice(0, 8).toUpperCase()}`;

    const doc = await this.prisma.dokumen.create({
      data: {
        anggotaId: dto.memberId,
        tipe: dto.type as never,
        nomorDokumen,
        verificationUrl,
        signatureId: dto.signatureId,
        stampId: dto.stampId,
        status: 'generated',
      },
    });

    await this.prisma.qRValidation.create({
      data: { dokumenId: doc.id, token, isValid: true },
    });

    const qrDataUrl = await QRCode.toDataURL(verificationUrl, { width: 200, margin: 2 });

    try {
      const member = await this.prisma.anggota.findUnique({
        where: { id: dto.memberId },
        include: { ranting: { include: { wilayah: { include: { distrik: true } } } } },
      });

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { buildPdfDocument } = require('./pdf-generator');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const ReactPDF = require('@react-pdf/renderer');

      const PdfDoc = buildPdfDocument({
        type: dto.type,
        nomorDokumen,
        member,
        qrDataUrl,
      });

      if (PdfDoc) {
        const pdfStream = await ReactPDF.renderToStream(PdfDoc);
        const fileName = `${nomorDokumen}.pdf`;
        const filePath = path.join(this.outputDir, fileName);
        const writeStream = fs.createWriteStream(filePath);
        pdfStream.pipe(writeStream);

        await new Promise<void>((resolve, reject) => {
          writeStream.on('finish', resolve);
          writeStream.on('error', reject);
        });

        await this.prisma.dokumen.update({
          where: { id: doc.id },
          data: { filePath },
        });
      }
    } catch (pdfError) {
      console.warn(
        'PDF generation skipped (react-pdf renderer may need setup):',
        (pdfError as Error).message,
      );
    }

    // Send notification email if member has email (method handles errors internally)
    if (dto.memberId) {
      this.sendDocumentReadyEmail(dto.memberId, dto.type, nomorDokumen);
    }

    this.cache.invalidatePrefix(this.CACHE_PREFIX);
    return { success: true, data: doc, message: 'Dokumen berhasil digenerate' };
  }

  async batchGenerate(dto: BatchGenerateDocumentDto) {
    const results = [];
    for (const memberId of dto.memberIds || []) {
      const result = await this.generate({
        memberId,
        type: dto.type,
        signatureId: dto.signatureId,
        stampId: dto.stampId,
      });
      results.push(result);
    }
    return {
      success: true,
      data: { generated: results.length },
      message: `${results.length} dokumen berhasil digenerate`,
    };
  }

  async remove(id: string, scope?: UserScope) {
    if (scope) {
      const doc = await this.prisma.dokumen.findUnique({
        where: { id },
        include: { anggota: { select: { rantingId: true } } },
      });
      if (!doc) throw new NotFoundException('Dokumen tidak ditemukan');
      if (
        !(await this.scopeHelper.hasAccessToResourceAsync(
          this.prisma,
          scope,
          doc.anggota?.rantingId,
        ))
      ) {
        throw new ForbiddenException('Akses ditolak: diluar cakupan wilayah Anda');
      }
    }

    await this.prisma.dokumen.update({ where: { id }, data: { status: 'revoked' } });
    this.cache.invalidatePrefix(this.CACHE_PREFIX);
    return { success: true, message: 'Dokumen berhasil dihapus' };
  }

  private sendDocumentReadyEmail(memberId: string, docType: string, nomorDokumen: string): void {
    this.memberMailService.sendToMemberWithArgs(
      memberId,
      documentReadyEmail as (nama: string, ...args: string[]) => { subject: string; html: string },
      [docType, nomorDokumen],
      { template: 'documentReadyEmail' },
      'documents',
      {
        docType,
        nomorDokumen,
      },
    );
  }

  async getTypes() {
    return {
      success: true,
      data: [
        {
          type: 'kartu_anggota',
          label: 'Kartu Anggota',
          description: 'Kartu identitas anggota THS-THM',
        },
        {
          type: 'sertifikat_pendadaran',
          label: 'Sertifikat Pendadaran',
          description: 'Sertifikat kelulusan pendadaran',
        },
        {
          type: 'sertifikat_pelatihan',
          label: 'Sertifikat Pelatihan',
          description: 'Sertifikat keikutsertaan pelatihan',
        },
        {
          type: 'piagam_prestasi',
          label: 'Piagam Prestasi',
          description: 'Piagam penghargaan prestasi',
        },
      ],
    };
  }

  async verifyQR(dokumenId: string) {
    const qr = await this.prisma.qRValidation.findUnique({
      where: { dokumenId },
      include: {
        dokumen: { include: { anggota: { select: { nomorAnggota: true, namaLengkap: true } } } },
      },
    });

    if (!qr) return { success: false, message: 'QR code tidak valid' };
    if (!qr.isValid) return { success: false, message: 'Dokumen sudah tidak berlaku' };

    await this.prisma.qRValidation.update({
      where: { id: qr.id },
      data: { scannedAt: new Date(), scanCount: { increment: 1 } },
    });

    return {
      success: true,
      data: {
        valid: true,
        dokumenId: qr.dokumenId,
        tipe: qr.dokumen.tipe,
        nomorDokumen: qr.dokumen.nomorDokumen,
        anggota: qr.dokumen.anggota,
        firstScanned: qr.scanCount === 0,
      },
    };
  }

  // ── Generate Certificate (Sertifikat Pendadaran) ──

  async generateCertificate(dto: GenerateCertificateDto, scope?: UserScope) {
    const member = await this.prisma.anggota.findUnique({
      where: { id: dto.memberId },
      include: { ranting: { include: { wilayah: { include: { distrik: true } } } } },
    });
    if (!member) throw new NotFoundException('Anggota tidak ditemukan');

    // Create document record
    const token = uuidv4();
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify/${token}`;
    const nomorDokumen = `SPD-${new Date().getFullYear()}-${uuidv4().slice(0, 8).toUpperCase()}`;

    const doc = await this.prisma.dokumen.create({
      data: {
        anggotaId: dto.memberId,
        tipe: 'sertifikat_pendadaran',
        nomorDokumen,
        verificationUrl,
        status: 'generated',
      },
    });

    await this.prisma.qRValidation.create({
      data: { dokumenId: doc.id, token, isValid: true },
    });

    const qrDataUrl = await QRCode.toDataURL(verificationUrl, { width: 200, margin: 2 });

    // Generate PDF
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const ReactPDF = require('@react-pdf/renderer');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { buildCertificatePdf } = require('./pdf-templates/certificate');

      const pdfDoc = buildCertificatePdf({
        recipientName: member.namaLengkap,
        certificateNumber: nomorDokumen,
        eventTitle: dto.eventTitle,
        location: dto.location,
        ranting: member.ranting?.nama || '-',
        wilayah: member.ranting?.wilayah?.nama || '-',
        distrik: member.ranting?.wilayah?.distrik?.nama || '-',
        finalScore: dto.finalScore,
        predicate: dto.predicate,
        status: 'Lulus',
        issuedDate: new Date().toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }),
        signerName: dto.signerName || process.env.SIGNER_NAME || 'Koordinator Distrik',
        signerTitle: dto.signerTitle || process.env.SIGNER_TITLE || 'THS-THM',
        pastorName: dto.pastorName || process.env.PASTOR_NAME || 'Pastor Moderator',
        pastorTitle: dto.pastorTitle || process.env.PASTOR_TITLE || 'THS-THM',
        aspects: dto.aspects,
        qrDataUrl,
      });

      const pdfBuffer = await ReactPDF.renderToBuffer(pdfDoc);
      const fileName = `${nomorDokumen}.pdf`;
      const filePath = path.join(this.outputDir, fileName);
      fs.writeFileSync(filePath, pdfBuffer);

      await this.prisma.dokumen.update({
        where: { id: doc.id },
        data: { filePath },
      });
    } catch (pdfError) {
      this.logger.warn('Certificate PDF generation error:', (pdfError as Error).message);
    }

    // Send notification
    this.sendDocumentReadyEmail(dto.memberId, 'sertifikat_pendadaran', nomorDokumen);

    this.cache.invalidatePrefix(this.CACHE_PREFIX);
    return {
      success: true,
      data: doc,
      message: 'Sertifikat pendadaran berhasil digenerate',
    };
  }

  async getCertificatePdf(memberId: string, dto: GenerateCertificateDto, scope?: UserScope): Promise<Buffer> {
    const member = await this.prisma.anggota.findUnique({
      where: { id: memberId },
      include: { ranting: { include: { wilayah: { include: { distrik: true } } } } },
    });
    if (!member) throw new NotFoundException('Anggota tidak ditemukan');

    const token = uuidv4();
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify/${token}`;
    const nomorDokumen = `SPD-${new Date().getFullYear()}-${uuidv4().slice(0, 8).toUpperCase()}`;
    const qrDataUrl = await QRCode.toDataURL(verificationUrl, { width: 200, margin: 2 });

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ReactPDF = require('@react-pdf/renderer');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { buildCertificatePdf } = require('./pdf-templates/certificate');

    const pdfDoc = buildCertificatePdf({
      recipientName: member.namaLengkap,
      certificateNumber: nomorDokumen,
      eventTitle: dto.eventTitle,
      location: dto.location,
      ranting: member.ranting?.nama || '-',
      wilayah: member.ranting?.wilayah?.nama || '-',
      distrik: member.ranting?.wilayah?.distrik?.nama || '-',
      finalScore: dto.finalScore,
      predicate: dto.predicate,
      status: 'Lulus',
      issuedDate: new Date().toLocaleDateString('id-ID', {
        day: 'numeric', month: 'long', year: 'numeric',
      }),
      signerName: dto.signerName || process.env.SIGNER_NAME || 'Koordinator Distrik',
      signerTitle: dto.signerTitle || process.env.SIGNER_TITLE || 'THS-THM',
      pastorName: dto.pastorName || process.env.PASTOR_NAME || 'Pastor Moderator',
      pastorTitle: dto.pastorTitle || process.env.PASTOR_TITLE || 'THS-THM',
      aspects: dto.aspects,
      qrDataUrl,
    });

    return ReactPDF.renderToBuffer(pdfDoc);
  }

  async getCertificateImage(memberId: string, dto: GenerateCertificateDto, scope?: UserScope): Promise<Buffer> {
    const pdfBuffer = await this.getCertificatePdf(memberId, dto, scope);
    const { pdfToPng } = require('./pdf-templates/pdf-to-image');
    return pdfToPng(pdfBuffer);
  }

  // ── Generate Award (Piagam Prestasi) ──

  async generateAward(dto: GenerateAwardDto, scope?: UserScope) {
    const member = await this.prisma.anggota.findUnique({
      where: { id: dto.memberId },
      include: { ranting: { include: { wilayah: { include: { distrik: true } } } } },
    });
    if (!member) throw new NotFoundException('Anggota tidak ditemukan');

    const token = uuidv4();
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify/${token}`;
    const nomorDokumen = `PP-${new Date().getFullYear()}-${uuidv4().slice(0, 8).toUpperCase()}`;

    const doc = await this.prisma.dokumen.create({
      data: {
        anggotaId: dto.memberId,
        tipe: 'piagam_prestasi',
        nomorDokumen,
        verificationUrl,
        status: 'generated',
      },
    });

    await this.prisma.qRValidation.create({
      data: { dokumenId: doc.id, token, isValid: true },
    });

    const qrDataUrl = await QRCode.toDataURL(verificationUrl, { width: 200, margin: 2 });

    // Generate PDF using existing pdf-generator with piagam type
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { buildPdfDocument } = require('./pdf-generator');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const ReactPDF = require('@react-pdf/renderer');

      const PdfDoc = buildPdfDocument({
        type: 'piagam_prestasi',
        nomorDokumen,
        member: {
          namaLengkap: member.namaLengkap,
          nomorAnggota: member.nomorAnggota,
          tingkat: member.tingkat,
          ranting: member.ranting,
        },
        qrDataUrl,
      });

      if (PdfDoc) {
        const pdfBuffer = await ReactPDF.renderToBuffer(PdfDoc);
        const fileName = `${nomorDokumen}.pdf`;
        const filePath = path.join(this.outputDir, fileName);
        fs.writeFileSync(filePath, pdfBuffer);

        await this.prisma.dokumen.update({
          where: { id: doc.id },
          data: { filePath },
        });
      }
    } catch (pdfError) {
      this.logger.warn('Award PDF generation error:', (pdfError as Error).message);
    }

    this.sendDocumentReadyEmail(dto.memberId, 'piagam_prestasi', nomorDokumen);
    this.cache.invalidatePrefix(this.CACHE_PREFIX);

    return {
      success: true,
      data: doc,
      message: 'Piagam prestasi berhasil digenerate',
    };
  }

  async verifyByToken(token: string) {
    const qr = await this.prisma.qRValidation.findUnique({
      where: { token },
      include: {
        dokumen: { include: { anggota: { select: { nomorAnggota: true, namaLengkap: true } } } },
      },
    });

    if (!qr) return { success: false, message: 'Token QR tidak valid' };
    if (!qr.isValid) return { success: false, message: 'Dokumen sudah tidak berlaku' };

    await this.prisma.qRValidation.update({
      where: { id: qr.id },
      data: { scannedAt: new Date(), scanCount: { increment: 1 } },
    });

    return {
      success: true,
      data: {
        valid: true,
        dokumenId: qr.dokumenId,
        tipe: qr.dokumen.tipe,
        nomorDokumen: qr.dokumen.nomorDokumen,
        nomorAnggota: qr.dokumen.anggota?.nomorAnggota,
        namaAnggota: qr.dokumen.anggota?.namaLengkap,
        firstScanned: qr.scanCount === 0,
      },
    };
  }
}
