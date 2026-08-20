/* eslint-disable no-console */
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { setupSwagger } from './config/swagger-scope';
import { QueueDashboardModule } from './modules/queue-dashboard/queue-dashboard.module';
import { RedisIoAdapter } from './common/adapters/redis-io.adapter';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });

  app.setGlobalPrefix('api');

  const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
    : ['http://localhost:3000'];

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  });

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(compression());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global exception filter — wraps errors in { success: false, message }
  app.useGlobalFilters(new AllExceptionsFilter());

  // Configure Socket.IO with Redis adapter for cross-instance WebSocket state
  app.useWebSocketAdapter(new RedisIoAdapter(app));

  if (process.env.NODE_ENV !== 'production') {
    setupSwagger(app);
  }

  // Serve uploaded files statically
  const { existsSync, mkdirSync } = require('fs');
  const pathMod = require('path');
  const uploadDir = process.env.UPLOAD_DIR || './uploads';
  if (!existsSync(uploadDir)) {
    mkdirSync(uploadDir, { recursive: true });
  }

  // Lazy `.bg.png`: versi foto pasfoto tanpa background (ala SIM) yang dihasilkan
  // on-demand dari file asli dan di-cache. URL: /api/uploads/<file>.bg.png
  app.use('/api/uploads', async (req: any, res: any, next: any) => {
    try {
      const urlPath = decodeURIComponent(req.path || '').replace(/^\/+/, '');
      if (!urlPath.endsWith('.bg.png')) return next();
      const base = urlPath.slice(0, -'.bg.png'.length);
      const resolvedUpload = pathMod.resolve(uploadDir);
      const origPath = pathMod.resolve(resolvedUpload, base);
      const bgPath = pathMod.resolve(resolvedUpload, urlPath);
      // Proteksi path traversal: keduanya harus di dalam uploadDir
      if (!origPath.startsWith(resolvedUpload + pathMod.sep) || !bgPath.startsWith(resolvedUpload + pathMod.sep)) {
        return next();
      }
      if (!existsSync(origPath)) return next(); // biarkan static menangani 404
      if (!existsSync(bgPath)) {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { removePhotoBackground, isSharpAvailable } = require('./common/utils/photo-bg.util');
        if (!isSharpAvailable()) return next(); // tanpa sharp → onError siluet di client
        const buffer = require('fs').readFileSync(origPath);
        const out = await removePhotoBackground(buffer);
        require('fs').writeFileSync(bgPath, out);
      } else {
        // Self-healing: `.bg.png` lama (bukan kanvas pasfoto 900×1200) di-regenerate
        // dengan pipeline terbaru — foto lama ikut diperbaiki tanpa re-upload.
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const sharp = require('sharp');
          const meta = await sharp(bgPath).metadata();
          if (meta.width !== 900 || meta.height !== 1200) {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const { removePhotoBackground, isSharpAvailable } = require('./common/utils/photo-bg.util');
            if (isSharpAvailable()) {
              const buffer = require('fs').readFileSync(origPath);
              const out = await removePhotoBackground(buffer);
              require('fs').writeFileSync(bgPath, out);
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
  });
  app.use('/api/uploads', require('express').static(uploadDir));

  // Mount Bull Board dashboard (Express-level, bypasses NestJS guards)
  QueueDashboardModule.setup(app);

  await app.listen(process.env.APP_PORT || 3001);

  // One-time cleanup: delete stale data_incomplete notifications.
  // Runs on first boot after deploy; uses a Prisma flag to ensure idempotency.
  if (process.env.NODE_ENV === 'production') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      const staleNotifs = await prisma.notifikasi.findMany({
        where: { tipe: 'data_incomplete' },
        select: { id: true, userId: true },
      });
      if (staleNotifs.length > 0) {
        const anggotaIds = [...new Set(staleNotifs.map((n: any) => n.userId))];
        const members = await prisma.anggota.findMany({
          where: { id: { in: anggotaIds } },
          select: { id: true, namaLengkap: true, tempatLahir: true, tanggalLahir: true, alamat: true, noHp: true, email: true },
        });
        const completeIds = new Set(
          members
            .filter((m: any) => m.namaLengkap && m.tempatLahir && m.tanggalLahir && m.alamat && m.noHp && m.email)
            .map((m: any) => m.id),
        );
        const toDelete = staleNotifs.filter((n: any) => completeIds.has(n.userId));
        if (toDelete.length > 0) {
          await prisma.notifikasi.deleteMany({ where: { id: { in: toDelete.map((n: any) => n.id) } } });
          console.log(`🧹 Cleaned up ${toDelete.length} stale data_incomplete notifications`);
        }
      }
      await prisma.$disconnect();
    } catch (err) {
      console.warn('⚠️ Startup notification cleanup skipped:', (err as Error).message);
    }
  }

  console.log(`🚀 THS-THM API running on port ${process.env.APP_PORT || 3001}`);
  console.log(`📚 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${process.env.APP_PORT || 3001}/api/health`);

  return app;
}

// Graceful shutdown on SIGTERM/SIGINT
// Logs shutdown reason and gives in-flight requests time to complete
const SHUTDOWN_TIMEOUT_MS = 10_000;

function gracefulShutdown(signal: string, app: Awaited<ReturnType<typeof bootstrap>>) {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

  const forceExit = setTimeout(() => {
    console.error(`⚠️ Shutdown timed out after ${SHUTDOWN_TIMEOUT_MS}ms. Forcing exit.`);
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);

  // Unref so it doesn't prevent Node from exiting
  forceExit.unref();

  (async () => {
    try {
      await app.close();
      console.log('✅ Graceful shutdown complete.');
      process.exit(0);
    } catch (err) {
      console.error('❌ Error during shutdown:', err);
      process.exit(1);
    }
  })();
}

bootstrap().then((app) => {
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM', app));
  process.on('SIGINT', () => gracefulShutdown('SIGINT', app));
});
