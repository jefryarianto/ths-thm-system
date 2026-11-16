import {
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventsGateway } from '../notifications/events.gateway';
import { Role } from '@ths-thm/shared-types';
import { randomUUID } from 'node:crypto';
import { createReadStream, promises as fs } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import type { ReadStream } from 'node:fs';
import sharp from 'sharp';

const STORAGE_DIR = resolve(__dirname, '..', '..', '..', 'storage', 'galeri');
const ADMIN_ROLES: Role[] = [
  'superadmin',
  'admin_nasional',
  'admin_distrik',
  'admin_wilayah',
  'admin_ranting',
  'admin_kegiatan',
  'admin_berita',
];

/** Kategori yang boleh dipakai; disimpan sebagai string agar mudah ditambah. */
export const GALERI_KATEGORI = [
  'Kegiatan',
  'Pelatihan',
  'Upacara',
  'Bakti Sosial',
  'Lainnya',
] as const;

export const MAX_REVIEW_BULK = 100;
const PAGE_SIZE_DEFAULT = 20;
const PAGE_SIZE_MAX = 100;
const THUMB_WIDTH = 480;

type AdminQuery = { status?: string; page?: string; limit?: string };
type ReviewStatus = 'APPROVED' | 'REJECTED';

function parseStatusFilter(raw?: string): 'PENDING' | 'APPROVED' | 'REJECTED' | undefined {
  const status = raw?.trim().toUpperCase();
  return status === 'PENDING' || status === 'APPROVED' || status === 'REJECTED'
    ? status
    : undefined;
}

function parsePositiveInt(raw: unknown, fallback: number): number {
  const value = Number.parseInt(String(raw ?? ''), 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

@Injectable()
export class GaleriService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsGateway,
  ) {}

  private hasValidImageSignature(buffer: Buffer, mime: string): boolean {
    if (mime === 'image/jpeg')
      return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    if (mime === 'image/png')
      return (
        buffer.length >= 8 &&
        buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
      );
    if (mime === 'image/webp')
      return (
        buffer.length >= 12 &&
        buffer.toString('ascii', 0, 4) === 'RIFF' &&
        buffer.toString('ascii', 8, 12) === 'WEBP'
      );
    if (mime === 'image/heic' || mime === 'image/heif')
      return (
        buffer.length >= 12 &&
        buffer.toString('ascii', 4, 8) === 'ftyp' &&
        ['heic', 'hev1', 'mif1', 'heix'].some((brand) =>
          buffer.toString('ascii', 8, 12).startsWith(brand),
        )
      );
    return false;
  }

  async upload(
    file: Express.Multer.File | undefined,
    judul: string,
    userId: string,
    deskripsi?: string,
    kategori?: string,
  ) {
    if (!judul?.trim() || judul.trim().length > 180)
      throw new BadRequestException('Judul foto wajib diisi (maksimal 180 karakter)');
    const deskripsiBersih = deskripsi?.trim() || null;
    if (deskripsiBersih && (deskripsiBersih.length < 20 || deskripsiBersih.length > 1000))
      throw new BadRequestException('Deskripsi harus 20–1000 karakter');
    if (kategori && !GALERI_KATEGORI.includes(kategori as (typeof GALERI_KATEGORI)[number]))
      throw new BadRequestException('Kategori foto tidak valid');
    if (!file?.buffer) throw new BadRequestException('File foto wajib diunggah');
    const mime = file.mimetype;
    if (
      !['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'].includes(mime) ||
      !this.hasValidImageSignature(file.buffer, mime)
    ) {
      throw new BadRequestException('Format foto harus JPEG, PNG, WebP, atau HEIC');
    }
    if (file.buffer.length > 10 * 1024 * 1024 || file.size > 10 * 1024 * 1024)
      throw new BadRequestException('Ukuran maksimal foto 10 MB');

    const ext =
      mime === 'image/jpeg'
        ? 'jpg'
        : mime === 'image/png'
          ? 'png'
          : mime === 'image/webp'
            ? 'webp'
            : 'heic';
    const base = randomUUID();
    const key = `${base}.${ext}`;
    const thumbKey = `${base}-thumb.jpg`;

    await fs.mkdir(STORAGE_DIR, { recursive: true });
    try {
      await fs.writeFile(join(STORAGE_DIR, key), file.buffer, { flag: 'wx', mode: 0o600 });
    } catch {
      throw new InternalServerErrorException('Foto gagal disimpan di server');
    }

    // Thumbnail opsional: kalau dekoder tidak tersedia (mis. HEIC tanpa libheif),
    // unggahan tetap jalan dan endpoint thumbnail menyajikan foto asli.
    let thumbSaved = false;
    try {
      const thumb = await sharp(file.buffer)
        .rotate()
        .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();
      await fs.writeFile(join(STORAGE_DIR, thumbKey), thumb, { flag: 'wx', mode: 0o600 });
      thumbSaved = true;
    } catch {
      thumbSaved = false;
    }

    try {
      const item = await this.prisma.galeri.create({
        data: {
          judul: judul.trim(),
          gambar: `/galeri/${key}`,
          storageKey: key,
          thumbKey: thumbSaved ? thumbKey : null,
          deskripsi: deskripsiBersih,
          kategori: kategori ?? null,
          fileName: file.originalname.slice(0, 255),
          mimeType: mime,
          ukuranBytes: file.size,
          uploaderId: userId,
          status: 'PENDING',
          isVisible: false,
        },
      });
      await this.emitQueueCounts();
      return item;
    } catch (error) {
      await fs.unlink(join(STORAGE_DIR, key)).catch(() => undefined);
      if (thumbSaved) await fs.unlink(join(STORAGE_DIR, thumbKey)).catch(() => undefined);
      throw error;
    }
  }

  async listMine(userId: string) {
    return this.prisma.galeri.findMany({
      where: { uploaderId: userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        judul: true,
        deskripsi: true,
        kategori: true,
        status: true,
        rejectedReason: true,
        createdAt: true,
        reviewedAt: true,
      },
    });
  }

  /**
   * Daftar moderasi: PENDING tampil terlama dulu (FIFO, supaya tidak ada yang
   * kelaparan), status lain terbaru dulu. Hitungan per status ikut dikirim agar
   * UI tidak perlu request tambahan.
   */
  async listAdmin(query: AdminQuery = {}) {
    const status = parseStatusFilter(query.status);
    const page = parsePositiveInt(query.page, 1);
    const limit = Math.min(parsePositiveInt(query.limit, PAGE_SIZE_DEFAULT), PAGE_SIZE_MAX);
    const where = status ? { status } : {};
    const orderBy =
      status === 'PENDING' ? { createdAt: 'asc' as const } : { createdAt: 'desc' as const };

    const [items, total, grouped] = await Promise.all([
      this.prisma.galeri.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          uploader: { select: { id: true, namaLengkap: true, email: true } },
          reviewer: { select: { id: true, namaLengkap: true } },
        },
      }),
      this.prisma.galeri.count({ where }),
      this.prisma.galeri.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);

    const counts = { PENDING: 0, APPROVED: 0, REJECTED: 0 };
    for (const row of grouped) counts[row.status] = row._count._all;

    // TransformInterceptor meneruskan { data, meta } apa adanya, jadi UI
    // menerima { success, data: [...], meta: {...} } dalam satu request.
    return {
      data: items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit), counts },
    };
  }

  async history(id: string) {
    return this.prisma.galeriModerationLog.findMany({
      where: { galeriId: id },
      orderBy: { createdAt: 'desc' },
      include: { actor: { select: { id: true, namaLengkap: true } } },
    });
  }

  private normalizeReview(status: ReviewStatus, reason?: string) {
    if (status !== 'APPROVED' && status !== 'REJECTED')
      throw new BadRequestException('Status moderasi tidak valid');
    const trimmed = reason?.trim();
    if (status === 'REJECTED' && !trimmed)
      throw new BadRequestException('Alasan penolakan wajib diisi');
    return status === 'REJECTED' ? trimmed!.slice(0, 2000) : null;
  }

  async review(id: string, status: ReviewStatus, reason: string | undefined, reviewerId: string) {
    const rejectedReason = this.normalizeReview(status, reason);
    const found = await this.prisma.galeri.findUnique({ where: { id } });
    if (!found) throw new NotFoundException('Foto tidak ditemukan');
    if (found.uploaderId === reviewerId)
      throw new ForbiddenException('Tidak dapat meninjau unggahan sendiri');

    const updated = await this.applyReview(
      found.id,
      found.status,
      status,
      rejectedReason,
      reviewerId,
    );
    await this.emitQueueCounts();
    return updated;
  }

  /** Terapkan satu keputusan + catat log secara atomik. */
  private async applyReview(
    id: string,
    fromStatus: string,
    status: ReviewStatus,
    rejectedReason: string | null,
    reviewerId: string,
  ) {
    const [updated] = await this.prisma.$transaction([
      this.prisma.galeri.update({
        where: { id },
        data: {
          status,
          isVisible: status === 'APPROVED',
          reviewerId,
          reviewedAt: new Date(),
          rejectedReason,
        },
      }),
      this.prisma.galeriModerationLog.create({
        data: {
          galeriId: id,
          actorId: reviewerId,
          action: 'REVIEW',
          fromStatus: fromStatus as 'PENDING' | 'APPROVED' | 'REJECTED',
          toStatus: status,
          reason: rejectedReason,
        },
      }),
    ]);
    return updated;
  }

  /**
   * Moderasi massal. Tidak atomik per item dengan sengaja: satu foto yang gagal
   * (mis. unggahan sendiri) tidak boleh membatalkan sisanya. Event socket
   * dikirim sekali di akhir, bukan per item.
   */
  async reviewBulk(
    ids: string[],
    status: ReviewStatus,
    reason: string | undefined,
    reviewerId: string,
  ) {
    const rejectedReason = this.normalizeReview(status, reason);
    const uniqueIds = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
    if (uniqueIds.length === 0) throw new BadRequestException('Pilih minimal satu foto');
    if (uniqueIds.length > MAX_REVIEW_BULK)
      throw new BadRequestException(`Maksimal ${MAX_REVIEW_BULK} foto per aksi`);

    const items = await this.prisma.galeri.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true, status: true, uploaderId: true },
    });
    const byId = new Map(items.map((item) => [item.id, item]));

    let updated = 0;
    const failed: Array<{ id: string; reason: string }> = [];
    for (const id of uniqueIds) {
      const item = byId.get(id);
      if (!item) {
        failed.push({ id, reason: 'Foto tidak ditemukan' });
        continue;
      }
      if (item.uploaderId === reviewerId) {
        failed.push({ id, reason: 'Tidak dapat meninjau unggahan sendiri' });
        continue;
      }
      try {
        await this.applyReview(id, item.status, status, rejectedReason, reviewerId);
        updated++;
      } catch {
        failed.push({ id, reason: 'Gagal menyimpan keputusan' });
      }
    }

    if (updated > 0) await this.emitQueueCounts();
    return { updated, failed };
  }

  async delete(id: string, user: { id: string; role: Role }) {
    const item = await this.prisma.galeri.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Foto tidak ditemukan');
    if (item.uploaderId !== user.id && !ADMIN_ROLES.includes(user.role))
      throw new ForbiddenException();
    await this.prisma.galeri.delete({ where: { id } });
    if (item.storageKey) await fs.unlink(join(STORAGE_DIR, item.storageKey)).catch(() => undefined);
    if (item.thumbKey) await fs.unlink(join(STORAGE_DIR, item.thumbKey)).catch(() => undefined);
    await this.emitQueueCounts();
    return { success: true };
  }

  /** Kirim angka antrian sekali ke semua socket admin (badge realtime). */
  private async emitQueueCounts() {
    const grouped = await this.prisma.galeri.groupBy({ by: ['status'], _count: { _all: true } });
    const counts = { PENDING: 0, APPROVED: 0, REJECTED: 0 };
    for (const row of grouped) counts[row.status] = row._count._all;
    this.events.sendToRoles(ADMIN_ROLES, 'galeri:queue', { pending: counts.PENDING });
  }

  async getStoredImage(
    id: string,
  ): Promise<{ stream: ReadStream; mimeType: string; fileName: string }> {
    const item = await this.prisma.galeri.findUnique({ where: { id } });
    if (!item?.storageKey) throw new NotFoundException('Foto tidak ditemukan');
    return this.openImage(item.storageKey, item.mimeType, item.fileName);
  }

  async getStoredThumbnail(
    id: string,
  ): Promise<{ stream: ReadStream; mimeType: string; fileName: string }> {
    const item = await this.prisma.galeri.findUnique({ where: { id } });
    if (!item?.storageKey) throw new NotFoundException('Foto tidak ditemukan');
    if (item.thumbKey) return this.openImage(item.thumbKey, 'image/jpeg', `${item.judul}.jpg`);
    return this.openImage(item.storageKey, item.mimeType, item.fileName);
  }

  async getImage(id: string): Promise<{ stream: ReadStream; mimeType: string; fileName: string }> {
    const item = await this.prisma.galeri.findUnique({ where: { id } });
    if (!item || item.status !== 'APPROVED' || !item.isVisible || !item.storageKey) {
      throw new NotFoundException('Foto tidak ditemukan');
    }
    return this.openImage(item.storageKey, item.mimeType, item.fileName);
  }

  async getThumbnail(
    id: string,
  ): Promise<{ stream: ReadStream; mimeType: string; fileName: string }> {
    const item = await this.prisma.galeri.findUnique({ where: { id } });
    if (!item || item.status !== 'APPROVED' || !item.isVisible || !item.storageKey) {
      throw new NotFoundException('Foto tidak ditemukan');
    }
    if (item.thumbKey) return this.openImage(item.thumbKey, 'image/jpeg', `${item.judul}.jpg`);
    return this.openImage(item.storageKey, item.mimeType, item.fileName);
  }

  private async openImage(
    storageKey: string,
    mimeType: string | null,
    fileName: string | null,
  ): Promise<{ stream: ReadStream; mimeType: string; fileName: string }> {
    const path = resolve(STORAGE_DIR, storageKey);
    if (!path.startsWith(STORAGE_DIR + sep)) throw new NotFoundException('Foto tidak ditemukan');
    try {
      await fs.access(path);
    } catch {
      throw new NotFoundException('Foto tidak ditemukan');
    }
    return {
      stream: createReadStream(path),
      mimeType: mimeType ?? 'application/octet-stream',
      fileName: fileName ?? 'foto',
    };
  }
}
