import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { RoleBasedThrottlerGuard } from './common/guards/role-throttler.guard';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { HealthController } from './common/health.controller';
import { JwtAuthGuard, RolesGuard } from './modules/auth/guards/jwt-auth.guard';
import { ScopeGuard } from './common/guards/scope.guard';
import { ApiKeyStore, ApiKeyGuard } from './common/guards/api-key.guard';
import { ScopeModule } from './common/scope.module';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { MembersModule } from './modules/members/members.module';
import { CandidatesModule } from './modules/candidates/candidates.module';
import { RegistrationsModule } from './modules/registrations/registrations.module';
import { ClaimsModule } from './modules/claims/claims.module';
import { TrainingsModule } from './modules/trainings/trainings.module';
import { GraduationsModule } from './modules/graduations/graduations.module';
import { ActivitiesModule } from './modules/activities/activities.module';
import { ExaminersModule } from './modules/examiners/examiners.module';
import { AssessmentsModule } from './modules/assessments/assessments.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { OrgDocumentsModule } from './modules/org-documents/org-documents.module';
import { LettersModule } from './modules/letters/letters.module';
import { DuesModule } from './modules/dues/dues.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ReportsModule } from './modules/reports/reports.module';
import { SettingsModule } from './modules/settings/settings.module';
import { GamificationModule } from './modules/gamification/gamification.module';
import { MailModule } from './mail/mail.module';

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
    AuthModule,
    UsersModule,
    MembersModule,
    CandidatesModule,
    RegistrationsModule,
    ClaimsModule,
    TrainingsModule,
    GraduationsModule,
    ActivitiesModule,
    ExaminersModule,
    AssessmentsModule,
    DocumentsModule,
    OrgDocumentsModule,
    LettersModule,
    DuesModule,
    PaymentsModule,
    NotificationsModule,
    ReportsModule,
    SettingsModule,
    GamificationModule,
    MailModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: RoleBasedThrottlerGuard,
    },
    ApiKeyStore,
    {
      provide: APP_GUARD,
      useClass: ApiKeyGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ScopeGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule {}