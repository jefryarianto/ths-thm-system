// @ts-nocheck
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { MailService } from '../../mail/mail.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ScopeHelper } from '../../common/utils/scope-helpers';
import { CacheService } from '../../common/services/cache.service';

describe('DocumentsService', () => {
  let service: DocumentsService;

  const mockPrisma = {
    dokumen: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    qRValidation: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    anggota: {
      findUnique: jest.fn(),
    },
  };

  const mockScopeHelper = {
    buildScopeFilter: jest.fn().mockReturnValue({}),
    buildIndirectScopeFilter: jest.fn().mockReturnValue({}),
    hasAccessToResource: jest.fn().mockReturnValue(true),
    hasAccessToResourceAsync: jest.fn().mockResolvedValue(true),
    verifyKegiatanScope: jest.fn(),
  };

  const mockCache = {
    getOrSet: jest.fn().mockImplementation((_key: string, factory: () => Promise<unknown>) => factory()),
    invalidatePrefix: jest.fn(),
  };

  const mockMailService = {
    sendMail: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ScopeHelper, useValue: mockScopeHelper },
        { provide: CacheService, useValue: mockCache },
        { provide: MailService, useValue: mockMailService },
      ],
    }).compile();

    service = module.get<DocumentsService>(DocumentsService);
    jest.clearAllMocks();
    mockScopeHelper.buildIndirectScopeFilter.mockReturnValue({});
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated documents', async () => {
      mockPrisma.dokumen.findMany.mockResolvedValue([{ id: 'd1', tipe: 'kartu_anggota' }]);
      mockPrisma.dokumen.count.mockResolvedValue(1);
      const result = await service.findAll({ page: 1, limit: 10 });
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should return a single document', async () => {
      mockPrisma.dokumen.findUnique.mockResolvedValue({ id: 'd1', tipe: 'kartu_anggota' });
      const result = await service.findOne('d1');
      expect(result.success).toBe(true);
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrisma.dokumen.findUnique.mockResolvedValue(null);
      await expect(service.findOne('d1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should revoke a document', async () => {
      await service.remove('d1');
      expect(mockPrisma.dokumen.update).toHaveBeenCalled();
    });
  });

  describe('getTypes', () => {
    it('should return document types', async () => {
      const result = await service.getTypes();
      expect(result.success).toBe(true);
      expect(result.data.length).toBeGreaterThan(0);
    });
  });

  describe('generate', () => {
    it('should generate document and send notification email', async () => {
      mockPrisma.dokumen.create.mockResolvedValue({ id: 'd1', nomorDokumen: 'DOC-2026-ABCD1234' });
      mockPrisma.qRValidation.create.mockResolvedValue({});
      mockPrisma.anggota.findUnique.mockResolvedValue({ email: 'anggota@test.com', namaLengkap: 'Budi' });

      const result = await service.generate({ memberId: 'm1', type: 'kartu_anggota' });
      expect(result.success).toBe(true);
      expect(mockMailService.sendMail).toHaveBeenCalledTimes(1);
      expect(mockMailService.sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: 'anggota@test.com' }));
    });
  });
});
