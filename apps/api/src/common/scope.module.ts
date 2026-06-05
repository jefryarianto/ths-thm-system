import { Global, Module } from '@nestjs/common';
import { ScopeHelper } from './utils/scope-helpers';
import { AuditService } from './services/audit.service';
import { AuditLogStore } from './services/audit-log-store.service';
import { AuditLogController } from './controllers/audit-log.controller';
import { CacheService } from './services/cache.service';

@Global()
@Module({
  controllers: [AuditLogController],
  providers: [ScopeHelper, AuditLogStore, AuditService, CacheService],
  exports: [ScopeHelper, AuditService, AuditLogStore, CacheService],
})
export class ScopeModule {}
