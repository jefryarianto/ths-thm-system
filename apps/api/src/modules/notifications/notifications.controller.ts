import { Controller, Get, Post, Delete, Body, Param, Query, Patch } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SendNotificationDto, BroadcastNotificationDto, SendToRoleDto, NotificationFilterDto, RegisterDeviceTokenDto } from './dto/notification.dto';

@ApiTags('Notifications')
@Controller('notifications')
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Post('send')
  @Roles('superadmin', 'admin_distrik')
  send(@Body() dto: SendNotificationDto) { return this.service.send(dto.userId, dto); }

  @Post('broadcast')
  @Roles('superadmin')
  broadcast(@Body() dto: BroadcastNotificationDto) { return this.service.broadcast(dto); }

  @Post('role')
  @Roles('superadmin')
  sendToRole(@Body() dto: SendToRoleDto) { return this.service.sendToRole(dto); }

  @Get('count')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', 'anggota')
  getCount(@CurrentUser() user: { id: string }) {
    return this.service.getUnreadCount(user.id);
  }

  @Get()
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', 'anggota')
  findAll(@CurrentUser() user: { id: string }, @Query() query: NotificationFilterDto) {
    return this.service.findAll(user.id, query);
  }

  @Patch(':id/read')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', 'anggota')
  markAsRead(@Param('id') id: string, @CurrentUser() user: { id: string }) { return this.service.markAsRead(id, user.id); }

  @Patch('read-all')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', 'anggota')
  markAllAsRead(@CurrentUser() user: { id: string }) { return this.service.markAllAsRead(user.id); }

  @Get('stats')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', 'anggota')
  getStats(@CurrentUser() user: { id: string }) {
    return this.service.getStats(user.id);
  }

  @Get('preferences')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', 'anggota')
  getPreferences(@CurrentUser() user: { id: string }) {
    return this.service.getPreferences(user.id);
  }

  @Patch('preferences')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', 'anggota')
  updatePreferences(@CurrentUser() user: { id: string }, @Body() dto: Record<string, unknown>) {
    return this.service.updatePreferences(user.id, dto);
  }

  @Get(':id')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', 'anggota')
  findOne(@Param('id') id: string, @CurrentUser() user: { id: string }) { return this.service.findOne(id, user.id); }

  @Delete(':id')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', 'anggota')
  delete(@Param('id') id: string, @CurrentUser() user: { id: string }) { return this.service.delete(id, user.id); }

  @Post('fcm-token')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', 'anggota')
  registerToken(@CurrentUser() user: { id: string }, @Body() dto: RegisterDeviceTokenDto) {
    return this.service.registerDeviceToken(user.id, dto.token, dto.platform);
  }

  @Delete('fcm-token/:id')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', 'anggota')
  unregisterToken(@Param('id') id: string) { return this.service.unregisterDeviceToken(id); }
}
