import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import helmet from 'helmet';
import compression from 'compression';
import { AllExceptionsFilter } from '../common/filters/all-exceptions.filter';
import { RedisIoAdapter } from '../common/adapters/redis-io.adapter';
import { RequestContextMiddleware } from '../common/middleware/request-context.middleware';

export function setupCors(app: NestExpressApplication): void {
  const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
    : ['http://localhost:3000'];

  app.enableCors({
    origin: corsOrigins,
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
}