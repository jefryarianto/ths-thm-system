import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ScopeHelper } from './utils/scope-helpers';
import { AuditService } from './services/audit.service';
import { AuditLogStore } from './services/audit-log-store.service';
import { AuditLogController } from './controllers/audit-log.controller';
import { AuditSseController } from './controllers/audit-sse.controller';
import { EventBusService } from './services/event-bus.service';
import { CacheService } from './services/cache.service';
import { CsvImportService } from './services/csv-import.service';
import { PersistentAuditService } from './services/persistent-audit.service';
import { MemberMailService } from './services/member-mail.service';
import { NraService } from './services/nra.service';
import { ApiKeyStore } from './guards/api-key.guard';
import { ApiKeyManagementController } from './controllers/api-key-management.controller';
import { CacheManagementController } from './controllers/cache-management.controller';
import { DbBackupService } from './services/db-backup.service';
import { DbBackupController } from './controllers/db-backup.controller';
import { MetricsService } from './services/metrics.service';
import { MetricsController } from './controllers/metrics.controller';
import { MetricsInterceptor } from './interceptors/metrics.interceptor';
import { RevisionService } from './services/revision.service';
import { RevisionController } from './controllers/revision.controller';
import { NotificationsModule } from '../modules/notifications/notifications.module';

@Global()
@Module({
  imports: [NotificationsModule],
  controllers: [
    AuditLogController,
    AuditSseController,
    ApiKeyManagementController,
    CacheManagementController,
    DbBackupController,
    MetricsController,
    RevisionController,
  ],
  providers: [
    ScopeHelper,
    AuditLogStore,
    AuditService,
    EventBusService,
    CacheService,
    CsvImportService,
    MemberMailService,
    NraService,
    ApiKeyStore,
    PersistentAuditService,
    DbBackupService,
    MetricsService,
    MetricsInterceptor,
    RevisionService,
    { provide: APP_INTERCEPTOR, useClass: MetricsInterceptor },
  ],
  exports: [
    ScopeHelper,
    AuditService,
    AuditLogStore,
    EventBusService,
    CacheService,
    CsvImportService,
    MemberMailService,
    NraService,
    ApiKeyStore,
    PersistentAuditService,
    DbBackupService,
    MetricsService,
    RevisionService,
  ],
})
export class ScopeModule {}
