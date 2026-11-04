import { NestExpressApplication } from '@nestjs/platform-express';
import { NextFunction, Request, Response } from 'express';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import helmet from 'helmet';
import compression from 'compression';
import { AllExceptionsFilter } from '../common/filters/all-exceptions.filter';
import { RedisIoAdapter } from '../common/adapters/redis-io.adapter';
import { RequestContextMiddleware } from '../common/middleware/request-context.middleware';

export function setupCors(app: NestExpressApplication): void {
  // trust proxy: production berjalan di belakang nginx (reverse proxy).
  // Tanpa ini `req.ip` = IP container nginx untuk SEMUA klien, sehingga:
  // 1. rate limit per-IP menggabungkan seluruh user ke satu bucket, dan
  // 2. lockout brute-force & audit mencatat IP yang salah.
  // `1` = satu hop proxy (nginx) → req.ip membaca X-Forwarded-For terdepan.
  app.set('trust proxy', 1);

  const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
    : ['http://localhost:3000'];

  app.enableCors({
    // cors@2.8.5 memanggil origin secara ASYNC — wajib memanggil callback.
    // Fungsi sync yang hanya me-return nilai (tanpa callback) membuat setiap
    // request menggantung selamanya karena next() tidak pernah dipanggil.
    origin: function originFilter(
      reqOrigin: string | undefined,
      callback: (err: Error | null, origin?: boolean | string | RegExp | (string | RegExp)[]) => void,
    ): void {
      // Origin tercantum di allow-list → dipantulkan; selain itu tetap
      // dilewatkan sebagai array allow-list agar header Vary: Origin ikut
      // diset (semantik identik dengan `origin: corsOrigins` array).
      if (reqOrigin && corsOrigins.includes(reqOrigin)) {
        callback(null, reqOrigin);
      } else {
        callback(null, corsOrigins);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Requested-With'],
    exposedHeaders: ['X-CSRF-Token'],
  });
}

export function setupHelmet(app: NestExpressApplication): void {
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
      },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    }),
  );
}

export function setupCompression(app: NestExpressApplication): void {
  app.use(compression());
}

export function setupValidationPipe(app: NestExpressApplication): void {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
}

export function setupGlobalFilters(app: NestExpressApplication): void {
  app.useGlobalFilters(new AllExceptionsFilter());
}

export function setupWebSocketAdapter(app: NestExpressApplication): void {
  app.useWebSocketAdapter(new RedisIoAdapter(app));
}

export function setupRequestContext(app: NestExpressApplication): void {
  app.use(new RequestContextMiddleware().use);
}

export function setupGlobalPrefix(app: NestExpressApplication): void {
  const apiPrefix = process.env.API_PREFIX || 'api';
  app.setGlobalPrefix(apiPrefix);
  // URI versioning: existing endpoints stay at /api/... (no version segment).
  // New endpoints can opt in with @Version('2') → /api/v2/...
  app.enableVersioning({
    type: VersioningType.URI,
  });
}

/**
 * Middleware autentikasi untuk rute statis.
 * Rute upload (POST/PUT/PATCH) dilewati karena FileInterceptor/Controller
 * yang menangani otorisasi. Hanya GET ke file statis (bukti, foto, dokumen)
 * yang memerlukan token — mencegah akses anonim ke data pribadi anggota.
 */
/**
 * Prefixes of uploaded files that are publicly accessible (no auth required).
 * These assets are displayed in public-facing previews (card templates, signatures,
 * stamps, document backgrounds) where browser `<img>` tags cannot send auth headers.
 *
 * Private assets (member-photo-*, proof-*, forum-*, etc.) remain protected.
 */
const PUBLIC_UPLOAD_PREFIXES = [
  'card-template-front-',
  'card-template-back-',
  'signature-',
  'stamp-',
  'doc-template-',
] as const;

function isPublicUpload(filename: string): boolean {
  return PUBLIC_UPLOAD_PREFIXES.some((prefix) => filename.startsWith(prefix));
}

function staticAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (req.method !== 'GET') {
    return next();
  }
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    const urlPath = decodeURIComponent(req.path || '').replace(/^\/+/, '');
    if (isPublicUpload(urlPath)) {
      return next();
    }
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  next();
}

export function setupStaticUploads(app: NestExpressApplication): void {
  const { existsSync, mkdirSync } = require('fs');
  const pathMod = require('path');
  const uploadDir = process.env.UPLOAD_DIR || './uploads';
  if (!existsSync(uploadDir)) {
    mkdirSync(uploadDir, { recursive: true });
  }
  app.use('/api/uploads', staticAuthMiddleware, require('express').static(uploadDir));

  const appDir = pathMod.join(uploadDir, 'app');
  if (!existsSync(appDir)) {
    mkdirSync(appDir, { recursive: true });
  }
  app.use('/api/app', staticAuthMiddleware, require('express').static(appDir));
}
