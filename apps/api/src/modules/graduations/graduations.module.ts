import { Module } from '@nestjs/common';
import { GraduationsController } from './graduations.controller';
import { GraduationsService } from './graduations.service';
import { DocumentsModule } from '../documents/documents.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AssessmentsModule } from '../assessments/assessments.module';
import { ExaminersModule } from '../examiners/examiners.module';

@Module({
  imports: [DocumentsModule, NotificationsModule, AssessmentsModule, ExaminersModule],
  controllers: [GraduationsController],
  providers: [GraduationsService],
  exports: [GraduationsService],
})
export class GraduationsModule {}
