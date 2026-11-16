import { Module } from '@nestjs/common';
import { GaleriController } from './galeri.controller';
import { GaleriService } from './galeri.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [GaleriController],
  providers: [GaleriService],
})
export class GaleriModule {}
