import { Global, Module } from '@nestjs/common';
import { ScopeHelper } from './utils/scope-helpers';
import { AuditService } from './services/audit.service';
import { AuditLogStore } from './services/audit-log-store.service';
import { AuditLogController } from './controllers/audit-log.controller';

@Global()
@Module({
  controllers: [AuditLogController],
  providers: [ScopeHelper, AuditLogStore, AuditService],
  exports: [ScopeHelper, AuditService, AuditLogStore],
})
export class ScopeModule {}
