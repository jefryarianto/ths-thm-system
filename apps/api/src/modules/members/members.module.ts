import { Module } from '@nestjs/common';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';
import { MembersDigitalCardService } from './members-digital-card.service';
import { MembersWorkflowService } from './members-workflow.service';
import { PenandatanganModule } from '../penandatangan/penandatangan.module';
import { TingkatanModule } from '../tingkatan/tingkatan.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ApprovalModule } from '../approvals/approval.module';
import { ImportsModule } from '../imports/imports.module';

@Module({
  imports: [PenandatanganModule, TingkatanModule, NotificationsModule, ApprovalModule, ImportsModule],
  controllers: [MembersController],
  providers: [MembersService, MembersDigitalCardService, MembersWorkflowService],
  exports: [MembersService],
})
export class MembersModule {}
