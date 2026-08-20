import { Module } from '@nestjs/common';
import { ImportBatchService } from './import-batch.service';
import { ImportBatchController } from './import-batch.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [ImportBatchController],
  providers: [ImportBatchService],
  exports: [ImportBatchService],
})
export class ImportsModule {}