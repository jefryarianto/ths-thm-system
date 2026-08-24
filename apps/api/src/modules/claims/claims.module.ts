import { Module } from '@nestjs/common';
import { ClaimsController } from './claims.controller';
import { ClaimsService } from './claims.service';
import { ScopeModule } from '../../common/scope.module';
import { NraService } from '../../common/services/nra.service';

@Module({
  imports: [ScopeModule],
  controllers: [ClaimsController],
  providers: [ClaimsService, NraService],
  exports: [ClaimsService],
})
export class ClaimsModule {}
