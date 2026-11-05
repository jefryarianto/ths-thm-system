import { Module } from '@nestjs/common';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';
import { MembersDigitalCardService } from './members-digital-card.service';
import { MembersWorkflowService } from './members-workflow.service';
import { KtaApplicationService } from './kta-application.service';
import { KtaEscalationService } from './kta-escalation.service';
import { KtaAnalyticsService } from './kta-analytics.service';
import { PkiService } from '../../common/services/pki.service';
import { PenandatanganModule } from '../penandatangan/penandatangan.module';
import { TingkatanModule } from '../tingkatan/tingkatan.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ApprovalModule } from '../approvals/approval.module';
import { ImportsModule } from '../imports/imports.module';

@Module({
  imports: [
    PenandatanganModule,
    TingkatanModule,
    NotificationsModule,
    ApprovalModule,
    ImportsModule,
  ],
  controllers: [MembersController],
  providers: [
    MembersService,
    MembersDigitalCardService,
    MembersWorkflowService,
    KtaApplicationService,
    KtaEscalationService,
    KtaAnalyticsService,
    PkiService,
  ],
  exports: [MembersService, KtaApplicationService, KtaAnalyticsService, PkiService],
})
export class MembersModule {}
