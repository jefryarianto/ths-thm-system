import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { validateImageUploadSecurity } from '../../common/utils/image-upload.util';
import { existsSync, unlinkSync } from 'fs';
import { resolve as resolvePath } from 'path';

/** Warna overlay: hex (3-8 digit) atau rgba()/rgb() CSS. */
const COLOR_RE = /^(#[0-9a-fA-F]{3,8}|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*(0|1|0?\.\d+)\s*)?\))$/;
const NAME_RE = /^[a-z0-9][a-z0-9-]{1,48}$/;

/** Kunci overlayConfig yang dikenal — kunci lain dibuang (bukan error). */
const ALLOWED_OVERLAY_KEYS = new Set([
  'guilloche', 'watermark', 'photo', 'nama', 'nomorAnggota', 'ttl',
  'tempatDadar', 'tahunDadar', 'ranting', 'wilayah', 'tingkat', 'qr', 'ttd', 'status',
]);

/**
 * Template kartu anggota (desain upload depan+belakang, global).
 * Satu template aktif; bila tidak ada, renderer memakai desain bawaan
 * `packages/card-design` — sehingga fitur ini zero-risk saat dirilis.
 */
@Injectable()
export class CardTemplatesService {
  private readonly logger = new Logger(CardTemplatesService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── Read ──────────────────────────────────────────────────────────────

  /** Template aktif — dipakai semua renderer. Null = pakai desain bawaan. */
  async resolveActive() {
    try {
      return await this.prisma.cardTemplate.findFirst({ where: { isActive: true } });
    } catch {
      // Tabel belum dimigrasi → desain bawaan
      return null;
    }
  }

  findAll() {
    return this.prisma.cardTemplate.findMany({
      orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  async findOne(id: string) {
    const template = await this.prisma.cardTemplate.findUnique({ where: { id } });
    if (!template) throw new NotFoundException('Template kartu tidak ditemukan');
    return template;
  }

  // ── Write ─────────────────────────────────────────────────────────────

  async create(
    dto: { name?: string; label?: string; overlayConfig?: unknown },
    files?: { front?: Express.Multer.File; back?: Express.Multer.File },
  ) {
    const name = (dto.name || '').trim().toLowerCase();
    if (!NAME_RE.test(name)) {
      throw new BadRequestException('Nama template wajib: huruf kecil/angka/strip, 2-49 karakter');
    }
    const exists = await this.prisma.cardTemplate.findUnique({ where: { name } });
    if (exists) throw new BadRequestException(`Nama template "${name}" sudah dipakai`);

    const overlayConfig = this.validateOverlayConfig(dto.overlayConfig);
    const frontImage = files?.front ? await this.validateCardImage(files.front) : null;
    const backImage = files?.back ? await this.validateCardImage(files.back) : null;

    return this.prisma.cardTemplate.create({
      data: { name, label: (dto.label || name).trim(), frontImage, backImage, overlayConfig: overlayConfig as never, isActive: false },
    });
  }

  async update(
    id: string,
    dto: { label?: string; overlayConfig?: unknown },
    files?: { front?: Express.Multer.File; back?: Express.Multer.File },
  ) {
    const existing = await this.findOne(id);
    const data: Record<string, unknown> = {};
    if (dto.label !== undefined) data.label = dto.label.trim();
    if (dto.overlayConfig !== undefined) data.overlayConfig = this.validateOverlayConfig(dto.overlayConfig);
    if (files?.front) {
      data.frontImage = await this.validateCardImage(files.front);
      this.unlinkQuietly(existing.frontImage);
    }
    if (files?.back) {
      data.backImage = await this.validateCardImage(files.back);
      this.unlinkQuietly(existing.backImage);
    }
    if (Object.keys(data).length === 0) throw new BadRequestException('Tidak ada perubahan yang dikirim');
    return this.prisma.cardTemplate.update({ where: { id }, data });
  }

  /** Set satu-satunya template aktif (atomik). */
  async activate(id: string) {
    await this.findOne(id);
    await this.prisma.$transaction([
      this.prisma.cardTemplate.updateMany({ data: { isActive: false } }),
      this.prisma.cardTemplate.update({ where: { id }, data: { isActive: true } }),
    ]);
    return this.findOne(id);
  }

  async remove(id: string) {
    const existing = await this.findOne(id);
    if (existing.isActive) {
      throw new BadRequestException('Template aktif tidak dapat dihapus. Aktifkan template lain terlebih dahulu.');
    }
    this.unlinkQuietly(existing.frontImage);
    this.unlinkQuietly(existing.backImage);
    await this.prisma.cardTemplate.delete({ where: { id } });
    return { deleted: true };
  }

  // ── Validasi ──────────────────────────────────────────────────────────

  private uploadDir(): string {
    return resolvePath(process.env.UPLOAD_DIR || './uploads');
  }

  private unlinkQuietly(filename?: string | null) {
    if (!filename) return;
    try {
      const filePath = resolvePath(this.uploadDir(), filename);
      if (existsSync(filePath)) unlinkSync(filePath);
    } catch {
      /* best-effort */
    }
  }

  /** Validasi magic bytes + resolusi/rasio kartu (856:540, toleransi 12%). */
  private async validateCardImage(file: Express.Multer.File): Promise<string> {
    try {
      await validateImageUploadSecurity(file.path, file.originalname);
    } catch (err) {
      this.unlinkQuietly(file.filename);
      throw err;
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const sharp = require('sharp');
      const meta = await sharp(file.path).metadata();
      const w = meta.width ?? 0;
      const h = meta.height ?? 0;
      if (w < 500 || h < 300) {
        throw new BadRequestException(`Resolusi gambar terlalu kecil (${w}×${h}). Minimal 500×300 px.`);
      }
      const ratio = w / h;
      const target = 856 / 540;
      if (Math.abs(ratio - target) / target > 0.12) {
        throw new BadRequestException(
          `Rasio gambar harus mendekati kartu ID (856:540 ≈ 1,58). Diterima ${w}×${h} (rasio ${ratio.toFixed(2)}).`,
        );
      }
    } catch (err) {
      if (err instanceof BadRequestException) {
        this.unlinkQuietly(file.filename);
        throw err;
      }
      // sharp tidak tersedia → lewati pemeriksaan rasio
    }
    return file.filename;
  }

  /** Normalisasi & whitelist overlayConfig (kedalaman ≤2, nilai terkontrol). */
  private validateOverlayConfig(raw: unknown): Record<string, unknown> {
    if (raw === undefined || raw === null || raw === '') return {};
    let parsed: unknown = raw;
    if (typeof raw === 'string') {
      try {
        parsed = JSON.parse(raw);
      } catch {
        throw new BadRequestException('overlayConfig bukan JSON yang valid');
      }
    }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new BadRequestException('overlayConfig harus berupa objek');
    }
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!ALLOWED_OVERLAY_KEYS.has(key)) continue;
      const clean = this.sanitizeValue(value);
      if (clean !== undefined) out[key] = clean;
    }
    return out;
  }

  private sanitizeValue(value: unknown, depth = 0): unknown {
    if (depth > 2) return undefined;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const s = value.trim();
      if (s === '') return s;
      if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s); // angka dari multipart string
      if (/^(true|false)$/i.test(s)) return s.toLowerCase() === 'true';
      if (COLOR_RE.test(s)) return s;
      if (['left', 'center', 'right'].includes(s.toLowerCase())) return s.toLowerCase();
      return s;
    }
    if (Array.isArray(value)) {
      return value.slice(0, 32).map((v) => this.sanitizeValue(v, depth + 1)).filter((v) => v !== undefined);
    }
    if (typeof value === 'object' && value !== null) {
      const obj: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>).slice(0, 64)) {
        const clean = this.sanitizeValue(v, depth + 1);
        if (clean !== undefined) obj[k] = clean;
      }
      return obj;
    }
    return undefined;
  }
}