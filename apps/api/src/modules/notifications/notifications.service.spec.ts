import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EventsGateway } from './events.gateway';

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventsGateway, useValue: mockGateway },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
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
      mockPrisma.notifikasi.update.mockResolvedValue({});
      const result = await service.markAsRead('n1');
      expect(result.success).toBe(true);
      expect(mockPrisma.notifikasi.update).toHaveBeenCalledWith({
        where: { id: 'n1' },
        data: { isRead: true },
      });
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
      mockPrisma.notifikasi.findUnique.mockResolvedValue({ id: 'n1', judul: 'Test' });
      const result = await service.findOne('n1');
      expect(result.success).toBe(true);
    });

    it('should throw NotFoundException', async () => {
      mockPrisma.notifikasi.findUnique.mockResolvedValue(null);
      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete a notification', async () => {
      mockPrisma.notifikasi.delete.mockResolvedValue({});
      const result = await service.delete('n1');
      expect(result.success).toBe(true);
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
