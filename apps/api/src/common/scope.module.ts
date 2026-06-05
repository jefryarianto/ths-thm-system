import { Global, Module } from '@nestjs/common';
import { ScopeHelper } from './utils/scope-helpers';
import { AuditService } from './services/audit.service';
import { AuditLogStore } from './services/audit-log-store.service';
import { AuditLogController } from './controllers/audit-log.controller';
import { CacheService } from './services/cache.service';
import { ApiKeyStore } from './guards/api-key.guard';
import { ApiKeyManagementController } from './controllers/api-key-management.controller';

@Global()
@Module({
  controllers: [AuditLogController, ApiKeyManagementController],
  providers: [ScopeHelper, AuditLogStore, AuditService, CacheService, ApiKeyStore],
  exports: [ScopeHelper, AuditService, AuditLogStore, CacheService, ApiKeyStore],
})
export class ScopeModule {}
