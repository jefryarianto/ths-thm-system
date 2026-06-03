import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { PrismaService } from '../../prisma/prisma.service';

jest.mock('qrcode', () => ({ toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,mockqr') }));
jest.mock('uuid', () => ({ v4: jest.fn().mockReturnValue('mock-uuid') }));
jest.mock('fs', () => ({
  mkdirSync: jest.fn(),
  createWriteStream: jest.fn(),
  existsSync: jest.fn(() => false),
}));

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<DocumentsService>(DocumentsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated documents', async () => {
      const mockDocs = [{ id: '1', tipe: 'kartu_anggota' }];
      mockPrisma.dokumen.findMany.mockResolvedValue(mockDocs);
      mockPrisma.dokumen.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 10 });
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockDocs);
      expect(result.meta.total).toBe(1);
    });

    it('should filter by tipe and anggotaId', async () => {
      mockPrisma.dokumen.findMany.mockResolvedValue([]);
      mockPrisma.dokumen.count.mockResolvedValue(0);

      await service.findAll({ tipe: 'kartu_anggota', anggotaId: 'ang-1' });
      expect(mockPrisma.dokumen.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tipe: 'kartu_anggota', anggotaId: 'ang-1' },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a document with QR validation', async () => {
      const mockDoc = { id: '1', tipe: 'kartu_anggota', qrValidation: {} };
      mockPrisma.dokumen.findUnique.mockResolvedValue(mockDoc);

      const result = await service.findOne('1');
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockDoc);
    });

    it('should throw NotFoundException', async () => {
      mockPrisma.dokumen.findUnique.mockResolvedValue(null);
      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getTypes', () => {
    it('should return document types', async () => {
      const result = await service.getTypes();
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(4);
      expect(result.data[0].type).toBe('kartu_anggota');
    });
  });

  describe('remove', () => {
    it('should revoke a document', async () => {
      mockPrisma.dokumen.update.mockResolvedValue({});

      const result = await service.remove('1');
      expect(result.success).toBe(true);
      expect(mockPrisma.dokumen.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { status: 'revoked' },
      });
    });
  });

  describe('verifyQR', () => {
    it('should return valid for authenticated QR', async () => {
      mockPrisma.qRValidation.findUnique.mockResolvedValue({
        id: 'qr1',
        dokumenId: 'doc1',
        isValid: true,
        scanCount: 0,
        dokumen: {
          tipe: 'kartu_anggota',
          nomorDokumen: 'DOC-2026-ABC123',
          anggota: { nomorAnggota: 'ANG-001', namaLengkap: 'Budi' },
        },
      });
      mockPrisma.qRValidation.update.mockResolvedValue({});

      const result = await service.verifyQR('doc1');
      expect(result.success).toBe(true);
      expect(result.data!.valid).toBe(true);
      expect(result.data!.firstScanned).toBe(true);
    });

    it('should return invalid for non-existent QR', async () => {
      mockPrisma.qRValidation.findUnique.mockResolvedValue(null);

      const result = await service.verifyQR('bad');
      expect(result.success).toBe(false);
      expect(result.message).toBe('QR code tidak valid');
    });

    it('should return invalid for revoked document', async () => {
      mockPrisma.qRValidation.findUnique.mockResolvedValue({
        id: 'qr1',
        dokumenId: 'doc1',
        isValid: false,
        scanCount: 5,
        dokumen: {
          tipe: 'kartu_anggota',
          nomorDokumen: 'DOC-2026-ABC123',
          anggota: {},
        },
      });

      const result = await service.verifyQR('doc1');
      expect(result.success).toBe(false);
      expect(result.message).toBe('Dokumen sudah tidak berlaku');
    });
  });

  describe('verifyByToken', () => {
    it('should return valid for a valid token', async () => {
      mockPrisma.qRValidation.findUnique.mockResolvedValue({
        id: 'qr1',
        dokumenId: 'doc1',
        isValid: true,
        scanCount: 3,
        dokumen: {
          tipe: 'sertifikat_pendadaran',
          nomorDokumen: 'DOC-2026-XYZ',
          anggota: { nomorAnggota: 'ANG-002', namaLengkap: 'Siti' },
        },
      });
      mockPrisma.qRValidation.update.mockResolvedValue({});

      const result = await service.verifyByToken('valid-token');
      expect(result.success).toBe(true);
      expect(result.data!.valid).toBe(true);
      expect(result.data!.firstScanned).toBe(false);
    });

    it('should return invalid for non-existent token', async () => {
      mockPrisma.qRValidation.findUnique.mockResolvedValue(null);
      const result = await service.verifyByToken('bad-token');
      expect(result.success).toBe(false);
    });

    it('should return invalid for revoked document token', async () => {
      mockPrisma.qRValidation.findUnique.mockResolvedValue({
        id: 'qr1',
        dokumenId: 'doc1',
        isValid: false,
        scanCount: 1,
        dokumen: {
          tipe: 'kartu_anggota',
          nomorDokumen: 'DOC-2026-REV',
          anggota: {},
        },
      });

      const result = await service.verifyByToken('revoked-token');
      expect(result.success).toBe(false);
      expect(result.message).toBe('Dokumen sudah tidak berlaku');
    });
  });

  describe('batchGenerate', () => {
    it('should generate multiple documents', async () => {
      mockPrisma.dokumen.create.mockResolvedValue({ id: 'doc1', tipe: 'kartu_anggota' });
      mockPrisma.qRValidation.create.mockResolvedValue({});

      const result = await service.batchGenerate({
        memberIds: ['m1', 'm2'],
        type: 'kartu_anggota',
      });
      expect(result.success).toBe(true);
      expect(result.data.generated).toBe(2);
    });

    it('should handle empty memberIds', async () => {
      const result = await service.batchGenerate({ memberIds: [], type: 'kartu_anggota' });
      expect(result.data.generated).toBe(0);
    });
  });
});