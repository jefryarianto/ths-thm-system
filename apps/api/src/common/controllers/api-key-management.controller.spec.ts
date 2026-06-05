import { Test, TestingModule } from '@nestjs/testing';
import { ApiKeyManagementController } from './api-key-management.controller';
import { ApiKeyStore } from '../guards/api-key.guard';
import { AuditService } from '../services/audit.service';

describe('ApiKeyManagementController', () => {
  let controller: ApiKeyManagementController;
  let store: ApiKeyStore;

  const mockAuditService = { logDataMutation: jest.fn() };

  beforeEach(async () => {
    store = new ApiKeyStore();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApiKeyManagementController],
      providers: [
        { provide: ApiKeyStore, useValue: store },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    controller = module.get<ApiKeyManagementController>(ApiKeyManagementController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return empty list when no keys registered', () => {
      const result = controller.findAll();
      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should return list of registered keys with previews', () => {
      store.register({ key: 'test-key-12345678abcdefgh', role: 'admin_ranting', description: 'Test' });
      const result = controller.findAll();
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].keyPreview).toContain('...');
      expect(result.data[0].role).toBe('admin_ranting');
    });
  });

  describe('create', () => {
    it('should create a new API key with generated key', () => {
      const result = controller.create({
        description: 'Mobile app',
        role: 'admin_ranting',
      });

      expect(result.success).toBe(true);
      expect(result.data.key).toBeDefined();
      expect(result.data.key.length).toBe(64); // 32 bytes = 64 hex chars
      expect(result.data.role).toBe('admin_ranting');
    });

    it('should create key with scope', () => {
      const result = controller.create({
        description: 'Branch app',
        role: 'admin_ranting',
        scope: { rantingId: 'ranting-123' },
      });

      expect(result.data.scope).toEqual({ rantingId: 'ranting-123' });
    });

    it('should log the key creation via AuditService', () => {
      controller.create({ description: 'Test', role: 'anggota' });
      expect(mockAuditService.logDataMutation).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({ action: 'api_key_create' }),
        }),
      );
    });

    it('should make the key usable via store', () => {
      const result = controller.create({ description: 'Integration', role: 'admin_wilayah' });
      const validated = store.validate(result.data.key);
      expect(validated).toBeDefined();
      expect(validated?.role).toBe('admin_wilayah');
    });
  });

  describe('revoke', () => {
    it('should revoke an existing key', () => {
      store.register({ key: 'key-to-revoke', role: 'anggota' });
      const result = controller.revoke({ key: 'key-to-revoke' });
      expect(result.success).toBe(true);
      expect(store.validate('key-to-revoke')).toBeUndefined();
    });

    it('should log the revocation via AuditService', () => {
      store.register({ key: 'key-to-revoke', role: 'anggota' });
      controller.revoke({ key: 'key-to-revoke' });
      expect(mockAuditService.logDataMutation).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({ action: 'api_key_revoke' }),
        }),
      );
    });

    it('should return failure for non-existent key', () => {
      const result = controller.revoke({ key: 'non-existent' });
      expect(result.success).toBe(false);
      expect(result.message).toContain('tidak ditemukan');
    });

    it('should not log when key not found', () => {
      controller.revoke({ key: 'non-existent' });
      expect(mockAuditService.logDataMutation).not.toHaveBeenCalled();
    });
  });
});
