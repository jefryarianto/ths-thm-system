import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { extname, resolve } from 'path';
import { existsSync, mkdirSync, readFileSync } from 'fs';

/**
 * Magic bytes (file signatures) untuk format gambar yang didukung.
 * Dipakai sebagai lapisan validasi kedua selain MIME type dari multipart.
 */
const IMAGE_MAGIC_BYTES: Array<{ bytes: number[]; name: string }> = [
  { bytes: [0xff, 0xd8, 0xff], name: 'jpeg' },
  { bytes: [0x89, 0x50, 0x4e, 0x47], name: 'png' },
  { bytes: [0x52, 0x49, 0x46, 0x46], name: 'webp' },
  { bytes: [0x47, 0x49, 0x46, 0x38], name: 'gif' },
];

/** MIME type gambar yang diizinkan untuk upload. */
export const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/** Ekstensi file gambar yang diizinkan. */
export const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

/** Ambang batas piksel untuk mencegah decompression bomb (mis. 25 MP). */
export const MAX_IMAGE_PIXELS = 25_000_000;

/** Pemetaan ekstensi → format yang harus cocok dengan magic bytes. */
const EXTENSION_TO_FORMAT: Record<string, string> = {
  '.jpg': 'jpeg',
  '.jpeg': 'jpeg',
  '.png': 'png',
  '.webp': 'webp',
  '.gif': 'gif',
};

/**
 * Validasi magic bytes file untuk memastikan benar-benar gambar (anti MIME spoofing).
 */
export function validateImageMagicBytes(filePath: string): boolean {
  try {
    const buffer = readFileSync(filePath).slice(0, 4);
    return IMAGE_MAGIC_BYTES.some((fmt) => fmt.bytes.every((b, i) => buffer[i] === b));
  } catch {
    return false;
  }
}

/** Deteksi format gambar dari magic bytes → 'jpeg' | 'png' | 'webp' | 'gif' | null. */
export function detectImageFormat(filePath: string): string | null {
  try {
    const buffer = readFileSync(filePath).slice(0, 4);
    const match = IMAGE_MAGIC_BYTES.find((fmt) => fmt.bytes.every((b, i) => buffer[i] === b));
    return match ? match.name : null;
  } catch {
    return null;
  }
}

/**
 * Lapisan keamanan upload tambahan:
 * 1. Ekstensi harus masuk whitelist gambar.
 * 2. Format terdeteksi (magic bytes) harus cocok dengan ekstensi — mencegah
 *    file berformat A disimpan dengan ekstensi B.
 * 3. Bila sharp tersedia, batasi total piksel untuk mencegah decompression bomb.
 *
 * @throws BadRequestException bila ada pelanggaran.
 */
export async function validateImageUploadSecurity(
  filePath: string,
  originalName: string,
): Promise<void> {
  const ext = extname(originalName).toLowerCase();
  if (!ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
    throw new BadRequestException(
      `Ekstensi file tidak diizinkan. Gunakan: ${ALLOWED_IMAGE_EXTENSIONS.join(', ')}`,
    );
  }

  const detected = detectImageFormat(filePath);
  if (!detected) {
    throw new BadRequestException('File tidak valid: format gambar tidak dikenali.');
  }
  if (EXTENSION_TO_FORMAT[ext] !== detected) {
    throw new BadRequestException(
      `Ketidakcocokan format: file berisi ${detected.toUpperCase()} tapi berekstensi ${ext}.`,
    );
  }

  // Batasi dimensi gambar (sharp opsional — bila tidak tersedia, lewati).
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const sharp = require('sharp');
    const meta = await sharp(filePath).metadata();
    const totalPixels = (meta.width ?? 0) * (meta.height ?? 0);
    if (totalPixels > MAX_IMAGE_PIXELS) {
      throw new BadRequestException(
        `Gambar terlalu besar (${Math.round(totalPixels / 1_000_000)} MP). Maksimal ${MAX_IMAGE_PIXELS / 1_000_000} MP.`,
      );
    }
  } catch (err) {
    if (err instanceof BadRequestException) throw err;
    // sharp tidak tersedia → hanya bergantung pada magic bytes.
  }
}

/**
 * Konfigurasi diskStorage untuk upload gambar via multer (FileInterceptor).
 * File disimpan ke UPLOAD_DIR dengan prefix unik, MIME gambar saja, max 5MB,
 * dan ekstensi wajib dari whitelist.
 *
 * @param prefix Prefix nama file, mis. 'signature' → signature-<ts>-<rand>.png
 */
export function buildImageUploadOptions(prefix: string) {
  return {
    storage: diskStorage({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      destination: (_req: unknown, _file: unknown, cb: (err: Error | null, dest: string) => void) => {
        const rawDir = process.env.UPLOAD_DIR || './uploads';
        // Resolve ke absolute path dan pastikan tetap dalam direktori project
        const resolved = resolve(rawDir);
        if (!resolved.startsWith(resolve('.'))) {
          cb(new BadRequestException('UPLOAD_DIR harus berada dalam direktori project'), '');
          return;
        }
        if (!existsSync(resolved)) {
          mkdirSync(resolved, { recursive: true });
        }
        cb(null, resolved);
      },
      filename: (
        _req: unknown,
        file: { originalname: string },
        cb: (err: Error | null, filename: string) => void,
      ) => {
        const ext = extname(file.originalname).toLowerCase();
        // Tolak ekstensi di luar whitelist (mis. .php, .svg, .html) sedini mungkin.
        if (!ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
          cb(
            new BadRequestException(
              `Ekstensi file tidak diizinkan. Gunakan: ${ALLOWED_IMAGE_EXTENSIONS.join(', ')}`,
            ),
            '',
          );
          return;
        }
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `${prefix}-${uniqueSuffix}${ext}`);
      },
    }),
    fileFilter: (
      _req: unknown,
      file: { mimetype: string },
      cb: (err: Error | null, accept: boolean) => void,
    ) => {
      if (!ALLOWED_IMAGE_MIMES.includes(file.mimetype)) {
        cb(new BadRequestException('Hanya file gambar (JPEG, PNG, WebP, GIF) yang diizinkan'), false);
        return;
      }
      cb(null, true);
    },
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  };
}