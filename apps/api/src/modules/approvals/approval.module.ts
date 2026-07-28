import { Module } from '@nestjs/common';
import { ApprovalController } from './approval.controller';
import { ApprovalService } from './approval.service';
import { ScopeModule } from '../../common/scope.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [ScopeModule, NotificationsModule],
  controllers: [ApprovalController],
  providers: [ApprovalService],
  exports: [ApprovalService],
})
export class ApprovalModule {}