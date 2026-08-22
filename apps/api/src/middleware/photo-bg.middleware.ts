import { Request, Response, NextFunction } from 'express';
import { removePhotoBackground, isSharpAvailable } from '../common/utils/photo-bg.util';

export async function photoBackgroundMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const urlPath = decodeURIComponent(req.path || '').replace(/^\/+/, '');
    if (!urlPath.endsWith('.bg.png')) return next();

    const base = urlPath.slice(0, -'.bg.png'.length);
    const { existsSync, mkdirSync, readFileSync, writeFileSync } = require('fs');
    const pathMod = require('path');

    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    const resolvedUpload = pathMod.resolve(uploadDir);
    const origPath = pathMod.resolve(resolvedUpload, base);
    const bgPath = pathMod.resolve(resolvedUpload, urlPath);

    if (
      !origPath.startsWith(resolvedUpload + pathMod.sep) ||
      !bgPath.startsWith(resolvedUpload + pathMod.sep)
    ) {
      return next();
    }

    if (!existsSync(origPath)) return next();

    if (!existsSync(bgPath)) {
      if (!isSharpAvailable()) return next();
      const buffer = readFileSync(origPath);
      const out = await removePhotoBackground(buffer);
      writeFileSync(bgPath, out);
    } else {
      try {
        const sharp = require('sharp');
        const meta = await sharp(bgPath).metadata();
        if (meta.width !== 900 || meta.height !== 1200) {
          if (isSharpAvailable()) {
            const buffer = readFileSync(origPath);
            const out = await removePhotoBackground(buffer);
            writeFileSync(bgPath, out);
          }
        }
      } catch {
        // Keep existing — non-critical
      }
    }
    return next();
  } catch {
    return next();
  }
}