import { Module } from '@nestjs/common';
import { ForumController } from './forum.controller';
import { ForumService } from './forum.service';
import { ForumCategoryService } from './forum-category.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ScopeModule } from '../../common/scope.module';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [ScopeModule, PrismaModule],
  controllers: [ForumController],
  providers: [ForumService, ForumCategoryService, NotificationsService],
  exports: [ForumService, ForumCategoryService],
})
export class ForumModule {}
