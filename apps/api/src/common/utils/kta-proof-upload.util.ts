import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { extname, resolve } from 'path';
import { existsSync, mkdirSync, unlinkSync } from 'fs';

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export function validateKtaProofFile(
  _req: unknown,
  file: { mimetype: string; originalname: string },
  cb: (err: Error | null, accept: boolean) => void,
): void {
  const ext = extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return cb(new BadRequestException('Hanya file JPG, PNG, WebP, dan PDF yang diizinkan'), false);
  }
  if (!ALLOWED_MIMES.includes(file.mimetype)) {
    return cb(
      new BadRequestException('Tipe file tidak diizinkan. Gunakan JPG, PNG, WebP, atau PDF'),
      false,
    );
  }
  cb(null, true);
}

export function buildKtaProofUploadOptions() {
  return {
    storage: diskStorage({
      destination: (
        _req: unknown,
        _file: unknown,
        cb: (err: Error | null, dest: string) => void,
      ) => {
        const baseDir = process.env.UPLOAD_DIR || './uploads';
        const resolved = resolve(baseDir, 'kta-proofs');
        if (!resolved.startsWith(resolve('.'))) {
          cb(new Error('UPLOAD_DIR harus berada dalam direktori project'), '');
          return;
        }
        if (!existsSync(resolved)) mkdirSync(resolved, { recursive: true });
        cb(null, resolved);
      },
      filename: (
        _req: unknown,
        file: { originalname: string },
        cb: (err: Error | null, filename: string) => void,
      ) => {
        const ext = extname(file.originalname).toLowerCase();
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `kta-proof-${uniqueSuffix}${ext}`);
      },
    }),
    fileFilter: validateKtaProofFile,
    limits: { fileSize: MAX_FILE_SIZE, files: 1 },
  };
}

export function deleteKtaProofFile(filename: string): void {
  try {
    const resolved = resolve(process.env.UPLOAD_DIR || './uploads', 'kta-proofs', filename);
    if (!resolved.startsWith(resolve('.'))) return;
    if (existsSync(resolved)) unlinkSync(resolved);
  } catch {
    return;
  }
}
