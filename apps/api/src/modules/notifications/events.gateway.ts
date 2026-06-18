import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

function getJwtSecret(): string {
  if (process.env.JWT_SECRET) {
    return process.env.JWT_SECRET;
  }

  // Allow tests to run without explicit env configuration
  if (process.env.NODE_ENV === 'test') {
    return 'test-secret';
  }

  throw new Error('JWT_SECRET environment variable is required for EventsGateway');
}

const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
  : ['http://localhost:3000'];

@WebSocketGateway({
  cors: { origin: corsOrigins },
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

      const payload = jwt.verify(token, getJwtSecret()) as {
        sub: string;
        email: string;
        role: string;
      };
      const userId = payload.sub;

      // Attach userId and role to socket for later use
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (client as any).userId = userId;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (client as any).role = payload.role;

      // Track user sockets
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);

      // Join user-specific room
      client.join(`user:${userId}`);

      this.logger.log(`Client connected: ${client.id} (user: ${userId})`);
    } catch {
      this.logger.warn('Invalid token, disconnecting client');
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sendNotification(userId: string, data: any) {
    this.server.to(`user:${userId}`).emit('notification:new', data);
  }

  // ─── Emit notification count update ───
  sendUnreadCount(userId: string, count: number) {
    this.server.to(`user:${userId}`).emit('notification:count', { count });
  }

  // ─── Broadcast to all connected users ───
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  broadcastNotification(data: any) {
    this.server.emit('notification:new', data);
  }

  // ─── Emit to users with specific role ───
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sendToRole(role: string, data: any) {
    // Iterate all connected clients and emit to matching roles
    this.server.sockets.sockets.forEach((socket: Socket) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
