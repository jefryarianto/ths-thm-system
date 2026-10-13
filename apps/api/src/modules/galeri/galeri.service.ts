import {
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '@ths-thm/shared-types';
import { randomUUID } from 'node:crypto';
import { createReadStream, promises as fs } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import type { ReadStream } from 'node:fs';

const STORAGE_DIR = resolve(__dirname, '..', '..', '..', 'storage', 'galeri');
const ADMIN_ROLES: Role[] = [
  'superadmin', 'admin_nasional', 'admin_distrik', 'admin_wilayah',
  'admin_ranting', 'admin_kegiatan',
];

@Injectable()
export class GaleriService {
  constructor(private readonly prisma: PrismaService) {}

  private hasValidImageSignature(buffer: Buffer, mime: string): boolean {
    if (mime === 'image/jpeg') return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    if (mime === 'image/png') return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    if (mime === 'image/webp') return buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
    return false;
  }

  async upload(file: Express.Multer.File, title: string, userId: string) {
    if (!title?.trim() || title.trim().length > 180) throw new BadRequestException('Judul foto wajib diisi (maksimal 180 karakter)');
    if (!file?.buffer) throw new BadRequestException('File foto wajib diunggah');
    const mime = file.mimetype;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(mime) || !this.hasValidImageSignature(file.buffer, mime)) {
      throw new BadRequestException('Format foto harus JPEG, PNG, atau WebP');
    }
    if (file.buffer.length > 10 * 1024 * 1024) throw new BadRequestException('Ukuran maksimal foto 10 MB');
    if (file.size > 10 * 1024 * 1024) throw new BadRequestException('Ukuran maksimal foto 10 MB');
    const key = `${randomUUID()}.${mime === 'image/jpeg' ? 'jpg' : mime === 'image/png' ? 'png' : 'webp'}`;
    await fs.mkdir(STORAGE_DIR, { recursive: true });
    try {
      await fs.writeFile(join(STORAGE_DIR, key), file.buffer, { flag: 'wx', mode: 0o600 });
    } catch {
      throw new InternalServerErrorException('Foto gagal disimpan di server');
    }
    try {
      const item = await this.prisma.galeri.create({
        data: {
          judul: title.trim(), gambar: `/galeri/${key}`, storageKey: key,
          fileName: file.originalname.slice(0, 255), mimeType: mime,
          ukuranBytes: file.size, uploaderId: userId, status: 'PENDING', isVisible: false,
        },
      });
      return item;
    } catch (error) {
      await fs.unlink(join(STORAGE_DIR, key)).catch(() => undefined);
      throw error;
    }
  }

  async listMine(userId: string) {
    return this.prisma.galeri.findMany({ where: { uploaderId: userId }, orderBy: { createdAt: 'desc' } });
  }

  async listAdmin() {
    return this.prisma.galeri.findMany({
      include: { uploader: { select: { id: true, namaLengkap: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async review(id: string, status: 'APPROVED' | 'REJECTED', reason: string | undefined, reviewerId: string) {
    if (!['APPROVED', 'REJECTED'].includes(status)) throw new BadRequestException('Status moderasi tidak valid');
    if (status === 'REJECTED' && !reason?.trim()) throw new BadRequestException('Alasan penolakan wajib diisi');
    const found = await this.prisma.galeri.findUnique({ where: { id } });
    if (!found) throw new NotFoundException('Foto tidak ditemukan');
    return this.prisma.galeri.update({
      where: { id },
      data: {
        status, isVisible: status === 'APPROVED', reviewerId, reviewedAt: new Date(),
        rejectedReason: status === 'REJECTED' ? reason!.trim().slice(0, 2000) : null,
      },
    });
  }

  async delete(id: string, user: { id: string; role: Role }) {
    const item = await this.prisma.galeri.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Foto tidak ditemukan');
    if (item.uploaderId !== user.id && !ADMIN_ROLES.includes(user.role)) throw new ForbiddenException();
    await this.prisma.galeri.delete({ where: { id } });
    if (item.storageKey) await fs.unlink(join(STORAGE_DIR, item.storageKey)).catch(() => undefined);
    return { success: true };
  }

  async getStoredImage(id: string): Promise<{ stream: ReadStream; mimeType: string; fileName: string }> {
    const item = await this.prisma.galeri.findUnique({ where: { id } });
    if (!item?.storageKey) throw new NotFoundException('Foto tidak ditemukan');
    return this.openImage(item.storageKey, item.mimeType, item.fileName);
  }

  async getImage(id: string): Promise<{ stream: ReadStream; mimeType: string; fileName: string }> {
    const item = await this.prisma.galeri.findUnique({ where: { id } });
    if (!item || item.status !== 'APPROVED' || !item.isVisible || !item.storageKey) {
      throw new NotFoundException('Foto tidak ditemukan');
    }
    return this.openImage(item.storageKey, item.mimeType, item.fileName);
  }

  private async openImage(storageKey: string, mimeType: string | null, fileName: string | null): Promise<{ stream: ReadStream; mimeType: string; fileName: string }> {
    const path = resolve(STORAGE_DIR, storageKey);
    if (!path.startsWith(STORAGE_DIR + sep)) throw new NotFoundException('Foto tidak ditemukan');
    try { await fs.access(path); } catch { throw new NotFoundException('Foto tidak ditemukan'); }
    return { stream: createReadStream(path), mimeType: mimeType ?? 'application/octet-stream', fileName: fileName ?? 'foto' };
  }
}
