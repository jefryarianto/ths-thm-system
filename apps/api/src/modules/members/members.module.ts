import { Module } from '@nestjs/common';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';
import { MembersDigitalCardService } from './members-digital-card.service';
import { MembersWorkflowService } from './members-workflow.service';
import { PenandatanganModule } from '../penandatangan/penandatangan.module';
import { TingkatanModule } from '../tingkatan/tingkatan.module';

@Module({
  imports: [PenandatanganModule, TingkatanModule],
  controllers: [MembersController],
  providers: [MembersService, MembersDigitalCardService, MembersWorkflowService],
  exports: [MembersService],
})
export class MembersModule {}
