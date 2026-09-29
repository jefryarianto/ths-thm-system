import { Module } from '@nestjs/common';
import { CronTasksService } from './cron-tasks.service';
import { EmailBlastService } from './email-blast.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { GraduationsModule } from '../graduations/graduations.module';

@Module({
  imports: [NotificationsModule, GraduationsModule],
  providers: [CronTasksService, EmailBlastService],
})
export class CronTasksModule {}
