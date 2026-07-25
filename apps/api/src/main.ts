/* eslint-disable no-console */
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { setupSwagger } from './config/swagger-scope';
import { QueueDashboardModule } from './modules/queue-dashboard/queue-dashboard.module';
import { RedisIoAdapter } from './common/adapters/redis-io.adapter';

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
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
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

  // Configure Socket.IO with Redis adapter for cross-instance WebSocket state
  app.useWebSocketAdapter(new RedisIoAdapter(app));

  if (process.env.NODE_ENV !== 'production') {
    setupSwagger(app);
  }

  // Serve uploaded files statically
  const { existsSync, mkdirSync } = require('fs');
  const uploadDir = process.env.UPLOAD_DIR || './uploads';
  if (!existsSync(uploadDir)) {
    mkdirSync(uploadDir, { recursive: true });
  }
  app.use('/api/uploads', require('express').static(uploadDir));

  // Mount Bull Board dashboard (Express-level, bypasses NestJS guards)
  QueueDashboardModule.setup(app);

  await app.listen(process.env.APP_PORT || 3001);

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
