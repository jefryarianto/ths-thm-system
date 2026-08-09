import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { extname, resolve } from 'path';
import { existsSync, mkdirSync, readFileSync } from 'fs';

/**
 * Magic bytes (file signatures) untuk format gambar yang didukung.
 * Dipakai sebagai lapisan validasi kedua selain MIME type dari multipart.
 */
const IMAGE_MAGIC_BYTES: Array<{ bytes: number[]; name: string }> = [
  { bytes: [0xff, 0xd8, 0xff], name: 'JPEG' },
  { bytes: [0x89, 0x50, 0x4e, 0x47], name: 'PNG' },
  { bytes: [0x52, 0x49, 0x46, 0x46], name: 'WebP' },
  { bytes: [0x47, 0x49, 0x46, 0x38], name: 'GIF' },
];

/** MIME type gambar yang diizinkan untuk upload. */
export const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

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

/**
 * Konfigurasi diskStorage untuk upload gambar via multer (FileInterceptor).
 * File disimpan ke UPLOAD_DIR dengan prefix unik, MIME gambar saja, max 5MB.
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
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = extname(file.originalname).toLowerCase();
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
