import { Module } from '@nestjs/common';
import { CronTasksService } from './cron-tasks.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { GraduationsModule } from '../graduations/graduations.module';

@Module({
  imports: [NotificationsModule, GraduationsModule],
  providers: [CronTasksService],
})
export class CronTasksModule {}
