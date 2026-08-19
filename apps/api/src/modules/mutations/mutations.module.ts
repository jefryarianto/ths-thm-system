import { Module } from '@nestjs/common';
import { MutationsController } from './mutations.controller';
import { MutationsService } from './mutations.service';
import { ScopeModule } from '../../common/scope.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [ScopeModule, NotificationsModule],
  controllers: [MutationsController],
  providers: [MutationsService],
  exports: [MutationsService],
})
export class MutationsModule {}