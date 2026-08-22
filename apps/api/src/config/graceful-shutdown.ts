import { INestApplication } from '@nestjs/common';

const SHUTDOWN_TIMEOUT_MS = 10_000;

export function gracefulShutdown(signal: string, app: INestApplication): void {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

  const forceExit = setTimeout(() => {
    console.error(`⚠️ Shutdown timed out after ${SHUTDOWN_TIMEOUT_MS}ms. Forcing exit.`);
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);

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

export function setupGracefulShutdown(app: INestApplication): void {
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM', app));
  process.on('SIGINT', () => gracefulShutdown('SIGINT', app));
}