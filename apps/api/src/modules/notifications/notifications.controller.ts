import { Controller, Get, Post, Delete, Body, Param, Query, Patch } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Notifications')
@Controller('notifications')
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Post('send')
  @Roles('superadmin', 'admin_distrik')
  send(@Body() dto: any) { return this.service.send(dto.userId, dto); }

  @Post('broadcast')
  @Roles('superadmin')
  broadcast(@Body() dto: any) { return this.service.broadcast(dto); }

  @Post('role')
  @Roles('superadmin')
  sendToRole(@Body() dto: any) { return this.service.sendToRole(dto); }

  @Get('count')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', 'anggota')
  getCount(@CurrentUser() user: any) {
    return this.service.getUnreadCount(user.id);
  }

  @Get()
  findAll(@CurrentUser() user: any, @Query() query: any) {
    return this.service.findAll(user.id, query);
  }

  @Patch(':id/read')
  markAsRead(@Param('id') id: string) { return this.service.markAsRead(id); }

  @Patch('read-all')
  markAllAsRead(@CurrentUser() user: any) { return this.service.markAllAsRead(user.id); }

  // ─── Notification Preferences ───

  @Get('preferences')
  getPreferences(@CurrentUser() user: any) {
    return this.service.getPreferences(user.id);
  }

  @Patch('preferences')
  updatePreferences(@CurrentUser() user: any, @Body() dto: Record<string, boolean>) {
    return this.service.updatePreferences(user.id, dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Delete(':id')
  delete(@Param('id') id: string) { return this.service.delete(id); }

  @Post('fcm-token')
  registerToken(@CurrentUser() user: any, @Body() dto: any) {
    return this.service.registerDeviceToken(user.id, dto.token, dto.platform);
  }

  @Delete('fcm-token/:id')
  unregisterToken(@Param('id') id: string) { return this.service.unregisterDeviceToken(id); }
}