import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from './services/cache.service';
import { AuditLogStore } from './services/audit-log-store.service';
import { ApiKeyStore } from './guards/api-key.guard';

describe('HealthController', () => {
  let controller: HealthController;

  const mockPrisma = {
    $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
  };

  const mockCache = {
    getStats: jest.fn().mockReturnValue({ size: 3, keys: ['members:list:1:10', 'reports:dashboard:all', 'dues:list:1:10'] }),
  };

  const mockAuditLogStore = {
    getStats: jest.fn().mockReturnValue({
      total: 150,
      byEventType: { SCOPE_VIOLATION: 5, DATA_MUTATION: 100 },
      byRole: { superadmin: 30, anggota: 70 },
      recentViolations: 2,
    }),
  };

  const mockApiKeyStore = {
    getAll: jest.fn().mockReturnValue([
      { keyPreview: 'abcd1234...efgh', role: 'admin_distrik', description: 'Integration test' },
    ]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CacheService, useValue: mockCache },
        { provide: AuditLogStore, useValue: mockAuditLogStore },
        { provide: ApiKeyStore, useValue: mockApiKeyStore },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('check', () => {
    it('should return ok status with all subsystem info', async () => {
      const result = await controller.check();

      expect(result.success).toBe(true);
      expect(result.data.status).toBe('ok');
      expect(result.data.database).toBe('connected');
      expect(result.data).toHaveProperty('timestamp');
      expect(result.data).toHaveProperty('uptime');
      expect(result.data).toHaveProperty('version');
      expect(result.data).toHaveProperty('environment');
    });

    it('should include cache stats', async () => {
      const result = await controller.check();
      expect(result.data.cache).toEqual({ entries: 3, maxEntries: 1000 });
    });

    it('should include audit log stats', async () => {
      const result = await controller.check();
      expect(result.data.auditLog).toEqual({ totalEntries: 150, recentViolations: 2 });
    });

    it('should include active API keys count', async () => {
      const result = await controller.check();
      expect(result.data.apiKeys).toEqual({ active: 1 });
    });

    it('should include memory usage', async () => {
      const result = await controller.check();
      expect(result.data.memory).toHaveProperty('heapUsed');
      expect(result.data.memory).toHaveProperty('heapTotal');
    });

    it('should return disconnected when DB fails', async () => {
      mockPrisma.$queryRaw.mockRejectedValueOnce(new Error('Connection refused'));
      const result = await controller.check();
      expect(result.data.database).toBe('disconnected');
    });
  });
});
