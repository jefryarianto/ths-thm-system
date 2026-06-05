import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { setupSwagger } from './config/swagger-scope';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });

  app.setGlobalPrefix('api');

  app.enableCors({
    origin: process.env.FRONTEND_URL
      ? process.env.FRONTEND_URL.split(',')
      : ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  app.use(helmet());
  app.use(compression());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  if (process.env.NODE_ENV !== 'production') {
    setupSwagger(app);
  }

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