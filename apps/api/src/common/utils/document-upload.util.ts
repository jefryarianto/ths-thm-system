import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { extname, resolve } from 'path';
import { existsSync, mkdirSync } from 'fs';

/**
 * Ekstensi dokumen yang diizinkan untuk upload ke modul org-documents.
 * Sengaja dibatasi agar tidak ada file eksekusi/script (mis. .php, .exe, .sh).
 */
export const ALLOWED_DOCUMENT_EXTENSIONS = [
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.txt',
  '.rtf',
  '.zip',
];

/** MIME type dokumen yang diizinkan. */
export const ALLOWED_DOCUMENT_MIMES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'application/rtf',
  'application/zip',
  // Browser sering mengirim octet-stream untuk tipe yang tidak dikenalnya;
  // validasi ekstensi tetap menjadi penjaga utama.
  'application/octet-stream',
];

/**
 * Batas ukuran file upload dokumen (byte). Default 25MB — disamakan dengan
 * `client_max_body_size` nginx. Dapat di-override lewat env
 * `MAX_DOCUMENT_UPLOAD_MB`.
 */
export const MAX_DOCUMENT_UPLOAD_SIZE = (() => {
  const mb = Number(process.env.MAX_DOCUMENT_UPLOAD_MB ?? 25);
  const sanitized = Number.isFinite(mb) && mb > 0 ? mb : 25;
  return sanitized * 1024 * 1024;
})();

/**
 * Opsi upload Multer untuk file dokumen organisasi.
 *
 * File disimpan ke `UPLOAD_DIR/org-documents` dengan nama unik
 * (`orgdoc-<timestamp>-<random><ext>`). Hanya ekstensi dokumen dari whitelist
 * yang diterima, dan ukuran dibatasi MAX_DOCUMENT_UPLOAD_SIZE (default 25MB).
 */
export function buildDocumentUploadOptions(prefix = 'orgdoc') {
  return {
    storage: diskStorage({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      destination: (
        _req: unknown,
        _file: unknown,
        cb: (err: Error | null, dest: string) => void,
      ) => {
        const baseDir = process.env.UPLOAD_DIR || './uploads';
        const rawDir = `${baseDir}/org-documents`;
        // Resolve ke absolute path dan pastikan tetap dalam direktori project.
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
        // Tolak ekstensi di luar whitelist sedini mungkin.
        if (!ALLOWED_DOCUMENT_EXTENSIONS.includes(ext)) {
          cb(
            new BadRequestException(
              `Ekstensi file tidak diizinkan. Gunakan: ${ALLOWED_DOCUMENT_EXTENSIONS.join(', ')}`,
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
      file: { mimetype: string; originalname: string },
      cb: (err: Error | null, accept: boolean) => void,
    ) => {
      // Validasi ekstensi sebagai penjaga utama (MIME bisa tidak konsisten
      // antar browser untuk tipe dokumen).
      const ext = extname(file.originalname).toLowerCase();
      if (!ALLOWED_DOCUMENT_EXTENSIONS.includes(ext)) {
        cb(
          new BadRequestException(
            `Ekstensi file tidak diizinkan. Gunakan: ${ALLOWED_DOCUMENT_EXTENSIONS.join(', ')}`,
          ),
          false,
        );
        return;
      }
      cb(null, true);
    },
    limits: { fileSize: MAX_DOCUMENT_UPLOAD_SIZE },
  };
}
