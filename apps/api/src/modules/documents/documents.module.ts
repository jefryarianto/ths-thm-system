import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { DocumentBatchService } from './document-batch.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { PenandatanganModule } from '../penandatangan/penandatangan.module';

@Module({
  imports: [NotificationsModule, PenandatanganModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, DocumentBatchService],
  exports: [DocumentsService, DocumentBatchService],
})
export class DocumentsModule {}
