// @ts-nocheck
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { OrgDocumentsService } from './org-documents.service';
import { MailService } from '../../mail/mail.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('OrgDocumentsService', () => {
  let service: OrgDocumentsService;

  const mockPrisma = {
    dokumenOrganisasi: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    kategoriDokumen: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
  };

  const mockMailService = {
    sendMail: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrgDocumentsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MailService, useValue: mockMailService },
      ],
    }).compile();

    service = module.get<OrgDocumentsService>(OrgDocumentsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated org documents', async () => {
      const mockDocs = [{ id: '1', judul: 'AD/ART' }];
      mockPrisma.dokumenOrganisasi.findMany.mockResolvedValue(mockDocs);
      mockPrisma.dokumenOrganisasi.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 10 });
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockDocs);
      expect(result.meta.total).toBe(1);
    });

    it('should filter by kategoriId and search', async () => {
      mockPrisma.dokumenOrganisasi.findMany.mockResolvedValue([]);
      mockPrisma.dokumenOrganisasi.count.mockResolvedValue(0);

      await service.findAll({ kategoriId: 'cat1', search: 'AD/ART' });
      expect(mockPrisma.dokumenOrganisasi.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { kategoriId: 'cat1', judul: { contains: 'AD/ART' } },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a single document', async () => {
      const mockDoc = { id: '1', judul: 'AD/ART', kategori: {} };
      mockPrisma.dokumenOrganisasi.findUnique.mockResolvedValue(mockDoc);

      const result = await service.findOne('1');
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockDoc);
    });

    it('should throw NotFoundException', async () => {
      mockPrisma.dokumenOrganisasi.findUnique.mockResolvedValue(null);
      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a document and notify admins', async () => {
      const dto = { judul: 'AD/ART', kategoriId: 'cat1' };
      mockPrisma.dokumenOrganisasi.create.mockResolvedValue({ id: '1', ...dto });
      mockPrisma.user.findMany.mockResolvedValue([{ email: 'admin@test.com', namaLengkap: 'Admin' }]);

      const result = await service.create(dto);
      expect(result.success).toBe(true);
      expect(result.data.judul).toBe('AD/ART');
      expect(mockMailService.sendMail).toHaveBeenCalledTimes(1);
      expect(mockMailService.sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: 'admin@test.com' }));
    });
  });

  describe('update', () => {
    it('should update a document', async () => {
      const dto = { judul: 'Updated' };
      mockPrisma.dokumenOrganisasi.update.mockResolvedValue({ id: '1', ...dto });

      const result = await service.update('1', dto);
      expect(result.success).toBe(true);
      expect(result.data.judul).toBe('Updated');
    });
  });

  describe('remove', () => {
    it('should hard-delete a document', async () => {
      mockPrisma.dokumenOrganisasi.delete.mockResolvedValue({});

      const result = await service.remove('1');
      expect(result.success).toBe(true);
      expect(mockPrisma.dokumenOrganisasi.delete).toHaveBeenCalledWith({ where: { id: '1' } });
    });
  });

  describe('getCategories', () => {
    it('should return categories with document counts', async () => {
      const mockCats = [{ id: '1', nama: 'Umum', _count: { dokumen: 5 } }];
      mockPrisma.kategoriDokumen.findMany.mockResolvedValue(mockCats);

      const result = await service.getCategories();
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCats);
    });
  });

  describe('createCategory', () => {
    it('should create a category', async () => {
      const dto = { nama: 'Umum' };
      mockPrisma.kategoriDokumen.create.mockResolvedValue({ id: '1', ...dto });

      const result = await service.createCategory(dto);
      expect(result.success).toBe(true);
      expect(result.data.nama).toBe('Umum');
    });
  });

  describe('getCategory', () => {
    it('should return a single category', async () => {
      mockPrisma.kategoriDokumen.findUnique.mockResolvedValue({ id: '1', nama: 'Umum' });

      const result = await service.getCategory('1');
      expect(result.success).toBe(true);
    });

    it('should throw NotFoundException', async () => {
      mockPrisma.kategoriDokumen.findUnique.mockResolvedValue(null);
      await expect(service.getCategory('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateCategory', () => {
    it('should update a category', async () => {
      const dto = { nama: 'Updated' };
      mockPrisma.kategoriDokumen.update.mockResolvedValue({ id: '1', ...dto });

      const result = await service.updateCategory('1', dto);
      expect(result.success).toBe(true);
    });
  });

  describe('deleteCategory', () => {
    it('should delete a category', async () => {
      mockPrisma.kategoriDokumen.delete.mockResolvedValue({});

      const result = await service.deleteCategory('1');
      expect(result.success).toBe(true);
    });
  });
});