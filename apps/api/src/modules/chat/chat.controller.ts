import { Controller, Get, Post, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Chat')
@Controller('chat')
@ApiBearerAuth()
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('rooms')
  @ApiOperation({ summary: 'Ambil ruang chat' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', 'anggota')
  getRooms(@CurrentUser() user: { id: string; role: string }) {
    return this.chatService.getUserRooms(user);
  }

  @Post('rooms/:roomId/messages')
  @ApiOperation({ summary: 'Kirim pesan' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', 'anggota')
  async sendMessage(
    @Param('roomId') roomId: string,
    @Body() body: { content: string; type?: string },
    @CurrentUser() user: { id: string; email: string; role: string },
  ) {
    const message = await this.chatService.saveMessage({
      roomId,
      senderId: user.id,
      content: body.content,
      type: body.type,
    });
    return { success: true, data: message };
  }

  @Get('rooms/:roomId/messages')
  @ApiOperation({ summary: 'Ambil pesan' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', 'anggota')
  async getMessages(
    @Param('roomId') roomId: string,
    @Query('limit') limit?: string,
    @Query('before') before?: string,
  ) {
    const messages = await this.chatService.getMessages(
      roomId,
      limit ? parseInt(limit, 10) : 50,
      before,
    );
    return { success: true, data: messages };
  }

  @Delete('messages/:id')
  @ApiOperation({ summary: 'Hapus pesan' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', 'anggota')
  async deleteMessage(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.chatService.deleteMessage(id, user.id);
  }

  @Post('rooms/:roomId/read')
  @ApiOperation({ summary: 'Tandai pesan terbaca' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', 'anggota')
  async markAsRead(@Param('roomId') roomId: string, @CurrentUser() user: { id: string }) {
    return this.chatService.markAsRead(roomId, user.id);
  }
}
