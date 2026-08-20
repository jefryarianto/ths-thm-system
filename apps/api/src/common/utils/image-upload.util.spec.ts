import { writeFileSync, mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  validateImageMagicBytes,
  detectImageFormat,
  validateImageUploadSecurity,
} from './image-upload.util';

function makeImage(hex: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'img-util-'));
  const file = join(dir, 'img');
  writeFileSync(file, Buffer.from(hex, 'hex'));
  return file;
}

describe('image-upload.util', () => {
  describe('validateImageMagicBytes', () => {
    it('should accept real image magic bytes', () => {
      expect(validateImageMagicBytes(makeImage('ffd8ffe0'))).toBe(true); // JPEG
      expect(validateImageMagicBytes(makeImage('89504e47'))).toBe(true); // PNG
      expect(validateImageMagicBytes(makeImage('52494646'))).toBe(true); // WebP
      expect(validateImageMagicBytes(makeImage('47494638'))).toBe(true); // GIF
    });

    it('should reject non-image files', () => {
      expect(validateImageMagicBytes(makeImage('25504446'))).toBe(false); // %PDF
      expect(validateImageMagicBytes(makeImage('7f454c46'))).toBe(false); // ELF
    });
  });

  describe('detectImageFormat', () => {
    it('should detect the format name', () => {
      expect(detectImageFormat(makeImage('ffd8ffe0'))).toBe('jpeg');
      expect(detectImageFormat(makeImage('89504e47'))).toBe('png');
    });
  });

  describe('validateImageUploadSecurity', () => {
    it('should reject non-whitelisted extensions', async () => {
      const file = makeImage('ffd8ffe0');
      await expect(validateImageUploadSecurity(file, 'photo.php')).rejects.toThrow(
        /ekstensi file tidak diizinkan/i,
      );
      await expect(validateImageUploadSecurity(file, 'photo.svg')).rejects.toThrow(
        /ekstensi file tidak diizinkan/i,
      );
    });

    it('should reject extension/format mismatch', async () => {
      const jpegFile = makeImage('ffd8ffe0'); // JPEG content
      await expect(validateImageUploadSecurity(jpegFile, 'photo.png')).rejects.toThrow(
        /ketidakcocokan format/i,
      );
    });

    it('should accept a matching extension+format', async () => {
      const jpegFile = makeImage('ffd8ffe0');
      await expect(validateImageUploadSecurity(jpegFile, 'photo.jpeg')).resolves.toBeUndefined();
    });
  });
});