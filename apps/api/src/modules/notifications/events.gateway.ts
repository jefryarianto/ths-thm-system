import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'ths-thm-secret';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('EventsGateway');
  // userId → Set<socketId>
  private userSockets = new Map<string, Set<string>>();

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

      // Attach userId and role to socket for later use
      (client as any).userId = userId;
      (client as any).role = payload.role;

      // Track user sockets
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);

      // Join user-specific room
      client.join(`user:${userId}`);

      this.logger.log(`Client connected: ${client.id} (user: ${userId})`);
    } catch (err) {
      this.logger.warn('Invalid token, disconnecting client');
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = (client as any).userId;
    if (userId) {
      const sockets = this.userSockets.get(userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) this.userSockets.delete(userId);
      }
    }
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // ─── Emit to specific user ───
  sendNotification(userId: string, data: any) {
    this.server.to(`user:${userId}`).emit('notification:new', data);
  }

  // ─── Emit notification count update ───
  sendUnreadCount(userId: string, count: number) {
    this.server.to(`user:${userId}`).emit('notification:count', { count });
  }

  // ─── Broadcast to all connected users ───
  broadcastNotification(data: any) {
    this.server.emit('notification:new', data);
  }

  // ─── Emit to users with specific role ───
  sendToRole(role: string, data: any) {
    // Iterate all connected clients and emit to matching roles
    this.server.sockets.sockets.forEach((socket: Socket) => {
      const userRole = (socket as any).role;
      if (userRole === role) {
        socket.emit('notification:new', data);
      }
    });
  }

  // ─── Check if user is online ───
  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId);
  }

  getOnlineUserCount(): number {
    return this.userSockets.size;
  }
}
