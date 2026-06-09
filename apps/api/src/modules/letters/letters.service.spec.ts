// @ts-nocheck
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { LettersService } from './letters.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../mail/mail.service';

describe('LettersService', () => {
  let service: LettersService;

  const mockMailService = {
    sendMail: jest.fn().mockResolvedValue(true),
  };

  const mockPrisma = {
    suratMasuk: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    suratKeluar: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    disposisi: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LettersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MailService, useValue: mockMailService },
      ],
    }).compile();

    service = module.get<LettersService>(LettersService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAllCombined', () => {
    it('should return combined masuk and keluar letters', async () => {
      const now = new Date();
      const later = new Date(now.getTime() + 1000);
      mockPrisma.suratMasuk.findMany.mockResolvedValue([
        { id: 'sm1', createdAt: now },
      ]);
      mockPrisma.suratKeluar.findMany.mockResolvedValue([
        { id: 'sk1', createdAt: later },
      ]);
      mockPrisma.suratMasuk.count.mockResolvedValue(1);
      mockPrisma.suratKeluar.count.mockResolvedValue(1);

      const result = await service.findAllCombined({ page: '1', limit: '10' });
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].type).toBe('keluar');
      expect(result.data[1].type).toBe('masuk');
      expect(result.meta.total).toBe(2);
    });
  });

  describe('incomingFindAll', () => {
    it('should return paginated incoming letters', async () => {
      mockPrisma.suratMasuk.findMany.mockResolvedValue([{ id: 'sm1' }]);
      mockPrisma.suratMasuk.count.mockResolvedValue(1);

      const result = await service.incomingFindAll({ page: '1', limit: '10' });
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('incomingFindOne', () => {
    it('should return a single incoming letter', async () => {
      mockPrisma.suratMasuk.findUnique.mockResolvedValue({ id: 'sm1' });
      const result = await service.incomingFindOne('sm1');
      expect(result.success).toBe(true);
      expect(result.data.id).toBe('sm1');
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrisma.suratMasuk.findUnique.mockResolvedValue(null);
      await expect(service.incomingFindOne('sm1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('incomingCreate', () => {
    it('should create an incoming letter with diterima status', async () => {
      mockPrisma.suratMasuk.create.mockResolvedValue({ id: 'sm1', status: 'diterima' });
      const result = await service.incomingCreate({ nomorSurat: '001' });
      expect(result.success).toBe(true);
      expect(result.data.status).toBe('diterima');
    });
  });

  describe('incomingUpdate', () => {
    it('should update an incoming letter', async () => {
      mockPrisma.suratMasuk.update.mockResolvedValue({ id: 'sm1', nomorSurat: '002' });
      const result = await service.incomingUpdate('sm1', { nomorSurat: '002' });
      expect(result.success).toBe(true);
      expect(result.data.nomorSurat).toBe('002');
    });
  });

  describe('incomingRemove', () => {
    it('should delete an incoming letter', async () => {
      await service.incomingRemove('sm1');
      expect(mockPrisma.suratMasuk.delete).toHaveBeenCalledWith({ where: { id: 'sm1' } });
    });
  });

  describe('createDisposition', () => {
    it('should create a disposition', async () => {
      mockPrisma.disposisi.create.mockResolvedValue({ id: 'd1', suratMasukId: 'sm1' });
      const result = await service.createDisposition('sm1', {
        dariUserId: 'u1',
        kepadaUserId: 'u2',
        isi: 'Tindak lanjuti',
      });
      expect(result.success).toBe(true);
      expect(result.data.suratMasukId).toBe('sm1');
    });
  });

  describe('outgoingFindAll', () => {
    it('should return paginated outgoing letters', async () => {
      mockPrisma.suratKeluar.findMany.mockResolvedValue([{ id: 'sk1' }]);
      mockPrisma.suratKeluar.count.mockResolvedValue(1);

      const result = await service.outgoingFindAll({ page: '1', limit: '10' });
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('outgoingFindOne', () => {
    it('should return a single outgoing letter', async () => {
      mockPrisma.suratKeluar.findUnique.mockResolvedValue({ id: 'sk1' });
      const result = await service.outgoingFindOne('sk1');
      expect(result.success).toBe(true);
      expect(result.data.id).toBe('sk1');
    });
  });

  describe('outgoingCreate', () => {
    it('should create an outgoing letter with draft status', async () => {
      mockPrisma.suratKeluar.create.mockResolvedValue({ id: 'sk1', status: 'draft' });
      const result = await service.outgoingCreate({ nomorSurat: '001' });
      expect(result.success).toBe(true);
      expect(result.data.status).toBe('draft');
    });
  });

  describe('outgoingUpdate', () => {
    it('should update an outgoing letter', async () => {
      mockPrisma.suratKeluar.update.mockResolvedValue({ id: 'sk1', nomorSurat: '002' });
      const result = await service.outgoingUpdate('sk1', { nomorSurat: '002' });
      expect(result.success).toBe(true);
      expect(result.data.nomorSurat).toBe('002');
    });
  });

  describe('outgoingRemove', () => {
    it('should delete an outgoing letter', async () => {
      await service.outgoingRemove('sk1');
      expect(mockPrisma.suratKeluar.delete).toHaveBeenCalledWith({ where: { id: 'sk1' } });
    });
  });

  describe('outgoingSend', () => {
    it('should set outgoing letter status to terkirim', async () => {
      mockPrisma.suratKeluar.update.mockResolvedValue({ id: 'sk1', status: 'terkirim' });
      const result = await service.outgoingSend('sk1');
      expect(result.success).toBe(true);
      expect(result.data.status).toBe('terkirim');
    });
  });

  describe('incomingExport', () => {
    it('should export all incoming letters', async () => {
      mockPrisma.suratMasuk.findMany.mockResolvedValue([{ id: 'sm1' }]);
      const result = await service.incomingExport();
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('outgoingExport', () => {
    it('should export all outgoing letters', async () => {
      mockPrisma.suratKeluar.findMany.mockResolvedValue([{ id: 'sk1' }]);
      const result = await service.outgoingExport();
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });
  });
});