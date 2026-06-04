// @ts-nocheck
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AssessmentsService } from './assessments.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('AssessmentsService', () => {
  let service: AssessmentsService;

  const mockPrisma = {
    aspekPenilaian: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    itemPenilaian: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    nilaiPendadaran: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssessmentsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AssessmentsService>(AssessmentsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAspects', () => {
    it('should return all aspects with items', async () => {
      const mockData = [{ id: '1', nama: 'Teknik', itemPenilaian: [] }];
      mockPrisma.aspekPenilaian.findMany.mockResolvedValue(mockData);

      const result = await service.getAspects({});
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
    });
  });

  describe('getAspect', () => {
    it('should return a single aspect', async () => {
      const mockAspect = { id: '1', nama: 'Teknik', itemPenilaian: [] };
      mockPrisma.aspekPenilaian.findUnique.mockResolvedValue(mockAspect);

      const result = await service.getAspect('1');
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockAspect);
    });

    it('should throw NotFoundException when aspect not found', async () => {
      mockPrisma.aspekPenilaian.findUnique.mockResolvedValue(null);

      await expect(service.getAspect('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createAspect', () => {
    it('should create an aspect', async () => {
      const dto = { nama: 'Teknik' };
      const mockCreated = { id: '1', ...dto };
      mockPrisma.aspekPenilaian.create.mockResolvedValue(mockCreated);

      const result = await service.createAspect(dto);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCreated);
      expect(result.message).toBe('Aspek penilaian berhasil dibuat');
    });
  });

  describe('updateAspect', () => {
    it('should update an aspect', async () => {
      const dto = { nama: 'Teknik Updated' };
      const mockUpdated = { id: '1', ...dto };
      mockPrisma.aspekPenilaian.update.mockResolvedValue(mockUpdated);

      const result = await service.updateAspect('1', dto);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUpdated);
    });
  });

  describe('deleteAspect', () => {
    it('should soft-delete an aspect', async () => {
      mockPrisma.aspekPenilaian.update.mockResolvedValue({});

      const result = await service.deleteAspect('1');
      expect(result.success).toBe(true);
      expect(result.message).toBe('Aspek penilaian dinonaktifkan');
      expect(mockPrisma.aspekPenilaian.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { isActive: false },
      });
    });
  });

  describe('getItems', () => {
    it('should return all items without filter', async () => {
      const mockData = [{ id: '1', nama: 'Sikap', aspek: {} }];
      mockPrisma.itemPenilaian.findMany.mockResolvedValue(mockData);

      const result = await service.getItems({});
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
    });

    it('should filter items by aspekId', async () => {
      mockPrisma.itemPenilaian.findMany.mockResolvedValue([]);

      await service.getItems({ aspekId: 'asp-1' });
      expect(mockPrisma.itemPenilaian.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { aspekId: 'asp-1' } }),
      );
    });
  });

  describe('getItem', () => {
    it('should return a single item', async () => {
      const mockItem = { id: '1', nama: 'Sikap', aspek: {} };
      mockPrisma.itemPenilaian.findUnique.mockResolvedValue(mockItem);

      const result = await service.getItem('1');
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockItem);
    });

    it('should throw NotFoundException when item not found', async () => {
      mockPrisma.itemPenilaian.findUnique.mockResolvedValue(null);

      await expect(service.getItem('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createItem', () => {
    it('should create an item', async () => {
      const dto = { namaItem: 'Sikap', aspekId: 'asp-1' };
      mockPrisma.itemPenilaian.create.mockResolvedValue({ id: '1', ...dto } as any);

      const result = await service.createItem(dto);
      expect(result.success).toBe(true);
      expect(result.data.namaItem).toBe('Sikap');
    });
  });

  describe('updateItem', () => {
    it('should update an item', async () => {
      const dto = { namaItem: 'Sikap Updated' };
      mockPrisma.itemPenilaian.update.mockResolvedValue({ id: '1', ...dto } as any);

      const result = await service.updateItem('1', dto);
      expect(result.success).toBe(true);
      expect((result.data as any).namaItem).toBe('Sikap Updated');
    });
  });

  describe('deleteItem', () => {
    it('should soft-delete an item', async () => {
      mockPrisma.itemPenilaian.update.mockResolvedValue({});

      const result = await service.deleteItem('1');
      expect(result.success).toBe(true);
      expect(mockPrisma.itemPenilaian.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { isActive: false },
      });
    });
  });

  describe('getScores', () => {
    it('should return paginated scores', async () => {
      const mockScores = [{ id: '1', skor: 85 }];
      mockPrisma.nilaiPendadaran.findMany.mockResolvedValue(mockScores);
      mockPrisma.nilaiPendadaran.count.mockResolvedValue(1);

      const result = await service.getScores({ page: 1, limit: 20 });
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockScores);
      expect(result.meta.total).toBe(1);
    });

    it('should filter by kegiatanId and calonAnggotaId', async () => {
      mockPrisma.nilaiPendadaran.findMany.mockResolvedValue([]);
      mockPrisma.nilaiPendadaran.count.mockResolvedValue(0);

      await service.getScores({ kegiatanId: 'k1', calonAnggotaId: 'c1' });
      expect(mockPrisma.nilaiPendadaran.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { kegiatanId: 'k1', calonAnggotaId: 'c1' },
        }),
      );
    });
  });

  describe('createScore', () => {
    it('should create a score', async () => {
      const dto = { kegiatanId: 'k1', skor: 90 };
      mockPrisma.nilaiPendadaran.create.mockResolvedValue({ id: '1', ...dto });

      const result = await service.createScore(dto);
      expect(result.success).toBe(true);
      expect(result.data.skor).toBe(90);
    });
  });

  describe('importScores', () => {
    it('should import scores and return count', async () => {
      mockPrisma.nilaiPendadaran.create.mockResolvedValue({});

      const data = [
        { kegiatan_id: 'k1', calon_anggota_id: 'c1', item_penilaian_id: 'i1', penguji_user_id: 'u1', skor: '85' },
        { kegiatan_id: 'k1', calon_anggota_id: 'c2', item_penilaian_id: 'i1', penguji_user_id: 'u1', skor: '90' },
      ];
      const result = await service.importScores(data);
      expect(result.success).toBe(true);
      expect(result.data.imported).toBe(2);
      expect(result.data.total).toBe(2);
    });

    it('should skip rows that fail to create', async () => {
      mockPrisma.nilaiPendadaran.create
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('DB error'));

      const data = [
        { kegiatan_id: 'k1', calon_anggota_id: 'c1', item_penilaian_id: 'i1', penguji_user_id: 'u1', skor: '85' },
        { kegiatan_id: 'k1', calon_anggota_id: 'c2', item_penilaian_id: 'i1', penguji_user_id: 'u1', skor: '90' },
      ];
      const result = await service.importScores(data);
      expect(result.data.imported).toBe(1);
    });
  });
});