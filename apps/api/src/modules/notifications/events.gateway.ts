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
        this.logger.debug(`Unauthenticated client connected: ${client.id}`);
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
      this.logger.warn(`Invalid token for client ${client.id}, connecting without auth`);
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

  // ─── Emit to specific user (notification:new event) ───
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sendNotification(userId: string, data: any) {
    this.server.to(`user:${userId}`).emit('notification:new', data);
  }

  // ─── Emit arbitrary event to a specific user (e.g., batch:progress, batch:complete) ───
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sendToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
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

  // ─── Broadcast arbitrary event to all connected users ───
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  broadcast(event: string, data: any) {
    this.server.emit(event, data);
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

  /**
   * Returns comprehensive WebSocket connection statistics for monitoring.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getStats(): Record<string, any> {
    const sockets = this.server.sockets.sockets;
    const rooms = this.server.sockets.adapter.rooms;

    // Count connected users and their socket counts
    const userCounts: Record<string, number> = {};
    this.userSockets.forEach((socketIds, userId) => {
      userCounts[userId] = socketIds.size;
    });

    // Build room stats (skip default rooms that start with user: for brevity?)
    // Actually let's show all rooms
    const roomStats: Array<{ room: string; sockets: number }> = [];
    rooms.forEach((socketSet, roomName) => {
      // Skip the default socket.io room (the room with the same name as socket id)
      if (!sockets.has(roomName)) {
        roomStats.push({ room: roomName, sockets: socketSet.size });
      }
    });

    // Sort rooms by socket count descending
    roomStats.sort((a, b) => b.sockets - a.sockets);

    return {
      totalConnections: sockets.size,
      uniqueUsers: this.userSockets.size,
      rooms: roomStats,
      userConnectionCounts: userCounts,
      timestamp: new Date().toISOString(),
    };
  }
}
