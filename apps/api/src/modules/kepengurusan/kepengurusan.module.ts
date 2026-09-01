import { Module } from '@nestjs/common';
import { KepengurusanController } from './kepengurusan.controller';
import { KepengurusanService } from './kepengurusan.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ScopeModule } from '../../common/scope.module';

@Module({
  imports: [PrismaModule, NotificationsModule, ScopeModule],
  controllers: [KepengurusanController],
  providers: [KepengurusanService],
  exports: [KepengurusanService],
})
export class KepengurusanModule {}
