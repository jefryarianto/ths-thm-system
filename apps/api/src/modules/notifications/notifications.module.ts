import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { EventsGateway } from './events.gateway';
import { AuditGatewayBridge } from './subscribers/audit-gateway-bridge';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, EventsGateway, AuditGatewayBridge],
  exports: [NotificationsService, EventsGateway],
})
export class NotificationsModule {}
