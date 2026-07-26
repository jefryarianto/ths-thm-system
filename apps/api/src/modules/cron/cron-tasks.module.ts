import { Module } from '@nestjs/common';
import { CronTasksService } from './cron-tasks.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  providers: [CronTasksService],
})
export class CronTasksModule {}
