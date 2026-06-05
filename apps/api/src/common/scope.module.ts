import { Global, Module } from '@nestjs/common';
import { ScopeHelper } from './utils/scope-helpers';
import { AuditService } from './services/audit.service';

@Global()
@Module({
  providers: [ScopeHelper, AuditService],
  exports: [ScopeHelper, AuditService],
})
export class ScopeModule {}
