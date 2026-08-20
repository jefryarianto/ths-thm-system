import { Global, Module } from '@nestjs/common';
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

@Global()
@Module({
  imports: [],
  controllers: [AuditLogController, AuditSseController, ApiKeyManagementController, CacheManagementController],
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
  ],
  exports: [ScopeHelper, AuditService, AuditLogStore, EventBusService, CacheService, CsvImportService, MemberMailService, NraService, ApiKeyStore, PersistentAuditService],
})
export class ScopeModule {}
