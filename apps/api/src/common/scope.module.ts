import { Global, Module } from '@nestjs/common';
import { ScopeHelper } from './utils/scope-helpers';
import { AuditService } from './services/audit.service';
import { AuditLogStore } from './services/audit-log-store.service';
import { AuditLogController } from './controllers/audit-log.controller';
import { CacheService } from './services/cache.service';
import { CsvImportService } from './services/csv-import.service';
import { MemberMailService } from './services/member-mail.service';
import { NraService } from './services/nra.service';
import { ApiKeyStore } from './guards/api-key.guard';
import { ApiKeyManagementController } from './controllers/api-key-management.controller';
import { CacheManagementController } from './controllers/cache-management.controller';

@Global()
@Module({
  controllers: [AuditLogController, ApiKeyManagementController, CacheManagementController],
  providers: [
    ScopeHelper,
    AuditLogStore,
    AuditService,
    CacheService,
    CsvImportService,
    MemberMailService,
    NraService,
    ApiKeyStore,
  ],
  exports: [ScopeHelper, AuditService, AuditLogStore, CacheService, CsvImportService, MemberMailService, NraService, ApiKeyStore],
})
export class ScopeModule {}
