import { Global, Module } from '@nestjs/common';
import { ScopeHelper } from './utils/scope-helpers';

@Global()
@Module({
  providers: [ScopeHelper],
  exports: [ScopeHelper],
})
export class ScopeModule {}
