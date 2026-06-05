import { Test, TestingModule } from '@nestjs/testing';
import { CacheManagementController } from './cache-management.controller';
import { CacheService } from '../services/cache.service';

describe('CacheManagementController', () => {
  let controller: CacheManagementController;

  const mockCache = {
    getStats: jest.fn().mockReturnValue({ size: 5, keys: ['members:list:1:10', 'reports:dashboard:all'] }),
    invalidatePrefix: jest.fn(),
    clear: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CacheManagementController],
      providers: [
        { provide: CacheService, useValue: mockCache },
      ],
    }).compile();

    controller = module.get<CacheManagementController>(CacheManagementController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getStats', () => {
    it('should return cache stats', () => {
      const result = controller.getStats();
      expect(result).toEqual({ size: 5, keys: ['members:list:1:10', 'reports:dashboard:all'] });
      expect(mockCache.getStats).toHaveBeenCalled();
    });
  });

  describe('invalidate', () => {
    it('should invalidate cache by prefix', () => {
      const result = controller.invalidate({ prefix: 'members:' });
      expect(result.success).toBe(true);
      expect(result.message).toContain('members:');
      expect(mockCache.invalidatePrefix).toHaveBeenCalledWith('members:');
    });

    it('should clear all cache when no prefix provided', () => {
      const result = controller.invalidate({});
      expect(result.success).toBe(true);
      expect(result.message).toContain('All cache');
      expect(mockCache.clear).toHaveBeenCalled();
    });

    it('should clear all cache when prefix is empty string', () => {
      const result = controller.invalidate({ prefix: '' });
      expect(result.success).toBe(true);
      expect(mockCache.clear).toHaveBeenCalled();
    });
  });
});
