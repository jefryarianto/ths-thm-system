import { Module } from '@nestjs/common';
import { GraduationsController } from './graduations.controller';
import { GraduationsService } from './graduations.service';
import { DocumentsModule } from '../documents/documents.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [DocumentsModule, NotificationsModule],
  controllers: [GraduationsController],
  providers: [GraduationsService],
  exports: [GraduationsService],
})
export class GraduationsModule {}
