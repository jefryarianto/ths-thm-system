import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule } from '@nestjs/config';

import {
  RoleBasedThrottlerGuard,
  ScopeGuard,
  ApiKeyGuard,
  ApiKeyStore,
  JwtAuthGuard,
  RolesGuard,
} from './common';
import { PrismaModule } from './prisma';
import { HealthController } from './common/health.controller';
import { ScopeModule } from './common/scope.module';
import { AuditInterceptor, TransformInterceptor } from './common';

import * as Modules from './modules';
import { TenantContextMiddleware } from './common/middleware/tenant-context.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env', '.env.production'],
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        ttl: parseInt(process.env.THROTTLE_TTL || '60', 10),
        limit: parseInt(process.env.THROTTLE_LIMIT || '100', 10),
      },
    ]),
    PrismaModule,
    ScopeModule,
    ...Object.values(Modules),
  ],
  controllers: [HealthController],
  providers: [
    // URUTAN GUARD PENTING (dieksekusi atas-ke-bawah):
    // JwtAuthGuard harus berjalan SEBELUM RoleBasedThrottlerGuard agar
    // `req.user` sudah terisi saat rate limit dihitung — kalau tidak, SEMUA
    // request dihitung sebagai 'anonymous' (20 req/menit per IP) dan traffic
    // dashboard yang me-lontarkan banyak request paralel kena 429 massal
    // (termasuk /auth/session/verify yang dipakai proxy web → terlihat
    // sebagai "di-kick" setelah login). Lihat role-throttler.guard.ts.
    ApiKeyStore,
    { provide: APP_GUARD, useClass: ApiKeyGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RoleBasedThrottlerGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ScopeGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantContextMiddleware).forRoutes('*');
  }
}
