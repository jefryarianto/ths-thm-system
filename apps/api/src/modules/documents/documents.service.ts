import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class DocumentsService {
  private readonly outputDir: string;

  constructor(private readonly prisma: PrismaService) {
    this.outputDir = path.resolve('storage', 'documents');
    fs.mkdirSync(this.outputDir, { recursive: true });
  }

  async findAll(query: any) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const where: any = {};
    if (query.tipe) where.tipe = query.tipe;
    if (query.anggotaId) where.anggotaId = query.anggotaId;

    const [data, total] = await Promise.all([
      this.prisma.dokumen.findMany({ where, skip: (page - 1) * limit, take: limit, include: { anggota: { select: { nomorAnggota: true, namaLengkap: true } } }, orderBy: { createdAt: 'desc' } }),
      this.prisma.dokumen.count({ where }),
    ]);
    return { success: true, data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const doc = await this.prisma.dokumen.findUnique({ where: { id }, include: { qrValidation: true } });
    if (!doc) throw new NotFoundException('Dokumen tidak ditemukan');
    return { success: true, data: doc };
  }

  async generate(dto: any) {
    const token = uuidv4();
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/api/documents/verify/${token}`;
    const nomorDokumen = `DOC-${new Date().getFullYear()}-${uuidv4().slice(0, 8).toUpperCase()}`;

    const doc = await this.prisma.dokumen.create({
      data: {
        anggotaId: dto.memberId,
        tipe: dto.type,
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

      const { buildPdfDocument } = require('./pdf-generator');
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
      console.warn('PDF generation skipped (react-pdf renderer may need setup):', (pdfError as Error).message);
    }

    return { success: true, data: doc, message: 'Dokumen berhasil digenerate' };
  }

  async batchGenerate(dto: any) {
    const results = [];
    for (const memberId of dto.memberIds || []) {
      const result = await this.generate({ ...dto, memberId });
      results.push(result);
    }
    return { success: true, data: { generated: results.length }, message: `${results.length} dokumen berhasil digenerate` };
  }

  async remove(id: string) {
    await this.prisma.dokumen.update({ where: { id }, data: { status: 'revoked' } });
    return { success: true, message: 'Dokumen berhasil dihapus' };
  }

  async getTypes() {
    return {
      success: true,
      data: [
        { type: 'kartu_anggota', label: 'Kartu Anggota', description: 'Kartu identitas anggota THS-THM' },
        { type: 'sertifikat_pendadaran', label: 'Sertifikat Pendadaran', description: 'Sertifikat kelulusan pendadaran' },
        { type: 'sertifikat_pelatihan', label: 'Sertifikat Pelatihan', description: 'Sertifikat keikutsertaan pelatihan' },
        { type: 'piagam_prestasi', label: 'Piagam Prestasi', description: 'Piagam penghargaan prestasi' },
      ],
    };
  }

  async verifyQR(dokumenId: string) {
    const qr = await this.prisma.qRValidation.findUnique({
      where: { dokumenId },
      include: { dokumen: { include: { anggota: { select: { nomorAnggota: true, namaLengkap: true } } } } },
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

  async verifyByToken(token: string) {
    const qr = await this.prisma.qRValidation.findUnique({
      where: { token },
      include: { dokumen: { include: { anggota: { select: { nomorAnggota: true, namaLengkap: true } } } } },
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