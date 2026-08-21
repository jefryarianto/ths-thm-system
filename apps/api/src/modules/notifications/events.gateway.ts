import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

function getJwtSecret(): string {
  if (process.env.JWT_SECRET) {
    return process.env.JWT_SECRET;
  }
  if (process.env.NODE_ENV === 'test') {
    return 'test-secret';
  }
  throw new Error('JWT_SECRET environment variable is required for EventsGateway');
}

const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
  : ['http://localhost:3000'];

/** Batas koneksi per IP per menit (anti connection flood). */
const MAX_CONNECTIONS_PER_IP_PER_MIN = Math.max(
  5,
  parseInt(process.env.SOCKET_MAX_CONNECTIONS_PER_IP || '20', 10) || 20,
);
/** Batas paket (event dari client) per socket per 10 detik. */
const MAX_PACKETS_PER_WINDOW = Math.max(
  10,
  parseInt(process.env.SOCKET_MAX_PACKETS_PER_WINDOW || '30', 10) || 30,
);
const PACKET_WINDOW_MS = 10_000;

@WebSocketGateway({
  cors: { origin: corsOrigins },
  namespace: '/',
})
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger = new Logger('EventsGateway');
  // userId → Set<socketId>
  private userSockets = new Map<string, Set<string>>();
  // ip → timestamps of recent connection attempts (sliding window per menit)
  private ipConnections = new Map<string, number[]>();
  // socketId → array of packet timestamps (sliding window per 10 detik)
  private packetWindows = new Map<string, number[]>();
  private throttledPackets = 0;
  private rejectedConnections = 0;

  afterInit(server: Server) {
    // Middleware handshake: rate-limit per IP + verifikasi JWT WAJIB.
    // Koneksi tanpa token valid ditolak di level handshake (bukan sekadar
    // "connect without auth" seperti sebelumnya).
    server.use((socket, next) => {
      const ip = socket.handshake.address || 'unknown';
      const now = Date.now();
      const recent = (this.ipConnections.get(ip) || []).filter((t) => now - t < 60_000);
      if (recent.length >= MAX_CONNECTIONS_PER_IP_PER_MIN) {
        this.rejectedConnections++;
        this.logger.warn(`Connection flood from IP ${ip} — menolak koneksi`);
        return next(new Error('terlalu banyak koneksi'));
      }
      recent.push(now);
      this.ipConnections.set(ip, recent);

      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.rejectedConnections++;
        this.logger.warn(`Koneksi tanpa token ditolak dari ${ip}`);
        return next(new Error('tidak terautentikasi'));
      }

      try {
        const payload = jwt.verify(token, getJwtSecret()) as {
          sub: string;
          email: string;
          role: string;
        };
        socket.data.userId = payload.sub;
        socket.data.role = payload.role;
        next();
      } catch {
        this.rejectedConnections++;
        this.logger.warn(`Token tidak valid ditolak dari ${ip}`);
        next(new Error('token tidak valid'));
      }
    });
  }

  handleConnection(client: Socket) {
    const userId = client.data.userId as string | undefined;
    if (!userId) {
      // Seharusnya tidak terjadi (middleware sudah menolak) — jaga-jaga.
      client.disconnect(true);
      return;
    }

    // Track user sockets
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(client.id);

    // Join user-specific room
    client.join(`user:${userId}`);

    // Throttle paket dari client (per socket, sliding window 10 detik).
    client.onAny(() => this.trackPacket(client));

    this.logger.log(`Client connected: ${client.id} (user: ${userId})`);
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId as string | undefined;
    if (userId) {
      const sockets = this.userSockets.get(userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) this.userSockets.delete(userId);
      }
    }
    this.packetWindows.delete(client.id);
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  private trackPacket(client: Socket): void {
    const now = Date.now();
    const window = (this.packetWindows.get(client.id) || []).filter(
      (t) => now - t < PACKET_WINDOW_MS,
    );
    window.push(now);
    this.packetWindows.set(client.id, window);
    if (window.length > MAX_PACKETS_PER_WINDOW) {
      this.throttledPackets++;
      this.logger.warn(
        `Client ${client.id} melebihi batas paket — putuskan koneksi`,
      );
      client.disconnect(true);
    }
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
    this.server.sockets.sockets.forEach((socket: Socket) => {
      if (socket.data.role === role) {
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
   * Comprehensive WebSocket statistics for monitoring, termasuk metrik
   * throttle/penolakan koneksi.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getStats(): Record<string, any> {
    if (!this.server?.sockets) {
      return {
        totalConnections: 0,
        uniqueUsers: 0,
        rooms: [],
        userConnectionCounts: {},
        security: {
          throttledPackets: this.throttledPackets,
          rejectedConnections: this.rejectedConnections,
          maxConnectionsPerIpPerMin: MAX_CONNECTIONS_PER_IP_PER_MIN,
          maxPacketsPerWindow: MAX_PACKETS_PER_WINDOW,
        },
        timestamp: new Date().toISOString(),
      };
    }
    const sockets = this.server.sockets.sockets;
    const rooms = this.server.sockets.adapter.rooms;

    const userCounts: Record<string, number> = {};
    this.userSockets.forEach((socketIds, userId) => {
      userCounts[userId] = socketIds.size;
    });

    const roomStats: Array<{ room: string; sockets: number }> = [];
    rooms.forEach((socketSet, roomName) => {
      if (!sockets.has(roomName)) {
        roomStats.push({ room: roomName, sockets: socketSet.size });
      }
    });
    roomStats.sort((a, b) => b.sockets - a.sockets);

    return {
      totalConnections: sockets.size,
      uniqueUsers: this.userSockets.size,
      rooms: roomStats,
      userConnectionCounts: userCounts,
      security: {
        throttledPackets: this.throttledPackets,
        rejectedConnections: this.rejectedConnections,
        maxConnectionsPerIpPerMin: MAX_CONNECTIONS_PER_IP_PER_MIN,
        maxPacketsPerWindow: MAX_PACKETS_PER_WINDOW,
      },
      timestamp: new Date().toISOString(),
    };
  }
}