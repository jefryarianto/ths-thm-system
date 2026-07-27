// @ts-nocheck
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GraduationsService } from './graduations.service';
import { MailService } from '../../mail/mail.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ScopeHelper } from '../../common/utils/scope-helpers';
import { CacheService } from '../../common/services/cache.service';
import { MemberMailService } from '../../common/services/member-mail.service';

describe('GraduationsService', () => {
  let service: GraduationsService;

  const mockPrisma = {
    kegiatan: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    calonAnggota: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    hasilPendadaran: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockScopeHelper = {
    buildScopeFilter: jest.fn().mockReturnValue({}),
    buildIndirectScopeFilter: jest.fn().mockReturnValue({}),
    hasAccessToResource: jest.fn().mockReturnValue(true),
    hasAccessToResourceAsync: jest.fn().mockResolvedValue(true),
    verifyKegiatanScope: jest.fn(),
  };

  const mockMailService = {
    sendMail: jest.fn().mockResolvedValue(true),
    renderWithOverride: jest.fn().mockResolvedValue({
      subject: 'Pendadaran - THS-THM',
      html: '<p>Graduation info</p>',
    }),
  };

  const mockMemberMailService = {
    sendToMember: jest.fn().mockResolvedValue(undefined),
    sendToMemberWithArgs: jest.fn().mockResolvedValue(undefined),
  };

  const mockCache = {
    getOrSet: jest.fn().mockImplementation((_key, factory) => factory()),
    invalidatePrefix: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GraduationsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ScopeHelper, useValue: mockScopeHelper },
        { provide: CacheService, useValue: mockCache },
        { provide: MailService, useValue: mockMailService },
        { provide: MemberMailService, useValue: mockMemberMailService },
      ],
    }).compile();

    service = module.get<GraduationsService>(GraduationsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated graduations', async () => {
      mockPrisma.kegiatan.findMany.mockResolvedValue([{ id: 'g1', tipe: 'pendadaran' }]);
      mockPrisma.kegiatan.count.mockResolvedValue(1);
      const result = await service.findAll({ page: 1, limit: 10 });
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should return a single graduation', async () => {
      mockPrisma.kegiatan.findUnique.mockResolvedValue({ id: 'g1', tipe: 'pendadaran' });
      const result = await service.findOne('g1');
      expect(result.id).toBe('g1');
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrisma.kegiatan.findUnique.mockResolvedValue(null);
      await expect(service.findOne('g1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a graduation', async () => {
      mockPrisma.kegiatan.create.mockResolvedValue({ id: 'g1', tipe: 'pendadaran' });
      const result = await service.create({
        nama: 'Pendadaran 1',
        lokasi: 'Jakarta',
        tanggalMulai: '2026-01-01',
      } as any);
    });
  });

  describe('getParticipants', () => {
    it('should return participants', async () => {
      mockPrisma.calonAnggota.findMany.mockResolvedValue([
        { id: 'c1', status: 'mengikuti_pendadaran' },
      ]);
      const result = await service.getParticipants('g1');
    });
  });

  describe('graduate', () => {
    it('should process graduation results and send email', async () => {
      mockPrisma.hasilPendadaran.create.mockResolvedValue({ id: 'h1' });
      mockPrisma.calonAnggota.update.mockResolvedValue({
        id: 'c1',
        email: 'candidate@test.com',
        namaLengkap: 'Budi',
      });
      const result = await service.graduate('g1', {
        results: [{ candidateId: 'c1', totalSkor: 85, ranking: 1, lulus: true }],
      } as any);
      expect(mockMailService.sendMail).toHaveBeenCalledTimes(1);
      expect(mockMailService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'candidate@test.com' }),
      );
    });
  });
});
