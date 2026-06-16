import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Chat')
@Controller('chat')
@ApiBearerAuth()
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('rooms')
  getRooms(@CurrentUser() user: { id: string; role: string }) {
    return this.chatService.getUserRooms(user);
  }

  @Post('rooms/:roomId/messages')
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

  @Post('rooms/:roomId/read')
  async markAsRead(@Param('roomId') roomId: string, @CurrentUser() user: { id: string }) {
    return this.chatService.markAsRead(roomId, user.id);
  }
}
