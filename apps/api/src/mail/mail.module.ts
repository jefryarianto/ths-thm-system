import { Module, Global } from '@nestjs/common';
import { MailController } from './mail.controller';
import { MailService } from './mail.service';
import { MailCronService } from './mail-cron.service';
import { NotificationsModule } from '../modules/notifications/notifications.module';

@Global()
@Module({
  imports: [NotificationsModule],
  controllers: [MailController],
  providers: [MailService, MailCronService],
  exports: [MailService],
})
export class MailModule {}
