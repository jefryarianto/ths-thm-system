import { Module, forwardRef } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { ScopeModule } from '../../common/scope.module';
import { GamificationModule } from '../gamification/gamification.module';

@Module({
  imports: [ScopeModule, forwardRef(() => GamificationModule)],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}