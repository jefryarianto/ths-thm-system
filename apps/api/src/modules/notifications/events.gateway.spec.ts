import { Test, TestingModule } from '@nestjs/testing';
import { EventsGateway } from './events.gateway';
import { Logger } from '@nestjs/common';

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn((token: string) => {
    if (token === 'valid-token') return { sub: 'user-1', email: 'test@test.com', role: 'admin_distrik' };
    if (token === 'valid-token-2') return { sub: 'user-2', email: 'test2@test.com', role: 'anggota' };
    throw new Error('Invalid token');
  }),
}));

describe('EventsGateway', () => {
  let gateway: EventsGateway;

  // Mock socket helpers
  const createMockSocket = (id: string, token?: string) => {
    const joins: string[] = [];
    const emittedEvents: Array<{ event: string; args: any[] }> = [];
    return {
      id,
      handshake: {
        auth: token ? { token } : {},
        headers: token ? {} : {},
      },
      join: jest.fn((room: string) => joins.push(room)),
      leave: jest.fn(),
      emit: jest.fn((event: string, ...args: any[]) => {
        emittedEvents.push({ event, args });
      }),
      disconnect: jest.fn(),
      _joins: joins,
      _emitted: emittedEvents,
    } as any;
  };

  const createMockServer = () => {
    const roomEmits: Array<{ room: string; event: string; args: any[] }> = [];
    const sockets = new Map<string, any>();
    return {
      to: jest.fn((room: string) => ({
        emit: (event: string, ...args: any[]) => {
          roomEmits.push({ room, event, args });
        },
      })),
      emit: jest.fn((event: string, ...args: any[]) => {
        roomEmits.push({ room: 'global', event, args });
      }),
      sockets: {
        sockets,
      },
      _roomEmits: roomEmits,
    } as any;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EventsGateway],
    }).compile();

    gateway = module.get<EventsGateway>(EventsGateway);
    gateway.server = createMockServer();
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  // ─── handleConnection ───
  describe('handleConnection', () => {
    it('should connect client with valid token', () => {
      const socket = createMockSocket('sock-1', 'valid-token');
      gateway.handleConnection(socket);
      expect(socket.join).toHaveBeenCalledWith('user:user-1');
      expect(gateway.isUserOnline('user-1')).toBe(true);
    });

    it('should disconnect client without token', () => {
      const socket = createMockSocket('sock-1');
      gateway.handleConnection(socket);
      expect(socket.disconnect).toHaveBeenCalled();
    });

    it('should disconnect client with invalid token', () => {
      const socket = createMockSocket('sock-1', 'bad-token');
      gateway.handleConnection(socket);
      expect(socket.disconnect).toHaveBeenCalled();
    });

    it('should attach role from JWT payload to socket', () => {
      const socket = createMockSocket('sock-1', 'valid-token');
      gateway.handleConnection(socket);
      expect((socket as any).userId).toBe('user-1');
      expect((socket as any).role).toBe('admin_distrik');
    });

    it('should track multiple sockets per user', () => {
      const s1 = createMockSocket('s1', 'valid-token');
      const s2 = createMockSocket('s2', 'valid-token');
      gateway.handleConnection(s1);
      gateway.handleConnection(s2);
      expect(gateway.getOnlineUserCount()).toBe(1);
    });
  });

  // ─── handleDisconnect ───
  describe('handleDisconnect', () => {
    it('should remove socket from tracking', () => {
      const s1 = createMockSocket('s1', 'valid-token');
      const s2 = createMockSocket('s2', 'valid-token');
      gateway.handleConnection(s1);
      gateway.handleConnection(s2);
      expect(gateway.getOnlineUserCount()).toBe(1);

      gateway.handleDisconnect(s1);
      expect(gateway.getOnlineUserCount()).toBe(1); // s2 still connected

      gateway.handleDisconnect(s2);
      expect(gateway.getOnlineUserCount()).toBe(0); // all disconnected
    });

    it('should handle disconnect for unknown socket gracefully', () => {
      const unknown = createMockSocket('unknown');
      (unknown as any).userId = undefined;
      expect(() => gateway.handleDisconnect(unknown)).not.toThrow();
    });
  });

  // ─── sendNotification ───
  describe('sendNotification', () => {
    it('should emit notification:new to user room', () => {
      const data = { id: 'n1', judul: 'Test' };
      gateway.sendNotification('user-1', data);
      expect(gateway.server.to).toHaveBeenCalledWith('user:user-1');
    });
  });

  // ─── sendUnreadCount ───
  describe('sendUnreadCount', () => {
    it('should emit notification:count to user room', () => {
      gateway.sendUnreadCount('user-1', 5);
      expect(gateway.server.to).toHaveBeenCalledWith('user:user-1');
    });
  });

  // ─── broadcastNotification ───
  describe('broadcastNotification', () => {
    it('should emit to all connected sockets', () => {
      const data = { judul: 'Broadcast', isi: 'Hello' };
      gateway.broadcastNotification(data);
      expect(gateway.server.emit).toHaveBeenCalledWith('notification:new', data);
    });
  });

  // ─── sendToRole ───
  describe('sendToRole', () => {
    it('should emit to sockets with matching role', () => {
      const s1 = createMockSocket('s1', 'valid-token');
      const s2 = createMockSocket('s2', 'valid-token-2');
      gateway.handleConnection(s1);
      gateway.handleConnection(s2);
      // In real Socket.IO, server.sockets.sockets is managed automatically.
      // Register mock sockets in the server Map for sendToRole to iterate.
      gateway.server.sockets.sockets.set('s1', s1);
      gateway.server.sockets.sockets.set('s2', s2);

      gateway.sendToRole('admin_distrik', { judul: 'Admin Only' });
      expect(s1.emit).toHaveBeenCalledWith('notification:new', { judul: 'Admin Only' });
      expect(s2.emit).not.toHaveBeenCalled();
    });

    it('should not emit to any socket if no matching role', () => {
      const s1 = createMockSocket('s1', 'valid-token');
      gateway.handleConnection(s1);
      gateway.server.sockets.sockets.set('s1', s1);

      gateway.sendToRole('superadmin', { judul: 'Superadmin Only' });
      expect(s1.emit).not.toHaveBeenCalled();
    });
  });

  // ─── isUserOnline / getOnlineUserCount ───
  describe('isUserOnline', () => {
    it('should return false for unknown user', () => {
      expect(gateway.isUserOnline('unknown')).toBe(false);
    });

    it('should return true for connected user', () => {
      const s1 = createMockSocket('s1', 'valid-token');
      gateway.handleConnection(s1);
      expect(gateway.isUserOnline('user-1')).toBe(true);
    });
  });

  describe('getOnlineUserCount', () => {
    it('should return 0 when no users connected', () => {
      expect(gateway.getOnlineUserCount()).toBe(0);
    });

    it('should count unique users, not sockets', () => {
      const s1 = createMockSocket('s1', 'valid-token');
      const s2 = createMockSocket('s2', 'valid-token');
      gateway.handleConnection(s1);
      gateway.handleConnection(s2);
      expect(gateway.getOnlineUserCount()).toBe(1); // same user, 2 sockets
    });
  });
});
