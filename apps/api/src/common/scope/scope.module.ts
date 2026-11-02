import { Global, Module } from '@nestjs/common';
import { ScopeService } from './scope.service';
import { ScopeHelper } from '../utils/scope-helpers';

@Global()
@Module({
  providers: [ScopeService, ScopeHelper],
  exports: [ScopeService, ScopeHelper],
})
export class ScopeDeepModule {}
