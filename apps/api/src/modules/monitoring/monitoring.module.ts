import { Module } from '@nestjs/common';
import { MonitoringController } from './monitoring.controller';
import { MonitoringService } from './monitoring.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../mail/mail.service';

@Module({
  controllers: [MonitoringController],
  providers: [MonitoringService, PrismaService, MailService],
  exports: [MonitoringService],
})
export class MonitoringModule {}
