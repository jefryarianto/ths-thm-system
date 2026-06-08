import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../mail/mail.service';
import { EventsGateway } from './events.gateway';
import { CacheService } from '../../common/services/cache.service';

describe('NotificationsService', () => {
  let service: NotificationsService;

  const mockPrisma = {
    notifikasi: {
      create: jest.fn(),
      createMany: jest.fn().mockResolvedValue({ count: 0 }),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      groupBy: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    setting: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    deviceToken: {
      findMany: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  const mockGateway = {
    sendNotification: jest.fn(),
    sendUnreadCount: jest.fn(),
  };

  const mockMailService = {
    sendMail: jest.fn().mockResolvedValue(true),
  };

  const mockCache = {
    getOrSet: jest.fn().mockImplementation((_key: string, factory: () => Promise<unknown>) => factory()),
    invalidatePrefix: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MailService, useValue: mockMailService },
        { provide: EventsGateway, useValue: mockGateway },
        { provide: CacheService, useValue: mockCache },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('broadcast', () => {
    it('should send notification to all active users', async () => {
      const mockUsers = [
        { id: 'u1', email: 'a@test.com', namaLengkap: 'A', role: 'anggota', isActive: true },
        { id: 'u2', email: 'b@test.com', namaLengkap: 'B', role: 'anggota', isActive: true },
      ];
      mockPrisma.user.findMany.mockResolvedValue(mockUsers);
      // No custom preferences — all users allowed
      mockPrisma.setting.findMany.mockResolvedValue([]);
      mockPrisma.notifikasi.createMany.mockResolvedValue({ count: 2 });
      mockPrisma.notifikasi.groupBy.mockResolvedValue([
        { userId: 'u1', _count: 0 },
        { userId: 'u2', _count: 1 },
      ]);
      mockPrisma.deviceToken.findMany.mockResolvedValue([]);

      const result = await service.broadcast({ judul: 'Broadcast', isi: 'Hello all' });
      expect(result.success).toBe(true);
      expect(result.data.sentTo).toBe(2);
      expect(result.data.total).toBe(2);
      // Should use createMany for batch insert
      expect(mockPrisma.notifikasi.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ userId: 'u1', judul: 'Broadcast' }),
          expect.objectContaining({ userId: 'u2', judul: 'Broadcast' }),
        ]),
      });
      // Should emit WebSocket to both users
      expect(mockGateway.sendNotification).toHaveBeenCalledTimes(2);
      expect(mockGateway.sendUnreadCount).toHaveBeenCalledTimes(2);
    });

    it('should filter users by notification preference', async () => {
      const mockUsers = [
        { id: 'u1', email: 'a@test.com', namaLengkap: 'A', role: 'anggota', isActive: true },
        { id: 'u2', email: 'b@test.com', namaLengkap: 'B', role: 'anggota', isActive: true },
      ];
      mockPrisma.user.findMany.mockResolvedValue(mockUsers);
      // User u1 has disabled 'umum' notifications
      mockPrisma.setting.findMany.mockResolvedValue([
        { key: 'notif_pref:u1', value: { umum: false } },
      ]);
      mockPrisma.notifikasi.createMany.mockResolvedValue({ count: 1 });
      mockPrisma.notifikasi.groupBy.mockResolvedValue([{ userId: 'u2', _count: 0 }]);
      mockPrisma.deviceToken.findMany.mockResolvedValue([]);

      const result = await service.broadcast({ judul: 'Broadcast', isi: 'Hello' });
      expect(result.success).toBe(true);
      // Only u2 should receive (u1 disabled 'umum')
      expect(result.data.sentTo).toBe(1);
      expect(mockPrisma.notifikasi.createMany).toHaveBeenCalledWith({
        data: [expect.objectContaining({ userId: 'u2' })],
      });
    });

    it('should handle empty user list gracefully', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);

      const result = await service.broadcast({ judul: 'Empty', isi: 'No users' });
      expect(result.success).toBe(true);
      expect(result.data.sentTo).toBe(0);
      // createMany should not be called with empty array
      expect(mockPrisma.notifikasi.createMany).not.toHaveBeenCalled();
    });
  });

  describe('sendToRole', () => {
    it('should send notification to users with specified role', async () => {
      const mockUsers = [
        { id: 'u1', email: 'admin@test.com', namaLengkap: 'Admin', role: 'admin_distrik', isActive: true },
        { id: 'u2', email: 'admin2@test.com', namaLengkap: 'Admin2', role: 'admin_distrik', isActive: true },
      ];
      mockPrisma.user.findMany.mockResolvedValue(mockUsers);
      // No custom preferences — all allowed
      mockPrisma.setting.findMany.mockResolvedValue([]);
      mockPrisma.notifikasi.createMany.mockResolvedValue({ count: 2 });
      mockPrisma.notifikasi.groupBy.mockResolvedValue([
        { userId: 'u1', _count: 0 },
        { userId: 'u2', _count: 0 },
      ]);
      mockPrisma.deviceToken.findMany.mockResolvedValue([]);

      const result = await service.sendToRole({
        role: 'admin_distrik',
        judul: 'Role broadcast',
        isi: 'Only admins',
      });
      expect(result.success).toBe(true);
      expect(result.data.sentTo).toBe(2);
      // Verify role filter was applied
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: { role: 'admin_distrik', isActive: true },
      });
      expect(mockPrisma.notifikasi.createMany).toHaveBeenCalled();
    });

    it('should use custom tipe for preference check', async () => {
      const mockUsers = [
        { id: 'u1', email: 'a@test.com', namaLengkap: 'A', role: 'anggota', isActive: true },
      ];
      mockPrisma.user.findMany.mockResolvedValue(mockUsers);
      // User has reminder_latihan enabled
      mockPrisma.setting.findMany.mockResolvedValue([
        { key: 'notif_pref:u1', value: { reminder_latihan: true } },
      ]);
      mockPrisma.notifikasi.createMany.mockResolvedValue({ count: 1 });
      mockPrisma.notifikasi.groupBy.mockResolvedValue([{ userId: 'u1', _count: 0 }]);
      mockPrisma.deviceToken.findMany.mockResolvedValue([]);

      const result = await service.sendToRole({
        role: 'anggota',
        judul: 'Training reminder',
        isi: 'Time for training',
        tipe: 'reminder_latihan',
      });
      expect(result.success).toBe(true);
      expect(result.data.sentTo).toBe(1);
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count', async () => {
      mockPrisma.notifikasi.count.mockResolvedValue(5);
      const result = await service.getUnreadCount('u1');
      expect(result.success).toBe(true);
      expect(result.data.count).toBe(5);
    });
  });

  describe('findAll', () => {
    it('should return paginated notifications', async () => {
      const mockNotifs = [{ id: 'n1', judul: 'Test', isRead: false }];
      mockPrisma.notifikasi.findMany.mockResolvedValue(mockNotifs);
      mockPrisma.notifikasi.count.mockResolvedValue(1);

      const result = await service.findAll('u1', { page: 1, limit: 20 });
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockNotifs);
      expect(result.meta.total).toBe(1);
      expect(result.meta.unreadCount).toBe(1);
    });

    it('should filter by tipe', async () => {
      mockPrisma.notifikasi.findMany.mockResolvedValue([]);
      mockPrisma.notifikasi.count.mockResolvedValue(0);

      await service.findAll('u1', { tipe: 'umum' });
      expect(mockPrisma.notifikasi.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tipe: 'umum' }),
        }),
      );
    });
  });

  describe('markAsRead', () => {
    it('should mark a notification as read', async () => {
      mockPrisma.notifikasi.findUnique.mockResolvedValue({ userId: 'u1' });
      mockPrisma.notifikasi.update.mockResolvedValue({});
      const result = await service.markAsRead('n1');
      expect(result.success).toBe(true);
      expect(mockPrisma.notifikasi.update).toHaveBeenCalledWith({
        where: { id: 'n1' },
        data: { isRead: true },
      });
    });

    it('should throw NotFoundException when userId does not match', async () => {
      mockPrisma.notifikasi.findUnique.mockResolvedValue({ userId: 'other-user' });
      await expect(service.markAsRead('n1', 'current-user')).rejects.toThrow(NotFoundException);
      expect(mockPrisma.notifikasi.update).not.toHaveBeenCalled();
    });

    it('should allow admin access without userId check', async () => {
      mockPrisma.notifikasi.findUnique.mockResolvedValue({ userId: 'other-user' });
      mockPrisma.notifikasi.update.mockResolvedValue({});
      // Without userId param, skip ownership check
      const result = await service.markAsRead('n1');
      expect(result.success).toBe(true);
      expect(mockPrisma.notifikasi.update).toHaveBeenCalled();
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', async () => {
      mockPrisma.notifikasi.updateMany.mockResolvedValue({ count: 3 });
      const result = await service.markAllAsRead('u1');
      expect(result.success).toBe(true);
      expect(mockPrisma.notifikasi.updateMany).toHaveBeenCalledWith({
        where: { userId: 'u1', isRead: false },
        data: { isRead: true },
      });
    });
  });

  describe('findOne', () => {
    it('should return a notification', async () => {
      mockPrisma.notifikasi.findUnique.mockResolvedValue({ id: 'n1', judul: 'Test', userId: 'u1' });
      const result = await service.findOne('n1');
      expect(result.success).toBe(true);
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrisma.notifikasi.findUnique.mockResolvedValue(null);
      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when userId does not match', async () => {
      mockPrisma.notifikasi.findUnique.mockResolvedValue({ id: 'n1', userId: 'other-user' });
      await expect(service.findOne('n1', 'current-user')).rejects.toThrow(NotFoundException);
    });

    it('should return notification when userId matches', async () => {
      mockPrisma.notifikasi.findUnique.mockResolvedValue({ id: 'n1', judul: 'Test', userId: 'u1' });
      const result = await service.findOne('n1', 'u1');
      expect(result.success).toBe(true);
      expect(result.data.userId).toBe('u1');
    });
  });

  describe('delete', () => {
    it('should delete a notification', async () => {
      mockPrisma.notifikasi.findUnique.mockResolvedValue({ userId: 'u1' });
      mockPrisma.notifikasi.delete.mockResolvedValue({});
      const result = await service.delete('n1');
      expect(result.success).toBe(true);
    });

    it('should throw NotFoundException when userId does not match', async () => {
      mockPrisma.notifikasi.findUnique.mockResolvedValue({ userId: 'other-user' });
      await expect(service.delete('n1', 'current-user')).rejects.toThrow(NotFoundException);
      expect(mockPrisma.notifikasi.delete).not.toHaveBeenCalled();
    });

    it('should allow admin delete without userId check', async () => {
      mockPrisma.notifikasi.findUnique.mockResolvedValue({ userId: 'other-user' });
      mockPrisma.notifikasi.delete.mockResolvedValue({});
      const result = await service.delete('n1');
      expect(result.success).toBe(true);
      expect(mockPrisma.notifikasi.delete).toHaveBeenCalled();
    });
  });

  describe('send', () => {
    it('should create notification and push via WebSocket', async () => {
      mockPrisma.setting.findUnique.mockResolvedValue(null); // default prefs = all enabled
      mockPrisma.notifikasi.create.mockResolvedValue({ id: 'n1', userId: 'u1', judul: 'Hi' });
      mockPrisma.notifikasi.count.mockResolvedValue(0);
      mockPrisma.deviceToken.findMany.mockResolvedValue([]);

      const result = await service.send('u1', {
        userId: 'u1',
        judul: 'Hi',
        isi: 'Hello',
        tipe: 'umum',
      });
      expect(result.success).toBe(true);
      expect(mockGateway.sendNotification).toHaveBeenCalled();
      expect(mockGateway.sendUnreadCount).toHaveBeenCalled();
    });

    it('should skip if user disabled notification type', async () => {
      mockPrisma.setting.findUnique.mockResolvedValue({
        value: { umum: false },
      });

      const result = await service.send('u1', {
        userId: 'u1',
        judul: 'Hi',
        isi: 'Hello',
        tipe: 'umum',
      });
      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
      expect(result.message).toContain('ditunda');
    });
  });

  describe('getPreferences', () => {
    it('should return default preferences when none saved', async () => {
      mockPrisma.setting.findUnique.mockResolvedValue(null);
      const result = await service.getPreferences('u1');
      expect(result.success).toBe(true);
      // All default to true
      expect(result.data.welcome).toBe(true);
      expect(result.data.umum).toBe(true);
    });

    it('should return saved preferences', async () => {
      mockPrisma.setting.findUnique.mockResolvedValue({
        value: { umum: false, welcome: true },
      });
      const result = await service.getPreferences('u1');
      expect(result.data.umum).toBe(false);
      expect(result.data.welcome).toBe(true);
    });
  });

  describe('updatePreferences', () => {
    it('should upsert preferences', async () => {
      mockPrisma.setting.upsert.mockResolvedValue({});
      const result = await service.updatePreferences('u1', { umum: false });
      expect(result.success).toBe(true);
      expect(mockPrisma.setting.upsert).toHaveBeenCalled();
    });
  });

  describe('registerDeviceToken', () => {
    it('should upsert device token and update user fcmToken', async () => {
      mockPrisma.deviceToken.upsert.mockResolvedValue({});
      mockPrisma.user.update.mockResolvedValue({});
      const result = await service.registerDeviceToken('u1', 'token-abc', 'android');
      expect(result.success).toBe(true);
      expect(mockPrisma.deviceToken.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { token: 'token-abc' },
          create: expect.objectContaining({ userId: 'u1', platform: 'android' }),
        }),
      );
    });
  });

  describe('unregisterDeviceToken', () => {
    it('should deactivate device token', async () => {
      mockPrisma.deviceToken.update.mockResolvedValue({});
      const result = await service.unregisterDeviceToken('dt1');
      expect(result.success).toBe(true);
      expect(mockPrisma.deviceToken.update).toHaveBeenCalledWith({
        where: { id: 'dt1' },
        data: { isActive: false },
      });
    });
  });
});
