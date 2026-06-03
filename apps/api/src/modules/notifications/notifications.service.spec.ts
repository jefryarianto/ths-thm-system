import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('NotificationsService', () => {
  let service: NotificationsService;

  const mockPrisma = {
    notifikasi: {
      create: jest.fn(),
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
    deviceToken: {
      findMany: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    setting: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── getUnreadCount ───
  describe('getUnreadCount', () => {
    it('should return unread count for user', async () => {
      mockPrisma.notifikasi.count.mockResolvedValue(3);
      const result = await service.getUnreadCount('user-1');
      expect(result.success).toBe(true);
      expect(result.data.count).toBe(3);
      expect(mockPrisma.notifikasi.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', isRead: false },
      });
    });

    it('should return 0 when no unread notifications', async () => {
      mockPrisma.notifikasi.count.mockResolvedValue(0);
      const result = await service.getUnreadCount('user-1');
      expect(result.data.count).toBe(0);
    });
  });

  // ─── send ───
  describe('send', () => {
    it('should create notification when preferences are enabled', async () => {
      mockPrisma.setting.findUnique.mockResolvedValue(null); // no prefs = all enabled by default
      const mockNotif = { id: 'notif-1', judul: 'Test', isi: 'Body', tipe: 'umum' };
      mockPrisma.notifikasi.create.mockResolvedValue(mockNotif);
      mockPrisma.deviceToken.findMany.mockResolvedValue([]);

      const result = await service.send('user-1', { judul: 'Test', isi: 'Body' });
      expect(result.success).toBe(true);
      expect(result.data).not.toBeNull();
      expect((result.data as any).id).toBe('notif-1');
      expect(mockPrisma.notifikasi.create).toHaveBeenCalledWith({
        data: { userId: 'user-1', judul: 'Test', isi: 'Body', tipe: 'umum', data: null },
      });
    });

    it('should skip notification when preference is disabled', async () => {
      mockPrisma.setting.findUnique.mockResolvedValue({
        key: 'notif_pref:user-1',
        value: { umum: false },
      });

      const result = await service.send('user-1', { judul: 'Test', isi: 'Body' });
      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
      expect(mockPrisma.notifikasi.create).not.toHaveBeenCalled();
    });

    it('should default tipe to umum', async () => {
      mockPrisma.setting.findUnique.mockResolvedValue(null);
      mockPrisma.notifikasi.create.mockResolvedValue({ id: 'n1' });
      mockPrisma.deviceToken.findMany.mockResolvedValue([]);

      await service.send('user-1', { judul: 'Hi', isi: 'Hello' });
      expect(mockPrisma.notifikasi.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ tipe: 'umum' }) }),
      );
    });
  });

  // ─── findAll ───
  describe('findAll', () => {
    it('should return paginated notifications with unread count', async () => {
      mockPrisma.notifikasi.findMany.mockResolvedValue([{ id: 'n1' }]);
      mockPrisma.notifikasi.count
        .mockResolvedValueOnce(5)  // total
        .mockResolvedValueOnce(2); // unread

      const result = await service.findAll('user-1', { page: '1', limit: '10' });
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(5);
      expect(result.meta.unreadCount).toBe(2);
      expect(result.meta.totalPages).toBe(1);
    });
  });

  // ─── markAsRead ───
  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      mockPrisma.notifikasi.update.mockResolvedValue({});
      const result = await service.markAsRead('notif-1');
      expect(result.success).toBe(true);
      expect(mockPrisma.notifikasi.update).toHaveBeenCalledWith({
        where: { id: 'notif-1' },
        data: { isRead: true },
      });
    });
  });

  // ─── markAllAsRead ───
  describe('markAllAsRead', () => {
    it('should mark all user notifications as read', async () => {
      mockPrisma.notifikasi.updateMany.mockResolvedValue({ count: 5 });
      const result = await service.markAllAsRead('user-1');
      expect(result.success).toBe(true);
      expect(mockPrisma.notifikasi.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isRead: false },
        data: { isRead: true },
      });
    });
  });

  // ─── findOne ───
  describe('findOne', () => {
    it('should return notification by id', async () => {
      mockPrisma.notifikasi.findUnique.mockResolvedValue({ id: 'notif-1', judul: 'Hi' });
      const result = await service.findOne('notif-1');
      expect(result.success).toBe(true);
      expect(result.data.id).toBe('notif-1');
    });

    it('should throw NotFoundException if not found', async () => {
      mockPrisma.notifikasi.findUnique.mockResolvedValue(null);
      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── delete ───
  describe('delete', () => {
    it('should delete notification', async () => {
      mockPrisma.notifikasi.delete.mockResolvedValue({});
      const result = await service.delete('notif-1');
      expect(result.success).toBe(true);
      expect(mockPrisma.notifikasi.delete).toHaveBeenCalledWith({ where: { id: 'notif-1' } });
    });
  });

  // ─── registerDeviceToken ───
  describe('registerDeviceToken', () => {
    it('should upsert device token and update user fcmToken', async () => {
      mockPrisma.deviceToken.upsert.mockResolvedValue({});
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.registerDeviceToken('user-1', 'token-abc', 'android');
      expect(result.success).toBe(true);
      expect(mockPrisma.deviceToken.upsert).toHaveBeenCalledWith({
        where: { token: 'token-abc' },
        update: { userId: 'user-1', isActive: true },
        create: { userId: 'user-1', token: 'token-abc', platform: 'android' },
      });
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { fcmToken: 'token-abc' },
      });
    });
  });

  // ─── unregisterDeviceToken ───
  describe('unregisterDeviceToken', () => {
    it('should deactivate device token', async () => {
      mockPrisma.deviceToken.update.mockResolvedValue({});
      const result = await service.unregisterDeviceToken('token-id-1');
      expect(result.success).toBe(true);
      expect(mockPrisma.deviceToken.update).toHaveBeenCalledWith({
        where: { id: 'token-id-1' },
        data: { isActive: false },
      });
    });
  });

  // ─── broadcast ───
  describe('broadcast', () => {
    it('should create notifications for all active users with enabled preferences', async () => {
      const users = [{ id: 'u1' }, { id: 'u2' }];
      mockPrisma.user.findMany.mockResolvedValue(users);
      mockPrisma.setting.findMany.mockResolvedValue([]); // no prefs = all enabled
      mockPrisma.notifikasi.create.mockImplementation(async (args: any) => ({ id: 'n1', userId: args.data.userId }));
      mockPrisma.notifikasi.groupBy.mockResolvedValue([
        { userId: 'u1', _count: 2 },
        { userId: 'u2', _count: 0 },
      ]);
      mockPrisma.deviceToken.findMany.mockResolvedValue([]);

      const result = await service.broadcast({ judul: 'Broadcast', isi: 'Hello all' });
      expect(result.success).toBe(true);
      expect(result.data.sentTo).toBe(2);
      expect(mockPrisma.notifikasi.create).toHaveBeenCalledTimes(2);
    });

    it('should skip users who disabled umum notifications', async () => {
      const users = [{ id: 'u1' }, { id: 'u2' }];
      mockPrisma.user.findMany.mockResolvedValue(users);
      mockPrisma.setting.findMany.mockResolvedValue([
        { key: 'notif_pref:u1', value: { umum: false } },
      ]);
      mockPrisma.notifikasi.create.mockImplementation(async (args: any) => ({ id: 'n1', userId: args.data.userId }));
      mockPrisma.notifikasi.groupBy.mockResolvedValue([
        { userId: 'u2', _count: 1 },
      ]);
      mockPrisma.deviceToken.findMany.mockResolvedValue([]);

      const result = await service.broadcast({ judul: 'Broadcast', isi: 'Hello all' });
      expect(result.success).toBe(true);
      expect(result.data.sentTo).toBe(1); // only u2 receives
      expect(mockPrisma.notifikasi.create).toHaveBeenCalledTimes(1);
    });
  });

  // ─── sendToRole ───
  describe('sendToRole', () => {
    it('should create notifications for users with specific role and enabled preferences', async () => {
      const users = [{ id: 'admin-1' }];
      mockPrisma.user.findMany.mockResolvedValue(users);
      mockPrisma.setting.findMany.mockResolvedValue([]);
      mockPrisma.notifikasi.create.mockResolvedValue({ id: 'n1' });
      mockPrisma.notifikasi.groupBy.mockResolvedValue([]);
      mockPrisma.deviceToken.findMany.mockResolvedValue([]);

      const result = await service.sendToRole({
        role: 'admin_distrik',
        judul: 'Admin Alert',
        isi: 'Check this',
      });
      expect(result.success).toBe(true);
      expect(result.data.sentTo).toBe(1);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: { role: 'admin_distrik', isActive: true },
      });
    });

    it('should skip users who disabled reminder_latihan notifications', async () => {
      const users = [{ id: 'u1' }, { id: 'u2' }];
      mockPrisma.user.findMany.mockResolvedValue(users);
      mockPrisma.setting.findMany.mockResolvedValue([
        { key: 'notif_pref:u1', value: { reminder_latihan: false } },
      ]);
      mockPrisma.notifikasi.create.mockResolvedValue({ id: 'n1' });
      mockPrisma.notifikasi.groupBy.mockResolvedValue([
        { userId: 'u2', _count: 1 },
      ]);
      mockPrisma.deviceToken.findMany.mockResolvedValue([]);

      const result = await service.sendToRole({
        role: 'anggota',
        judul: 'Reminder',
        isi: 'Latihan besok',
        tipe: 'reminder_latihan',
      });
      expect(result.success).toBe(true);
      expect(result.data.sentTo).toBe(1); // only u2 receives
      expect(result.data.total).toBe(2);
    });
  });
});
