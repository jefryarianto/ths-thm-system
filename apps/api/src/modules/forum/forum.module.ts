import { Module } from '@nestjs/common';
import { ForumController } from './forum.controller';
import { ForumService } from './forum.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ForumController],
  providers: [ForumService, NotificationsService],
  exports: [ForumService],
})
export class ForumModule {}
