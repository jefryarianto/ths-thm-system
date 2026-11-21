import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventsGateway } from '../notifications/events.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { Role } from '@ths-thm/shared-types';
import { randomUUID } from 'node:crypto';
import { createReadStream, promises as fs } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import type { ReadStream } from 'node:fs';
import sharp from 'sharp';

const STORAGE_DIR = resolve(__dirname, '..', '..', '..', 'storage', 'galeri');
/** Satu-satunya peran yang menerima antrian moderasi & boleh memutuskan. */
export const MODERATOR_ROLES: readonly Role[] = ['superadmin', 'admin_berita'];

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
/** Batas piksel: menolak "image bomb" (file kecil dengan piksel raksasa). */
const MAX_PIXELS = 24_000_000;
const MAX_DIMENSION = 8000;
/** Batas longgar untuk membaca header saja (bukan decode). */
const MAX_METADATA_PIXELS = 100_000_000;

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
  private readonly logger = new Logger(GaleriService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsGateway,
    private readonly notifications: NotificationsService,
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
    // HEIC/HEIF sengaja tidak diterima: harus di-reencode agar EXIF terbuang,
    // sedangkan dekoder HEIF tidak tersedia di build sharp server ini.
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
      !['image/jpeg', 'image/png', 'image/webp'].includes(mime) ||
      !this.hasValidImageSignature(file.buffer, mime)
    ) {
      throw new BadRequestException('Format foto harus JPEG, PNG, atau WebP');
    }
    if (file.buffer.length > 10 * 1024 * 1024 || file.size > 10 * 1024 * 1024)
      throw new BadRequestException('Ukuran maksimal foto 10 MB');

    // Byte asli tidak pernah disimpan: foto selalu di-decode ulang lalu
    // di-encode ulang oleh sharp. Itu sekaligus membuang EXIF/GPS karena sharp
    // hanya menyalin metadata bila .withMetadata() dipanggil. Batas piksel
    // ditegakkan sebelum decode penuh supaya "image bomb" (file kecil, piksel
    // raksasa) ditolak tanpa menghabiskan memori.
    let processed: Buffer;
    let thumb: Buffer;
    try {
      // Baca header dengan batas longgar dulu supaya foto yang kebesaran bisa
      // ditolak dengan pesan yang tepat; decode penuh tetap dibatasi MAX_PIXELS.
      const meta = await sharp(file.buffer, { limitInputPixels: MAX_METADATA_PIXELS }).metadata();
      if (!meta.width || !meta.height) throw new BadRequestException('Foto tidak dapat dibaca');
      if (
        meta.width > MAX_DIMENSION ||
        meta.height > MAX_DIMENSION ||
        meta.width * meta.height > MAX_PIXELS
      ) {
        throw new BadRequestException(
          `Dimensi foto terlalu besar (maksimal ${MAX_DIMENSION} px per sisi dan ${MAX_PIXELS / 1_000_000} MP)`,
        );
      }
      processed = await sharp(file.buffer, { limitInputPixels: MAX_PIXELS })
        .rotate()
        .flatten({ background: '#ffffff' })
        .jpeg({ quality: 85, mozjpeg: true })
        .toBuffer();
      thumb = await sharp(processed)
        .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(
        'Foto tidak dapat diproses. Unggah JPEG, PNG, atau WebP yang valid.',
      );
    }

    const base = randomUUID();
    const key = `${base}.jpg`;
    const thumbKey = `${base}-thumb.jpg`;
    const originalBase = file.originalname.replace(/\.[^./\\]+$/, '').slice(0, 200) || 'foto';

    await fs.mkdir(STORAGE_DIR, { recursive: true });
    try {
      await fs.writeFile(join(STORAGE_DIR, key), processed, { flag: 'wx', mode: 0o600 });
      await fs.writeFile(join(STORAGE_DIR, thumbKey), thumb, { flag: 'wx', mode: 0o600 });
    } catch {
      await fs.unlink(join(STORAGE_DIR, key)).catch(() => undefined);
      await fs.unlink(join(STORAGE_DIR, thumbKey)).catch(() => undefined);
      throw new InternalServerErrorException('Foto gagal disimpan di server');
    }

    try {
      const item = await this.prisma.galeri.create({
        data: {
          judul: judul.trim(),
          gambar: `/galeri/${key}`,
          storageKey: key,
          thumbKey,
          deskripsi: deskripsiBersih,
          kategori: kategori ?? null,
          fileName: `${originalBase}.jpg`,
          mimeType: 'image/jpeg',
          ukuranBytes: processed.length,
          uploaderId: userId,
          status: 'PENDING',
          isVisible: false,
        },
      });
      await this.emitQueueCounts();
      return item;
    } catch (error) {
      await fs.unlink(join(STORAGE_DIR, key)).catch(() => undefined);
      await fs.unlink(join(STORAGE_DIR, thumbKey)).catch(() => undefined);
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
    await this.notifyUploader(found, status, rejectedReason);
    return updated;
  }

  /**
   * Kabari pengunggah lewat notifikasi yang sudah ada (in-app + socket lewat
   * EventsGateway + email lewat MailService). Kegagalan pengiriman tidak boleh
   * menggagalkan keputusan moderasi yang sudah tersimpan.
   */
  private async notifyUploader(
    item: { id: string; judul: string; uploaderId: string | null },
    status: ReviewStatus,
    reason: string | null,
  ): Promise<void> {
    if (!item.uploaderId) return;
    const disetujui = status === 'APPROVED';
    try {
      await this.notifications.send(item.uploaderId, {
        judul: disetujui ? 'Foto galeri disetujui' : 'Foto galeri ditolak',
        isi: disetujui
          ? `Foto "${item.judul}" telah disetujui dan sekarang tampil di galeri.`
          : `Foto "${item.judul}" ditolak. Alasan: ${reason ?? 'tidak disebutkan'}`,
        tipe: 'umum',
        data: { module: 'galeri', galeriId: item.id, status, reason },
      });
    } catch (error) {
      this.logger.warn(
        `Notifikasi moderasi galeri gagal untuk ${item.uploaderId}: ${(error as Error).message}`,
      );
    }
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
      select: { id: true, judul: true, status: true, uploaderId: true },
    });
    const byId = new Map(items.map((item) => [item.id, item]));

    let updated = 0;
    const failed: Array<{ id: string; reason: string }> = [];
    const diputuskan: Array<{ id: string; judul: string; uploaderId: string | null }> = [];
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
        diputuskan.push({ id: item.id, judul: item.judul, uploaderId: item.uploaderId });
      } catch {
        failed.push({ id, reason: 'Gagal menyimpan keputusan' });
      }
    }

    if (updated > 0) await this.emitQueueCounts();
    await Promise.allSettled(
      diputuskan.map((item) => this.notifyUploader(item, status, rejectedReason)),
    );
    return { updated, failed };
  }

  async delete(id: string, user: { id: string; role: Role }, reason?: string) {
    const item = await this.prisma.galeri.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Foto tidak ditemukan');
    // Hapus mengikuti aturan moderasi: pemilik unggahan sendiri, atau
    // superadmin/admin_berita. Role admin_* lain tidak boleh menghapus.
    if (item.uploaderId !== user.id && !MODERATOR_ROLES.includes(user.role))
      throw new ForbiddenException();
    const catatan = reason?.trim().slice(0, 500) || null;
    // Log dan penghapusan ditulis dalam satu transaksi supaya tidak mungkin ada
    // foto yang hilang tanpa jejak audit (atau jejak tanpa foto yang hilang).
    // Baris log menyimpan snapshot karena `galeri` sudah tidak ada setelahnya.
    await this.prisma.$transaction([
      this.prisma.galeriDeletionLog.create({
        data: {
          galeriId: item.id,
          actorId: user.id,
          actorRole: user.role,
          reason: catatan,
          judul: item.judul,
          uploaderId: item.uploaderId,
          kategori: item.kategori,
          status: item.status,
          storageKey: item.storageKey,
          thumbKey: item.thumbKey,
          ukuranBytes: item.ukuranBytes,
          fotoCreatedAt: item.createdAt,
        },
      }),
      this.prisma.galeri.delete({ where: { id } }),
    ]);
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
    this.events.sendToRoles(MODERATOR_ROLES, 'galeri:queue', { pending: counts.PENDING });
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
