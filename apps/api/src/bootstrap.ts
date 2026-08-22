import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { setupSwagger } from './config/swagger-scope';
import { QueueDashboardModule } from './modules/queue-dashboard/queue-dashboard.module';
import { validateEnv } from './config/env.validation';
import {
  setupCors,
  setupHelmet,
  setupCompression,
  setupValidationPipe,
  setupGlobalFilters,
  setupWebSocketAdapter,
  setupRequestContext,
  setupGlobalPrefix,
  setupStaticUploads,
} from './config/bootstrap-config';
import { photoBackgroundMiddleware } from './middleware/photo-bg.middleware';
import { cleanupStaleNotifications } from './utils/startup-cleanup';
import { setupGracefulShutdown } from './config/graceful-shutdown';

export async function bootstrap(): Promise<NestExpressApplication> {
  validateEnv();

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  setupGlobalPrefix(app);
  setupRequestContext(app);
  setupCors(app);
  setupHelmet(app);
  setupCompression(app);
  setupValidationPipe(app);
  setupGlobalFilters(app);
  setupWebSocketAdapter(app);

  if (process.env.NODE_ENV !== 'production') {
    setupSwagger(app);
  }

  setupStaticUploads(app);

  app.use('/api/uploads', photoBackgroundMiddleware);

  QueueDashboardModule.setup(app);

  await app.listen(process.env.APP_PORT || 3001);

  await cleanupStaleNotifications();

  console.log(`🚀 THS-THM API running on port ${process.env.APP_PORT || 3001}`);
  console.log(`📚 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${process.env.APP_PORT || 3001}/${process.env.API_PREFIX || 'api'}/health`);

  setupGracefulShutdown(app);

  return app;
}