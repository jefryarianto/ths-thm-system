import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { extname, resolve } from 'path';
import { existsSync, mkdirSync } from 'fs';

/**
 * MIME type yang diizinkan untuk upload bukti klaim.
 * Hanya image (JPEG, PNG, WebP) dan PDF.
 */
export const ALLOWED_CLAIM_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];

/**
 * Ekstensi file yang diizinkan untuk upload bukti klaim.
 */
export const ALLOWED_CLAIM_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];

/**
 * Batas ukuran file upload (5MB per file).
 */
export const MAX_CLAIM_FILE_SIZE = 5 * 1024 * 1024;

/**
 * Maksimal jumlah file bukti keanggotaan.
 */
export const MAX_BUKTI_FILES = 3;

/**
 * Maksimal jumlah file dokumen pendukung.
 */
export const MAX_DOKUMEN_FILES = 3;

/**
 * Validasi file upload untuk klaim.
 */
export function validateClaimFile(
  _req: unknown,
  file: { mimetype: string; originalname: string },
  cb: (err: Error | null, accept: boolean) => void,
): void {
  const ext = extname(file.originalname).toLowerCase();
  
  if (!['.jpg', '.jpeg', '.png', '.webp', '.pdf'].includes(ext)) {
    return cb(
      new BadRequestException(
        'Hanya file JPG, PNG, WebP, dan PDF yang diizinkan',
      ),
      false,
    );
  }

  if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.mimetype)) {
    return cb(
      new BadRequestException(
        'Tipe file tidak diizinkan. Gunakan JPG, PNG, WebP, atau PDF',
      ),
      false,
    );
  }

  cb(null, true);
}

/**
 * Konfigurasi Multer untuk upload file klaim.
 * File disimpan ke UPLOAD_DIR/claims dengan nama unik.
 */
export function buildClaimUploadOptions() {
  return {
    storage: diskStorage({
      destination: (
        _req: unknown,
        _file: unknown,
        cb: (err: Error | null, dest: string) => void,
      ) => {
        const baseDir = process.env.UPLOAD_DIR || './uploads';
        const rawDir = `${baseDir}/claims`;
        const resolved = resolve(rawDir);
        
        if (!resolved.startsWith(resolve('.'))) {
          cb(new Error('UPLOAD_DIR harus berada dalam direktori project'), '');
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
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `claim-${uniqueSuffix}${ext}`);
      },
    }),
    fileFilter: validateClaimFile,
    limits: { 
      fileSize: 5 * 1024 * 1024, // 5MB
      files: 6, // max 3 bukti + 3 dokumen
    },
  };
}

/**
 * Hapus file fisik dari filesystem.
 */
export function deleteClaimFile(filePath: string): void {
  const fs = require('fs');
  const fullPath = require('path').resolve(filePath);
  
  try {
    if (require('fs').existsSync(fullPath)) {
      require('fs').unlinkSync(fullPath);
    }
  } catch (error) {
    console.error(`Failed to delete file ${filePath}:`, error);
  }
}