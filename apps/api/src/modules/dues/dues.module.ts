import { Module, forwardRef } from '@nestjs/common';
import { DuesController } from './dues.controller';
import { DuesService } from './dues.service';
import { GamificationModule } from '../gamification/gamification.module';

@Module({
  imports: [forwardRef(() => GamificationModule)],
  controllers: [DuesController],
  providers: [DuesService],
  exports: [DuesService],
})
export class DuesModule {}