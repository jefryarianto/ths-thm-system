import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserScope } from '../../common/interfaces/user-scope.interface';
import { ScopeHelper } from '../../common/utils/scope-helpers';
import { PenandatanganService } from '../penandatangan/penandatangan.service';
import { TingkatanService } from '../tingkatan/tingkatan.service';
import { assertSelfMember, SelfScopeUser } from '../../common/utils/self-scope.helper';
import { CacheService } from '../../common/services/cache.service';
import * as QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { signQrToken, normalizeVerificationUrl } from '../../common/utils/qr-token.util';

export function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Samarkan alamat IP pada log (privasi) — hanya tampilkan 3 oktet pertama. */
function maskIp(ip?: string | null): string | null {
  if (!ip) return null;
  const parts = ip.split('.');
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.${parts[2]}.x`;
  return ip.length > 24 ? `${ip.slice(0, 24)}...` : ip;
}

/**
 * SVG watermark diagonal (anti-fotokopi digital): teks diulang miring -28°
 * menutupi seluruh kanvas, semi-transparan. Dipakai pada PNG hasil simpan,
 * bukan pada preview di layar.
 */
export function buildCardWatermarkSvg(width: number, height: number, text: string): string {
  const fontSize = Math.max(22, Math.round(width / 34));
  const lineHeight = fontSize * 2.4;
  const approxCharWidth = fontSize * 0.62;
  const repeats = Math.ceil((width + height * 1.4) / Math.max(1, text.length * approxCharWidth)) + 1;
  const full = Array.from({ length: repeats }, () => xmlEscape(text)).join('      ');
  const lines: string[] = [];
  for (let y = -height; y < height + lineHeight; y += lineHeight) {
    lines.push(`<text x="-${Math.round(width)}" y="${Math.round(y)}">${full}</text>`);
  }
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<g fill="rgba(26,54,93,0.08)" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="${fontSize}">` +
    `<g transform="rotate(-28 ${width / 2} ${height / 2})">${lines.join('')}</g></g></svg>`
  );
}

@Injectable()
export class MembersDigitalCardService {
  private readonly logger = new Logger(MembersDigitalCardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeHelper: ScopeHelper,
    private readonly penandatanganService: PenandatanganService,
    private readonly tingkatanService: TingkatanService,
    private readonly cache: CacheService,
  ) {}

  /**
   * Baca foto anggota dari disk sebagai data URL base64 untuk ditanam di PDF.
   * Fallback ke null bila file tidak ada / gagal dibaca (placeholder 'FOTO' dipakai).
   * Bila `maxDim` diberikan, gambar diperkecil via sharp (tanpa melebar) agar SVG
   * yang disisipkan tidak membengkak/login librsvg/sharp kehabisan memori.
   */
  private async resolvePhotoDataUrl(
    fotoPath?: string | null,
    preferBg = false,
    maxDim?: number,
  ): Promise<string | null> {
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
      const isPngOrWebp = ext === '.png' || ext === '.webp';
      const mime = isPngOrWebp ? 'image/png' : ext === '.jpeg' || ext === '.jpg' ? 'image/jpeg' : 'image/jpeg';
      let buffer: Buffer = fs.readFileSync(targetPath);

      // Perkecil gambar bila melebihi budget — dikecualikan pakai JPEG kecuali aslinya
      // PNG/WebP (transparansi stempel/ttd harus dipertahankan).
      if (maxDim) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const sharpApi = require('sharp');
          const meta = await sharpApi(buffer).metadata();
          const longest = Math.max(meta.width || 0, meta.height || 0);
          if (longest > maxDim) {
            buffer = await sharpApi(buffer)
              .resize({
                width: (meta.width || 0) >= (meta.height || 0) ? maxDim : undefined,
                height: (meta.width || 0) >= (meta.height || 0) ? undefined : maxDim,
                fit: 'inside',
                withoutEnlargement: true,
              })
              .toFormat(isPngOrWebp ? 'png' : 'jpeg', isPngOrWebp ? {} : { quality: 85 })
              .toBuffer();
          }
        } catch {
          // Bila downscale gagal, pakai buffer asli
        }
      }

      return `data:${mime};base64,${buffer.toString('base64')}`;
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

  /**
   * Resolve gambar tanda tangan & stempel untuk distrik anggota:
   * prioritas yang aktif di distrik anggota, fallback ke yang global.
   */
  private async resolveSignatureStamp(distrikId?: string) {
    try {
      const [signature, stamp] = await Promise.all([
        this.findActiveScoped('tandaTangan', distrikId),
        this.findActiveScoped('stempel', distrikId),
      ]);
      return {
        signatureImage: signature?.imagePath || null,
        stampImage: stamp?.imagePath || null,
      };
    } catch {
      return { signatureImage: null, stampImage: null };
    }
  }

  /**
   * findFirst aktif untuk model tandaTangan/stempel: distrik dulu, lalu global.
   * Delegate dipanggil konkret per-cabang — union delegate Prisma tidak callable
   * langsung karena signature findFirst-nya tidak identik antar model.
   */
  private async findActiveScoped(model: 'tandaTangan' | 'stempel', distrikId?: string) {
    const findFirst = (args: {
      where: { isActive: boolean; distrikId: string | null };
      orderBy: { updatedAt: 'desc' };
    }) =>
      model === 'tandaTangan'
        ? this.prisma.tandaTangan.findFirst(args)
        : this.prisma.stempel.findFirst(args);

    if (distrikId) {
      const scoped = await findFirst({
        where: { isActive: true, distrikId },
        orderBy: { updatedAt: 'desc' },
      });
      if (scoped) return scoped;
    }
    return findFirst({
      where: { isActive: true, distrikId: null },
      orderBy: { updatedAt: 'desc' },
    });
  }

    /**
   * Template kartu aktif untuk distrik anggota (desain upload per distrik) —
   * distrik dulu, lalu global, lalu null = desain bawaan. Cache 5 menit per scope.
   */
  private async resolveActiveTemplate(
    distrikId?: string,
  ): Promise<{ id: string; name: string; label: string | null; frontImage: string | null; backImage: string | null; overlayConfig: unknown } | null> {
    const cacheKey = `digital-card:template:active:${distrikId || 'global'}`;
    const cached = this.cache.get<{ id: string; name: string; label: string | null; frontImage: string | null; backImage: string | null; overlayConfig: unknown } | null>(cacheKey);
    if (cached !== undefined) {
      return cached === null ? null : cached;
    }
    try {
      let template = null;
      if (distrikId) {
        template = await this.prisma.cardTemplate.findFirst({
          where: { isActive: true, distrikId },
          orderBy: { updatedAt: 'desc' },
        });
      }
      if (!template) {
        template = await this.prisma.cardTemplate.findFirst({
          where: { isActive: true, distrikId: null },
          orderBy: { updatedAt: 'desc' },
        });
      }
      if (!template) {
        this.cache.set(cacheKey, null, 300_000);
        return null;
      }
      const result: { id: string; name: string; label: string | null; frontImage: string | null; backImage: string | null; overlayConfig: unknown } = {
        id: template.id,
        name: template.name,
        label: template.label,
        frontImage: template.frontImage,
        backImage: template.backImage,
        overlayConfig: template.overlayConfig,
      };
      this.cache.set(cacheKey, result, 300_000);
      return result;
    } catch {
      return null;
    }
  }

  /**
   * Temukan dokumen kartu anggota (termasuk yang telah dicabut) untuk anggota.
   * Guard scope: anggota hanya kartu sendiri; admin dicakup wilayah.
   */
  private async findKtaDocument(memberId: string, scope?: UserScope, user?: SelfScopeUser) {
    await assertSelfMember(this.prisma, user, memberId);
    const member = await this.prisma.anggota.findUnique({
      where: { id: memberId, deletedAt: null },
      select: { id: true, rantingId: true },
    });
    if (!member) throw new NotFoundException('Anggota tidak ditemukan');
    if (
      scope &&
      !(await this.scopeHelper.hasAccessToResourceAsync(this.prisma, scope, member.rantingId))
    ) {
      throw new ForbiddenException('Akses ditolak: diluar cakupan wilayah Anda');
    }
    const doc = await this.prisma.dokumen.findFirst({
      where: { anggotaId: memberId, tipe: 'kartu_anggota' },
      orderBy: { createdAt: 'desc' },
      include: {
        qrValidations: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    if (!doc) throw new NotFoundException('Kartu anggota belum dibuat');
    const qr = doc.qrValidations[0];
    if (!qr) throw new NotFoundException('QR kartu belum terdaftar');
    return { doc, qr };
  }

  /** Ringkasan keamanan QR & riwayat pemindaian untuk dashboard admin/anggota. */
  async getCardSecurity(memberId: string, scope?: UserScope, user?: SelfScopeUser) {
    const { doc, qr } = await this.findKtaDocument(memberId, scope, user);
    const scans = await this.prisma.qrScan.findMany({
      where: { qrValidationId: qr.id },
      orderBy: { scannedAt: 'desc' },
      take: 100,
      select: { id: true, scannedAt: true, ipAddress: true, userAgent: true },
    });
    const scanLimit = Number(process.env.QR_SCAN_LIMIT || 25);
    return {
      success: true,
      data: {
        dokumen: {
          id: doc.id,
          nomorDokumen: doc.nomorDokumen,
          status: doc.status,
        },
        qr: {
          isValid: qr.isValid,
          scanCount: qr.scanCount,
          scannedAt: qr.scannedAt?.toISOString() ?? null,
          createdAt: qr.createdAt.toISOString(),
        },
        scanLimit,
        scanLeft: Math.max(0, scanLimit - qr.scanCount),
        scanLog: scans.map((s) => ({
          id: s.id,
          scannedAt: s.scannedAt.toISOString(),
          ipAddress: maskIp(s.ipAddress),
          userAgent: s.userAgent ? s.userAgent.slice(0, 120) : null,
        })),
      },
    };
  }

  /**
   * Cabut / aktifkan kembali kartu (termasuk fisik) per anggota.
   * Cabut → semua QR (digital & fisik) dinonaktifkan + dokumen revoked.
   * Aktifkan → dokumen generated kembali + QR penerbitan terbaru diaktifkan.
   */
  async setCardActive(
    memberId: string,
    active: boolean,
    scope?: UserScope,
    user?: SelfScopeUser,
  ) {
    const { doc, qr } = await this.findKtaDocument(memberId, scope, user);
    const newStatus: 'generated' | 'revoked' = active ? 'generated' : 'revoked';
    if (active) {
      await this.prisma.$transaction([
        this.prisma.dokumen.update({ where: { id: doc.id }, data: { status: newStatus } }),
        this.prisma.qRValidation.update({ where: { id: qr.id }, data: { isValid: true } }),
      ]);
    } else {
      await this.prisma.$transaction([
        this.prisma.dokumen.update({ where: { id: doc.id }, data: { status: newStatus } }),
        this.prisma.qRValidation.updateMany({
          where: { dokumenId: doc.id, isValid: true },
          data: { isValid: false },
        }),
      ]);
    }
    return {
      success: true,
      data: {
        dokumenId: doc.id,
        status: newStatus,
        isValid: active,
      },
    };
  }

  /** Riwayat penerbitan kartu (semua QR: digital + fisik). */
  async getCardIssuances(memberId: string, scope?: UserScope, user?: SelfScopeUser) {
    await assertSelfMember(this.prisma, user, memberId);
    const member = await this.prisma.anggota.findUnique({
      where: { id: memberId, deletedAt: null },
      select: { rantingId: true },
    });
    if (!member) throw new NotFoundException('Anggota tidak ditemukan');
    if (
      scope &&
      !(await this.scopeHelper.hasAccessToResourceAsync(this.prisma, scope, member.rantingId))
    ) {
      throw new ForbiddenException('Akses ditolak: diluar cakupan wilayah Anda');
    }
    const doc = await this.prisma.dokumen.findFirst({
      where: { anggotaId: memberId, tipe: 'kartu_anggota' },
      orderBy: { createdAt: 'desc' },
      include: {
        anggota: { select: { nomorAnggota: true, namaLengkap: true } },
        qrValidations: { orderBy: { createdAt: 'desc' } },
      },
    });
    const issuances = (doc?.qrValidations ?? []).map((qr, idx, all) => ({
      id: qr.id,
      source: qr.source,
      reason: qr.reason,
      edisi: all.length - idx,
      isValid: qr.isValid,
      scanCount: qr.scanCount,
      scannedAt: qr.scannedAt?.toISOString() ?? null,
      verificationUrl: normalizeVerificationUrl(qr.verificationUrl, {
        typ: 'kta',
        src: qr.source === 'printed' ? 'printed' : 'digital',
      }),
      createdAt: qr.createdAt.toISOString(),
    }));
    return {
      success: true,
      data: {
        dokumenId: doc?.id ?? null,
        nomorDokumen: doc?.nomorDokumen ?? null,
        member: doc?.anggota
          ? { nomorAnggota: doc.anggota.nomorAnggota, namaLengkap: doc.anggota.namaLengkap }
          : null,
        issuances,
      },
    };
  }

  async getDigitalCard(memberId: string, scope?: UserScope, user?: SelfScopeUser) {
    const { card, memberData, verificationUrl, levelVisual, distrikId } = await this.prepareDigitalCardData(memberId, scope, user);
    const qrDataUrl = await this.buildQr(verificationUrl);
    const { signatureImage, stampImage } = await this.resolveSignatureStamp(distrikId);
    const template = await this.resolveActiveTemplate(distrikId);

    return {
      success: true,
      data: {
        card,
        member: memberData,
        qrCode: qrDataUrl,
        levelVisual,
        signatureImage,
        stampImage,
        /** Desain kartu aktif (null = pakai desain bawaan packages/card-design). */
        template,
      },
    };
  }

  /**
   * Timpa watermark diagonal (nama + nomor anggota) pada PNG digital.
   * Preview bersih di layar; watermark hanya pada artefak yang disimpan/diunduh.
   */
  private async applyDownloadWatermark(pngBuffer: Buffer, text: string): Promise<Buffer> {
    const sharp = require('sharp');
    const meta = await sharp(pngBuffer).metadata();
    const width = meta.width || 3566;
    const height = meta.height || 4500;
    const svg = buildCardWatermarkSvg(width, height, text);
    return sharp(pngBuffer)
      .composite([{ input: Buffer.from(svg), blend: 'over' }])
      .png()
      .toBuffer();
  }

  async getDigitalCardImage(
    memberId: string,
    scope?: UserScope,
    user?: SelfScopeUser,
    watermark = false,
  ): Promise<Buffer> {
    // PNG 2 sisi: render SVG (murni node) → sharp. SVG→PNG tak butuh binary eksternal
    // (poppler/pdf-poppler), jadi hasilnya selalu PNG valid — tidak pernah kosong.
    const { card, memberData, verificationUrl, levelVisual, distrikId } = await this.prepareDigitalCardData(memberId, scope, user);
    const qrDataUrl = await this.buildQr(verificationUrl);
    const template = await this.resolveActiveTemplate(distrikId);
    const watermarkText = `KARTU DIGITAL - ${memberData.namaLengkap} - ${memberData.nomorAnggota}`;

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const sharp = require('sharp');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { buildCardSvg } = require('../documents/pdf-templates/card-svg');
      const buildSvg = async (minimal: boolean) =>
        buildCardSvg({
          member: {
            namaLengkap: memberData.namaLengkap,
            nomorAnggota: memberData.nomorAnggota,
            jenisKelamin: memberData.jenisKelamin || 'L',
            tempatLahir: memberData.tempatLahir,
            tanggalLahir: memberData.tanggalLahir,
            tingkat: memberData.tingkat,
            tempatDadar: memberData.tempatDadar,
            tahunDadar: memberData.tahunDadar,
            ranting: memberData.ranting,
            wilayah: memberData.wilayah,
            distrik: memberData.distrik,
            alamatDistrik: memberData.alamatDistrik,
            statusKeanggotaan: memberData.statusKeanggotaan,
          },
          nomorDokumen: card.nomorDokumen,
          qrDataUrl: minimal ? '' : qrDataUrl,
          verificationUrl: card.verificationUrl,
          signers: card.signers,
          signerName: card.signerName,
          signerTitle: card.signerTitle,
          photoDataUrl: minimal ? null : await this.resolvePhotoDataUrl(memberData.fotoPath, true, 700),
          signatureDataUrl: minimal ? null : await this.resolvePhotoDataUrl(card.signatureImage, false, 320),
          stampDataUrl: minimal ? null : await this.resolvePhotoDataUrl(card.stampImage, false, 320),
          frontImageDataUrl: minimal ? null : await this.resolvePhotoDataUrl(template?.frontImage || null, false, 1800),
          backImageDataUrl: minimal ? null : await this.resolvePhotoDataUrl(template?.backImage || null, false, 1800),
          levelVisual,
          template: minimal ? null : template || null,
        });
      let svg: string;
      try {
        svg = await buildSvg(false);
      } catch (firstErr) {
        // Bila build SVG lengkap gagal (mis. data foto/template bermasalah), ulangi
        // tanpa gambar opsional — kartu tetap jadi PNG valid, bukan respons error.
        this.logger.warn(`buildCardSvg lengkap gagal (${(firstErr as Error).message}), pakai SVG minimal tanpa foto/template/stempel`);
        svg = await buildSvg(true);
      }
      // density 300 → PNG ±3566×4500 (resolusi setara pdftoppm -r 300)
      let png = await sharp(Buffer.from(svg), { density: 300 }).png().toBuffer();
      if (watermark) png = await this.applyDownloadWatermark(png, watermarkText);
      return png;
    } catch (svgErr) {
      this.logger.warn(`SVG→PNG gagal (${(svgErr as Error).message}), fallback ke PDF→poppler`);
    }

    // Fallback lama (dipakai bila sharp bermasalah di deployment tertentu)
    const pdfBuffer = await this.renderCardPdf({ card, memberData, verificationUrl, levelVisual, qrDataUrl, template }, { combined: true });
    const { pdfToPng } = require('../documents/pdf-templates/pdf-to-image');
    let fallbackPng = await pdfToPng(pdfBuffer);
    if (watermark) fallbackPng = await this.applyDownloadWatermark(fallbackPng, watermarkText);
    return fallbackPng;
  }

  private async buildQr(verificationUrl: string): Promise<string> {
    return QRCode.toDataURL(verificationUrl, {
      width: 300,
      margin: 2,
      color: { dark: '#1a365d', light: '#ffffff' },
    });
  }

  /** Bangun object props untuk renderer PDF kartu (dipakai digital & cetak fisik/batch). */
  private async cardPdfProps(data: {
    card: any;
    memberData: any;
    verificationUrl: string;
    levelVisual: any;
    qrDataUrl: string;
    template?: {
      frontImage?: string | null;
      backImage?: string | null;
      overlayConfig?: unknown;
    } | null;
  }) {
    return {
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
        alamatDistrik: data.memberData.alamatDistrik,
        statusKeanggotaan: data.memberData.statusKeanggotaan,
      },
      cardConfig: {
        nomorDokumen: data.card.nomorDokumen,
        qrDataUrl: data.qrDataUrl,
        verificationUrl: data.card.verificationUrl,
        signers: data.card.signers,
        signerName: data.card.signerName,
        signerTitle: data.card.signerTitle,
        template: data.template || null,
      },
      photoDataUrl: await this.resolvePhotoDataUrl(data.memberData.fotoPath, true, 700),
      signatureDataUrl: await this.resolvePhotoDataUrl(data.card.signatureImage, false, 320),
      stampDataUrl: await this.resolvePhotoDataUrl(data.card.stampImage, false, 320),
      levelVisual: data.levelVisual,
      frontImageDataUrl: await this.resolvePhotoDataUrl(data.template?.frontImage || null, false, 1800),
      backImageDataUrl: await this.resolvePhotoDataUrl(data.template?.backImage || null, false, 1800),
    };
  }

  private async renderCardPdf(
    data: {
      card: any;
      memberData: any;
      verificationUrl: string;
      levelVisual: any;
      qrDataUrl: string;
      template?: {
        frontImage?: string | null;
        backImage?: string | null;
        overlayConfig?: unknown;
      } | null;
    },
    opts?: { combined?: boolean },
  ): Promise<Buffer> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const ReactPDF = require('@react-pdf/renderer');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { buildMemberCardPdf } = require('../documents/pdf-templates/member-card');

      const pdfDoc = buildMemberCardPdf(await this.cardPdfProps(data), opts);

      return await ReactPDF.renderToBuffer(pdfDoc);
    } catch (error) {
      this.logger.error('PDF generation failed, returning JSON fallback:', (error as Error).message);
      throw new Error('PDF generation requires react-pdf setup. Use /digital-card JSON endpoint instead.');
    }
  }

  async getDigitalCardPdf(memberId: string, scope?: UserScope, user?: SelfScopeUser): Promise<Buffer> {
    const { card, memberData, verificationUrl, levelVisual, distrikId } = await this.prepareDigitalCardData(memberId, scope, user);
    const qrDataUrl = await this.buildQr(verificationUrl);
    const template = await this.resolveActiveTemplate(distrikId);
    return this.renderCardPdf({ card, memberData, verificationUrl, levelVisual, qrDataUrl, template });
  }

  // ── Cetak Fisik (Tahap 4) ─────────────────────────────────────────────────

  /** Guard umum: self-member + akses scope. Load anggota lengkap ranting→wilayah→distrik. */
  private async loadMemberForScope(memberId: string, scope?: UserScope, user?: SelfScopeUser) {
    await assertSelfMember(this.prisma, user, memberId);
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
    return member;
  }

  /** Data anggota untuk render kartu (konsisten antar digital & fisik). */
  private buildMemberData(member: any) {
    return {
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
  }

  /** Pastikan dokumen KTA ada (buat bila belum pernah ada, lengkap dgn QR digital). */
  private async ensureKtaDokumen(member: any) {
    const existing = await this.prisma.dokumen.findFirst({
      where: { anggotaId: member.id, tipe: 'kartu_anggota' },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) {
      return {
        ...existing,
        verificationUrl: normalizeVerificationUrl(existing.verificationUrl, {
          typ: 'kta',
          src: 'digital',
        }),
      };
    }

    const token = uuidv4();
    const signedToken = signQrToken({ ref: token, typ: 'kta', src: 'digital' });
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify/${signedToken}`;
    const doc = await this.prisma.dokumen.create({
      data: {
        anggotaId: member.id,
        tipe: 'kartu_anggota',
        nomorDokumen: `KTA-${member.nomorAnggota}`,
        verificationUrl,
        status: 'generated',
      },
    });
    await this.prisma.qRValidation.create({
      data: { dokumenId: doc.id, token, isValid: true, source: 'digital', verificationUrl },
    });
    return doc;
  }

  /**
   * Terbitkan kartu fisik: QR statis baru per penerbitan (src='printed').
   * Alasan hilang/rusak/replacement → QR fisik lama otomatis dicabut.
   * Dokumen yang sedang revoked ikut diaktifkan kembali.
   */
  async issuePrintedCard(
    memberId: string,
    opts: { reason?: string } = {},
    scope?: UserScope,
    user?: SelfScopeUser,
  ) {
    const member = await this.loadMemberForScope(memberId, scope, user);
    let doc = await this.ensureKtaDokumen(member);
    if (doc.status === 'revoked') {
      doc = await this.prisma.dokumen.update({ where: { id: doc.id }, data: { status: 'generated' } });
    }

    const replaceReason = ['replacement', 'hilang', 'rusak'].includes(opts.reason || '');
    if (replaceReason) {
      await this.prisma.qRValidation.updateMany({
        where: { dokumenId: doc.id, source: 'printed', isValid: true },
        data: { isValid: false },
      });
    }

    const token = uuidv4();
    const signedToken = signQrToken({ ref: token, typ: 'kta', src: 'printed' });
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify/${signedToken}`;
    const issuance = await this.prisma.qRValidation.create({
      data: {
        dokumenId: doc.id,
        token,
        isValid: true,
        source: 'printed',
        verificationUrl,
        reason: opts.reason || null,
      },
      select: {
        id: true,
        source: true,
        reason: true,
        isValid: true,
        verificationUrl: true,
        createdAt: true,
      },
    });

    return {
      success: true,
      data: {
        issuance,
        pdfUrl: `/api/members/${memberId}/digital-card/printed/pdf?issuanceId=${issuance.id}`,
      },
    };
  }

  /** PDF cetak kartu fisik untuk penerbitan tertentu (default: penerbitan fisik terbaru). */
  async getPrintedCardPdf(
    memberId: string,
    issuanceId?: string,
    scope?: UserScope,
    user?: SelfScopeUser,
  ): Promise<Buffer> {
    const member = await this.loadMemberForScope(memberId, scope, user);
    const doc = await this.ensureKtaDokumen(member);

    let qr: any;
    if (issuanceId) {
      qr = await this.prisma.qRValidation.findUnique({ where: { id: issuanceId } });
    } else {
      qr = await this.prisma.qRValidation.findFirst({
        where: { dokumenId: doc.id, source: 'printed' },
        orderBy: { createdAt: 'desc' },
      });
    }
    if (!qr || qr.dokumenId !== doc.id || qr.source !== 'printed' || !qr.verificationUrl) {
      throw new NotFoundException('Penerbitan kartu fisik tidak ditemukan');
    }

    // Normalisasi URL QR lama → format `/verify/<token>` agar scan PDF fisik membuka UI.
    const verificationUrl = normalizeVerificationUrl(qr.verificationUrl, {
      typ: 'kta',
      src: 'printed',
    });

    const distrikId = member.ranting?.wilayah?.distrik?.id || undefined;
    const signers = await this.penandatanganService.resolveSigners('kartu_anggota', distrikId);
    const { signatureImage, stampImage } = await this.resolveSignatureStamp(distrikId);
    const template = await this.resolveActiveTemplate(distrikId);
    const levelVisual = await this.tingkatanService.resolveLevelVisual(member.tingkat);
    const card = {
      id: doc.id,
      nomorDokumen: doc.nomorDokumen,
      verificationUrl,
      status: doc.status,
      signers,
      signerName: signers[0]?.signerName,
      signerTitle: signers[0]?.signerTitle,
      signatureImage,
      stampImage,
    };
    return this.renderCardPdf(
      {
        card,
        memberData: this.buildMemberData(member),
        verificationUrl,
        levelVisual,
        qrDataUrl: await this.buildQr(verificationUrl),
        template,
      },
      { combined: true },
    );
  }

  /** Terbitkan kartu fisik untuk banyak anggota sekaligus (cetak batch). */
  async issueCardsBatch(
    memberIds: string[],
    opts: { reason?: string } = {},
    scope?: UserScope,
    user?: SelfScopeUser,
  ) {
    const issued: Array<{ memberId: string; issuanceId: string }> = [];
    for (const memberId of memberIds) {
      try {
        const r = await this.issuePrintedCard(memberId, opts, scope, user);
        issued.push({ memberId, issuanceId: r.data.issuance.id });
      } catch (error) {
        this.logger.warn(`Batch cetak melewati anggota ${memberId}: ${(error as Error).message}`);
      }
    }
    if (issued.length === 0) {
      throw new NotFoundException('Tidak ada anggota yang berhasil diproses untuk cetak');
    }
    const issuanceIds = issued.map((x) => x.issuanceId);
    return {
      success: true,
      data: {
        issued,
        pdfUrl: `/api/members/printed/batch/pdf?issuanceIds=${encodeURIComponent(issuanceIds.join(','))}`,
      },
    };
  }

  /** PDF gabungan multi-kartu (satu halaman 856×1080 per kartu fisik). */
  async getBatchCardPdf(issuanceIds: string[], scope?: UserScope): Promise<Buffer> {
    const qrs = await this.prisma.qRValidation.findMany({
      where: { id: { in: issuanceIds }, source: 'printed' },
      orderBy: { createdAt: 'asc' },
      include: {
        dokumen: {
          include: {
            anggota: { include: { ranting: { include: { wilayah: { include: { distrik: true } } } } } },
          },
        },
      },
    });
    if (qrs.length === 0) throw new NotFoundException('Penerbitan kartu fisik tidak ditemukan');

    for (const qr of qrs) {
      const member = qr.dokumen.anggota;
      if (!member || !qr.verificationUrl) {
        throw new NotFoundException('Data penerbitan kartu fisik tidak lengkap');
      }
      if (
        scope &&
        !(await this.scopeHelper.hasAccessToResourceAsync(this.prisma, scope, member.rantingId))
      ) {
        throw new ForbiddenException('Akses ditolak: diluar cakupan wilayah Anda');
      }
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const ReactPDF = require('@react-pdf/renderer');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { buildMemberCardBatchPdf } = require('../documents/pdf-templates/member-card');

      const propsArray: any[] = [];
      for (const qr of qrs) {
        if (!qr.verificationUrl) throw new NotFoundException('Penerbitan kartu fisik tidak lengkap');
        const member = qr.dokumen.anggota!;
        const distrikId = member.ranting?.wilayah?.distrik?.id || undefined;
        const signers = await this.penandatanganService.resolveSigners('kartu_anggota', distrikId);
        const { signatureImage, stampImage } = await this.resolveSignatureStamp(distrikId);
        const template = await this.resolveActiveTemplate(distrikId);
        const levelVisual = await this.tingkatanService.resolveLevelVisual(member.tingkat);
        const contributor = normalizeVerificationUrl(qr.verificationUrl, {
          typ: 'kta',
          src: qr.source === 'printed' ? 'printed' : 'digital',
        });
        const card = {
          id: qr.dokumen.id,
          nomorDokumen: qr.dokumen.nomorDokumen,
          verificationUrl: contributor,
          status: qr.dokumen.status,
          signers,
          signerName: signers[0]?.signerName,
          signerTitle: signers[0]?.signerTitle,
          signatureImage,
          stampImage,
        };
        const props = await this.cardPdfProps({
          card,
          memberData: this.buildMemberData(member),
          verificationUrl: contributor,
          levelVisual,
          qrDataUrl: await this.buildQr(contributor),
          template,
        });
        propsArray.push(props);
      }

      const pdfDoc = buildMemberCardBatchPdf(propsArray);
      return await ReactPDF.renderToBuffer(pdfDoc);
    } catch (error) {
      this.logger.error('Batch PDF generation failed:', (error as Error).message);
      throw new Error('PDF generation requires react-pdf setup.');
    }
  }

  private async prepareDigitalCardData(memberId: string, scope?: UserScope, user?: SelfScopeUser) {
    // Anggota hanya boleh ambil kartu miliknya sendiri (admin dicakup oleh scope)
    const member = await this.loadMemberForScope(memberId, scope, user);

    // Generate or reuse existing card token
    let existingCard = member.dokumen[0];
    if (!existingCard) {
      const token = uuidv4();
      const signedToken = signQrToken({ ref: token, typ: 'kta', src: 'digital' });
      const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify/${signedToken}`;
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

    const memberData = this.buildMemberData(member);

    // Distrik anggota → scope resolusi penandatangan/ttd/stempel
    const distrikId = member.ranting?.wilayah?.distrik?.id || undefined;

    const signers = await this.penandatanganService.resolveSigners('kartu_anggota', distrikId);
    const { signatureImage, stampImage } = await this.resolveSignatureStamp(distrikId);
    const card = {
      id: existingCard.id,
      nomorDokumen: existingCard.nomorDokumen,
      // Normalisasi URL lama (`/api/documents/verify/...`) → `/verify/<token>` agar
      // QR & tombol "Verifikasi" membuka halaman HTML, bukan JSON mentah dari API.
      verificationUrl: normalizeVerificationUrl(existingCard.verificationUrl, {
        typ: 'kta',
        src: 'digital',
      }),
      status: existingCard.status,
      // Backward-compat: signer pertama tetap di `signerName`/`signerTitle`.
      signers,
      signerName: signers[0]?.signerName,
      signerTitle: signers[0]?.signerTitle,
      // Gambar ttd/stempel sesuai distrik anggota (dipakai juga renderer PDF)
      signatureImage,
      stampImage,
    };

    const levelVisual = await this.tingkatanService.resolveLevelVisual(member.tingkat);

    return { card, memberData, verificationUrl: card.verificationUrl, levelVisual, distrikId };
  }
}
