import { Module, forwardRef } from '@nestjs/common';
import { TrainingsController } from './trainings.controller';
import { TrainingsService } from './trainings.service';
import { GamificationModule } from '../gamification/gamification.module';

@Module({
  imports: [forwardRef(() => GamificationModule)],
  controllers: [TrainingsController],
  providers: [TrainingsService],
  exports: [TrainingsService],
})
export class TrainingsModule {}