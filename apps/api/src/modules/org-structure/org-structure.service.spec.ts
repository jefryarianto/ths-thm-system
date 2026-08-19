// @ts-nocheck
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { OrgStructureService } from './org-structure.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('OrgStructureService', () => {
  let service: OrgStructureService;

  const mockPrisma = {
    distrik: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    wilayah: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    ranting: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrgStructureService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<OrgStructureService>(OrgStructureService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('deleteDistrik', () => {
    it('should delete distrik with cascade', async () => {
      mockPrisma.distrik.findUnique.mockResolvedValue({ id: 'd1', nama: 'Distrik A' });
      await service.deleteDistrik('d1');
      expect(mockPrisma.distrik.delete).toHaveBeenCalledWith({ where: { id: 'd1' } });
    });

    it('should throw NotFoundException when distrik does not exist', async () => {
      mockPrisma.distrik.findUnique.mockResolvedValue(null);
      await expect(service.deleteDistrik('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteWilayah', () => {
    it('should delete wilayah with cascade', async () => {
      mockPrisma.wilayah.findUnique.mockResolvedValue({ id: 'w1', nama: 'Wilayah A' });
      await service.deleteWilayah('w1');
      expect(mockPrisma.wilayah.delete).toHaveBeenCalledWith({ where: { id: 'w1' } });
    });

    it('should throw NotFoundException when wilayah does not exist', async () => {
      mockPrisma.wilayah.findUnique.mockResolvedValue(null);
      await expect(service.deleteWilayah('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteRanting', () => {
    it('should delete ranting with cascade', async () => {
      mockPrisma.ranting.findUnique.mockResolvedValue({ id: 'r1', nama: 'Ranting A' });
      await service.deleteRanting('r1');
      expect(mockPrisma.ranting.delete).toHaveBeenCalledWith({ where: { id: 'r1' } });
    });

    it('should throw NotFoundException when ranting does not exist', async () => {
      mockPrisma.ranting.findUnique.mockResolvedValue(null);
      await expect(service.deleteRanting('missing')).rejects.toThrow(NotFoundException);
    });
  });
});
