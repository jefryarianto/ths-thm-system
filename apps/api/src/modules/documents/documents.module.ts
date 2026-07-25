import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { DocumentBatchService } from './document-batch.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, DocumentBatchService],
  exports: [DocumentsService, DocumentBatchService],
})
export class DocumentsModule {}
