import { NestExpressApplication } from '@nestjs/platform-express';
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
  });
}

export function setupHelmet(app: NestExpressApplication): void {
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
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

export function setupStaticUploads(app: NestExpressApplication): void {
  const { existsSync, mkdirSync } = require('fs');
  const pathMod = require('path');
  const uploadDir = process.env.UPLOAD_DIR || './uploads';
  if (!existsSync(uploadDir)) {
    mkdirSync(uploadDir, { recursive: true });
  }
  app.use('/api/uploads', require('express').static(uploadDir));

  const appDir = pathMod.join(uploadDir, 'app');
  if (!existsSync(appDir)) {
    mkdirSync(appDir, { recursive: true });
  }
  app.use('/api/app', require('express').static(appDir));
}
