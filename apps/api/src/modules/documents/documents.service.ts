import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
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
import { PenandatanganService } from '../penandatangan/penandatangan.service';
import { DocumentBatchService } from './document-batch.service';
import { JobPayload, JobResult } from '../../common/queue/queue.interface';
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
    private readonly batchService: DocumentBatchService,
    private readonly penandatanganService: PenandatanganService,
  ) {
    this.outputDir = path.resolve('storage', 'documents');
    fs.mkdirSync(this.outputDir, { recursive: true });

    // Initialize batch queue with this service's generateSingle as processor
    this.batchService.initQueue((payload) => this.generateSingle(payload));
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
      include: {
        qrValidation: true,
        anggota: {
          select: {
            id: true,
            namaLengkap: true,
            nomorAnggota: true,
            email: true,
            noHp: true,
            rantingId: true,
          },
        },
      },
    });
    if (!doc) throw new NotFoundException('Dokumen tidak ditemukan');
    if (
      scope &&    
      !(await this.scopeHelper.hasAccessToResourceAsync(this.prisma, scope, doc.anggota?.rantingId))
    ) {
      throw new ForbiddenException('Akses ditolak: diluar cakupan wilayah Anda');
    }
    return doc;
  }

  async generate(dto: GenerateDocumentDto) {
    const token = uuidv4();
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/api/documents/verify/${token}`;
    const nomorDokumen = `DOC-${new Date().getFullYear()}-${uuidv4().slice(0, 8).toUpperCase()}`;

    const doc = await (this.prisma as any).$transaction(async (tx: any) => {
      const created = await tx.dokumen.create({
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

      await tx.qRValidation.create({
        data: { dokumenId: created.id, token, isValid: true },
      });

      return created;
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

      const signers = await this.penandatanganService.resolveSigners(dto.type);
      const PdfDoc = buildPdfDocument({
        type: dto.type,
        nomorDokumen,
        member,
        qrDataUrl,
        signers,
        template: await this.resolveTemplateTexts(dto.type),
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
    return doc;
  }

  /**
   * Process a single document generation job from the queue.
   * This is the core method called by the queue adapter.
   */
  async generateSingle(payload: JobPayload): Promise<JobResult> {
    const { memberId, type, batchId, documentJobId } = payload.data as Record<string, string>;

    try {
      await this.generate({
        memberId,
        type,
        signatureId: undefined,
        stampId: undefined,
      });

      return {
        jobId: payload.jobId,
        success: true,
        data: { batchId, documentJobId, memberId },
      };
    } catch (error) {
      return {
        jobId: payload.jobId,
        success: false,
        error: (error as Error).message,
        data: { batchId, documentJobId, memberId },
      };
    }
  }

  async batchGenerate(dto: BatchGenerateDocumentDto) {
    // Resolve member IDs from range-based filter, or use explicit memberIds
    let memberIds = dto.memberIds;
    if ((!memberIds || memberIds.length === 0) && dto.range) {
      memberIds = await this.resolveMemberIdsByRange(dto.range, dto.rantingId);
    }

    if (!memberIds || memberIds.length === 0) {
      throw new BadRequestException('Tidak ada anggota yang dipilih untuk generate dokumen');
    }

    const { batchId, totalJobs } = await this.batchService.createBatch(
      dto.type,
      memberIds,
    );

    return {
      success: true,
      data: {
        batchId,
        totalJobs,
        status: 'pending',
      },
      message: `${totalJobs} dokumen akan digenerate. Pantau progress di endpoint GET /documents/batch/${batchId}.`,
    };
  }

  /**
   * Estimate the number of members that would match a range filter.
   * Delegates to the batch service for the actual count query.
   */
  async estimateBatch(range: string, rantingId?: string): Promise<number> {
    return this.batchService.estimateBatch(range, rantingId);
  }

  /**
   * Resolve member IDs based on a range filter string.
   * Used when the frontend sends range=all_active / by_ranting / graduated_only
   * instead of explicit memberIds.
   */
  private async resolveMemberIdsByRange(range: string, rantingId?: string): Promise<string[]> {
    switch (range) {
      case 'all_active': {
        const members = await this.prisma.anggota.findMany({
          where: { statusKeanggotaan: 'aktif', deletedAt: null },
          select: { id: true },
        });
        return members.map((m) => m.id);
      }

      case 'by_ranting': {
        if (!rantingId) {
          throw new BadRequestException('rantingId diperlukan untuk filter per ranting');
        }
        const members = await this.prisma.anggota.findMany({
          where: { rantingId, statusKeanggotaan: 'aktif', deletedAt: null },
          select: { id: true },
        });
        return members.map((m) => m.id);
      }

      case 'graduated_only': {
        // Members associated with graduated CalonAnggota via NilaiPendadaran
        const evaluatedIds = await this.prisma.nilaiPendadaran.findMany({
          where: { anggotaId: { not: null } },
          select: { anggotaId: true },
          distinct: ['anggotaId'],
        });
        const memberIdSet = new Set(
          evaluatedIds.map((n) => n.anggotaId).filter((id): id is string => id !== null),
        );
        return Array.from(memberIdSet);
      }

      case 'by_ids':
        throw new BadRequestException(
          'memberIds diperlukan untuk range=by_ids. Gunakan field memberIds di body.',
        );

      default:
        return [];
    }
  }

  /**
   * Resolve file PDF/PNG tersimpan untuk satu dokumen (dari `filePath`).
   * Validasi scope + pastikan path aman (hanya basename di dalam outputDir).
   * Status dokumen di-update ke `downloaded` saat file diminta.
   */
  async getDocumentFile(id: string, scope?: UserScope): Promise<{ filePath: string; nomorDokumen: string; tipe: string }> {
    const doc = await this.findOne(id, scope);
    if (!doc.filePath) {
      throw new NotFoundException('File dokumen belum tersedia. Generate ulang dokumen terlebih dahulu.');
    }

    // Keamanan: abaikan path absolut dari DB, hanya ambil nama file lalu gabung ke outputDir.
    const fileName = path.basename(doc.filePath);
    const filePath = path.join(this.outputDir, fileName);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('File dokumen tidak ditemukan di penyimpanan.');
    }

    // Tandai sebagai diunduh
    await this.prisma.dokumen.update({
      where: { id },
      data: { status: 'downloaded' },
    });
    this.cache.invalidatePrefix(this.CACHE_PREFIX);

    return { filePath, nomorDokumen: doc.nomorDokumen, tipe: doc.tipe };
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
    return [
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
    ];
  }

  async verifyQR(dokumenId: string) {
    const qr = await this.prisma.qRValidation.findUnique({
      where: { dokumenId },
      include: {
        dokumen: { include: { anggota: { select: { nomorAnggota: true, namaLengkap: true } } } },
      },
    });

    if (!qr) throw new NotFoundException('QR code tidak valid');
    if (!qr.isValid) throw new NotFoundException('Dokumen sudah tidak berlaku');

    await this.prisma.qRValidation.update({
      where: { id: qr.id },
      data: { scannedAt: new Date(), scanCount: { increment: 1 } },
    });

    return {
      valid: true,
      dokumenId: qr.dokumenId,
      tipe: qr.dokumen.tipe,
      nomorDokumen: qr.dokumen.nomorDokumen,
      anggota: qr.dokumen.anggota,
      firstScanned: qr.scanCount === 0,
    };
  }

  /**
   * Resolve nama penandatangan untuk sertifikat/piagam: prioritas dari tabel
   * `penandatangans` (yang aktif), fallback ke env SIGNER_NAME/SIGNER_TITLE,
   * lalu default.
   */
  private async resolveSigner() {
    return this.penandatanganService.resolveActive();
  }

  /**
   * Baca override teks template dokumen dari tabel `settings`
   * (halaman Settings → Template Dokumen). Nilai kosong → pakai bawaan template.
   */
  private async resolveTemplateTexts(type: string) {
    const keys = [
      'docTemplate.orgNama',
      'docTemplate.orgAlamat',
      'docTemplate.footer',
      `docTemplate.${type}.judul`,
      `docTemplate.${type}.subJudul`,
    ];
    const rows = await this.prisma.setting.findMany({ where: { key: { in: keys } } });
    const map: Record<string, string> = {};
    for (const r of rows) {
      map[r.key] = String(r.value ?? '');
    }
    return {
      orgNama: map['docTemplate.orgNama'] || undefined,
      orgAlamat: map['docTemplate.orgAlamat'] || undefined,
      footer: map['docTemplate.footer'] || undefined,
      judul: map[`docTemplate.${type}.judul`] || undefined,
      subJudul: map[`docTemplate.${type}.subJudul`] || undefined,
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

    const doc = await (this.prisma as any).$transaction(async (tx: any) => {
      const created = await tx.dokumen.create({
        data: {
          anggotaId: dto.memberId,
          tipe: 'sertifikat_pendadaran',
          nomorDokumen,
          verificationUrl,
          status: 'generated',
        },
      });

      await tx.qRValidation.create({
        data: { dokumenId: created.id, token, isValid: true },
      });

      return created;
    });

    const qrDataUrl = await QRCode.toDataURL(verificationUrl, { width: 200, margin: 2 });

    // Generate PDF
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const ReactPDF = require('@react-pdf/renderer');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { buildCertificatePdf } = require('./pdf-templates/certificate');

      const signer = await this.resolveSigner();
      const hasMapping = await this.penandatanganService.hasDocSigners('sertifikat_pendadaran');
      const signers = hasMapping
        ? await this.penandatanganService.resolveSigners('sertifikat_pendadaran')
        : [
            {
              signerName: dto.pastorName || process.env.PASTOR_NAME || 'Pastor Moderator',
              signerTitle: dto.pastorTitle || process.env.PASTOR_TITLE || 'THS-THM',
            },
            { signerName: dto.signerName || signer.signerName, signerTitle: dto.signerTitle || signer.signerTitle },
          ];
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
        signers,
        aspects: dto.aspects,
        qrDataUrl,
        template: await this.resolveTemplateTexts('sertifikat_pendadaran'),
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
    return doc;
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

    const signer = await this.resolveSigner();
    const hasMapping = await this.penandatanganService.hasDocSigners('sertifikat_pendadaran');
    const signers = hasMapping
      ? await this.penandatanganService.resolveSigners('sertifikat_pendadaran')
      : [
          {
            signerName: dto.pastorName || process.env.PASTOR_NAME || 'Pastor Moderator',
            signerTitle: dto.pastorTitle || process.env.PASTOR_TITLE || 'THS-THM',
          },
          { signerName: dto.signerName || signer.signerName, signerTitle: dto.signerTitle || signer.signerTitle },
        ];
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
      signers,
      aspects: dto.aspects,
      qrDataUrl,
      template: await this.resolveTemplateTexts('sertifikat_pendadaran'),
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

    const doc = await (this.prisma as any).$transaction(async (tx: any) => {
      const created = await tx.dokumen.create({
        data: {
          anggotaId: dto.memberId,
          tipe: 'piagam_prestasi',
          nomorDokumen,
          verificationUrl,
          status: 'generated',
        },
      });

      await tx.qRValidation.create({
        data: { dokumenId: created.id, token, isValid: true },
      });

      return created;
    });

    const qrDataUrl = await QRCode.toDataURL(verificationUrl, { width: 200, margin: 2 });

    // Generate PDF using existing pdf-generator with piagam type
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { buildPdfDocument } = require('./pdf-generator');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const ReactPDF = require('@react-pdf/renderer');

      const signers = dto.signerName
        ? [{ signerName: dto.signerName, signerTitle: dto.signerTitle || '' }]
        : await this.penandatanganService.resolveSigners('piagam_prestasi');
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
        signers,
        template: await this.resolveTemplateTexts('piagam_prestasi'),
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
    return doc;
  }

  async verifyByToken(token: string) {
    const qr = await this.prisma.qRValidation.findUnique({
      where: { token },
      include: {
        dokumen: { include: { anggota: { select: { nomorAnggota: true, namaLengkap: true } } } },
      },
    });

    if (!qr) throw new NotFoundException('Token QR tidak valid');
    if (!qr.isValid) throw new NotFoundException('Dokumen sudah tidak berlaku');

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
