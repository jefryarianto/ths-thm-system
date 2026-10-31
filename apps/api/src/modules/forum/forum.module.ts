import { Module } from '@nestjs/common';
import { ForumController } from './forum.controller';
import { ForumService } from './forum.service';
import { ForumCategoryService } from './forum-category.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { ScopeModule } from '../../common/scope.module';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [ScopeModule, PrismaModule, NotificationsModule],
  controllers: [ForumController],
  providers: [ForumService, ForumCategoryService],
  exports: [ForumService, ForumCategoryService],
})
export class ForumModule {}
