import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = (() => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required for ChatGateway');
  }
  return secret;
})();

const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
  : ['http://localhost:3000'];

interface ChatMessage {
  roomId: string;
  content: string;
  type?: 'text' | 'file' | 'image';
}

/** Data sesi yang dilampirkan ke client saat handshake (dulu di-stamp langsung tanpa tipe). */
interface ChatClientData {
  userId: string;
  email: string;
  role: string;
}

@WebSocketGateway({
  cors: { origin: corsOrigins },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('ChatGateway');
  private userSockets = new Map<string, Set<string>>();
  private roomUsers = new Map<string, Set<string>>();

  handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn('Client connected without token, disconnecting');
        client.disconnect();
        return;
      }

      const payload = jwt.verify(token, JWT_SECRET) as { sub: string; email: string; role: string };
      const userId = payload.sub;

      (client.data as ChatClientData).userId = userId;
      (client.data as ChatClientData).email = payload.email;
      (client.data as ChatClientData).role = payload.role;

      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);

      this.logger.log(`Chat client connected: ${client.id} (user: ${userId})`);
    } catch {
      this.logger.warn('Invalid token, disconnecting client');
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = (client.data as ChatClientData).userId;
    if (userId) {
      const sockets = this.userSockets.get(userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) this.userSockets.delete(userId);
      }
      this.roomUsers.forEach((sockets, roomId) => {
        if (sockets.has(client.id)) {
          sockets.delete(client.id);
          client.to(roomId).emit('user:left', { userId, roomId });
        }
      });
    }
    this.logger.log(`Chat client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string }) {
    const userId = (client.data as ChatClientData).userId;
    client.join(data.roomId);

    if (!this.roomUsers.has(data.roomId)) {
      this.roomUsers.set(data.roomId, new Set());
    }
    this.roomUsers.get(data.roomId)!.add(client.id);

    client.to(data.roomId).emit('user:joined', { userId, roomId: data.roomId });
    this.logger.log(`User ${userId} joined room ${data.roomId}`);
  }

  @SubscribeMessage('leaveRoom')
  handleLeaveRoom(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string }) {
    const userId = (client.data as ChatClientData).userId;
    client.leave(data.roomId);

    const roomSockets = this.roomUsers.get(data.roomId);
    if (roomSockets) {
      roomSockets.delete(client.id);
      if (roomSockets.size === 0) this.roomUsers.delete(data.roomId);
    }

    client.to(data.roomId).emit('user:left', { userId, roomId: data.roomId });
  }

  @SubscribeMessage('chatMessage')
  handleChatMessage(@ConnectedSocket() client: Socket, @MessageBody() data: ChatMessage) {
    const clientData = client.data as ChatClientData;
    const userId = clientData.userId;
    const email = clientData.email;
    const role = clientData.role;

    const message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      roomId: data.roomId,
      content: data.content,
      type: data.type || 'text',
      userId,
      email,
      role,
      timestamp: new Date().toISOString(),
    };

    client.to(data.roomId).emit('chat:message', message);
    return message;
  }

  @SubscribeMessage('typing:start')
  handleTypingStart(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string }) {
    const userId = (client.data as ChatClientData).userId;
    client.to(data.roomId).emit('typing:start', { userId, roomId: data.roomId });
  }

  @SubscribeMessage('typing:stop')
  handleTypingStop(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string }) {
    const userId = (client.data as ChatClientData).userId;
    client.to(data.roomId).emit('typing:stop', { userId, roomId: data.roomId });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sendToRoom(roomId: string, event: string, data: any) {
    this.server.to(roomId).emit(event, data);
  }

  getRoomUserCount(roomId: string): number {
    return this.roomUsers.get(roomId)?.size || 0;
  }
}
