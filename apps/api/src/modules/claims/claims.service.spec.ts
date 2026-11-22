// @ts-nocheck
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ClaimsService } from './claims.service';
import { MailService } from '../../mail/mail.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ScopeHelper } from '../../common/utils/scope-helpers';
import { MemberMailService } from '../../common/services/member-mail.service';

describe('ClaimsService', () => {
  let service: ClaimsService;

  const mockPrisma = {
    klaim: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    buktiKeanggotaan: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    dokumenPendukung: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    anggota: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    ktaApplication: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    ktaAppHistory: {
      create: jest.fn(),
    },
    klaimApprovalHistory: {
      create: jest.fn(),
    },
    ranting: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  mockPrisma.$transaction.mockImplementation(async (callback: (tx: typeof mockPrisma) => unknown) => callback(mockPrisma));

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
      subject: 'Klaim - THS-THM',
      html: '<p>Claim status info</p>',
    }),
  };

  const mockMemberMailService = {
    sendToMember: jest.fn().mockResolvedValue(undefined),
    sendToMemberWithArgs: jest.fn().mockResolvedValue(undefined),
  };

  const mockNraService = {
    generateMemberNumber: jest.fn().mockResolvedValue('NRA-001'),
  };

  const mockCache = {
    getOrSet: jest.fn().mockImplementation((_key, factory) => factory()),
    invalidatePrefix: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClaimsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ScopeHelper, useValue: mockScopeHelper },
        { provide: MailService, useValue: mockMailService },
        { provide: MemberMailService, useValue: mockMemberMailService },
        {
          provide: require('../../common/services/nra.service').NraService,
          useValue: mockNraService,
        },
        {
          provide: require('../../common/services/cache.service').CacheService,
          useValue: mockCache,
        },
        {
          provide: require('../members/kta-application.service').KtaApplicationService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<ClaimsService>(ClaimsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated claims', async () => {
      mockPrisma.klaim.findMany.mockResolvedValue([{ id: 'cl1', status: 'pending' }]);
      mockPrisma.klaim.count.mockResolvedValue(1);
      const result = await service.findAll({ page: 1, limit: 10 });
      expect(result.data).toHaveLength(1);
    });

    it('should apply scope filter', async () => {
      mockPrisma.klaim.findMany.mockResolvedValue([]);
      mockPrisma.klaim.count.mockResolvedValue(0);
      mockScopeHelper.buildIndirectScopeFilter.mockReturnValue({ anggota: { rantingId: 'r1' } });
      await service.findAll({ page: 1, limit: 10 }, { rantingId: 'r1' });
      expect(mockScopeHelper.buildIndirectScopeFilter).toHaveBeenCalledWith(
        { rantingId: 'r1' },
        'anggota',
      );
    });
  });

  describe('findOne', () => {
    it('should return a single claim', async () => {
      mockPrisma.klaim.findUnique.mockResolvedValue({ id: 'cl1', status: 'pending' });
      const result = await service.findOne('cl1');
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrisma.klaim.findUnique.mockResolvedValue(null);
      await expect(service.findOne('cl1')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for out-of-scope resource', async () => {
      mockPrisma.klaim.findUnique.mockResolvedValue({
        id: 'cl1',
        anggota: { rantingId: 'r-other' },
      });
      mockScopeHelper.hasAccessToResourceAsync.mockResolvedValue(false);
      await expect(service.findOne('cl1', { rantingId: 'r1' })).rejects.toThrow(ForbiddenException);
    });
  });

  describe('create', () => {
    it('should create a claim with pending status', async () => {
      const mockClaim = { id: 'cl1', status: 'pending', tipe: 'keanggotaan', anggotaId: 'a1' };
      mockPrisma.klaim.create.mockResolvedValue(mockClaim);
      // Spy on the service's findOne method
      jest.spyOn(service, 'findOne').mockResolvedValue(mockClaim);
      const result = await service.create({ tipe: 'keanggotaan', anggotaId: 'a1' });
      expect(result.status).toBe('pending');
    });

    it('rejects unggah mode without buktiFiles', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue({ id: 'cl1', status: 'pending' } as never);
      await expect(service.create({
        tipe: 'keanggotaan',
        email: 'klaimer@test.com',
        modeBukti: 'unggah',
      })).rejects.toThrow(BadRequestException);
    });

    it('rejects ceritaHistori shorter than 20 characters', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue({ id: 'cl1', status: 'pending' } as never);
      await expect(service.create({
        tipe: 'keanggotaan',
        email: 'klaimer@test.com',
        modeBukti: 'cerita',
        ceritaHistori: 'Terlalu pendek',
      })).rejects.toThrow(BadRequestException);
    });

    it('stores trackingToken, modeBukti and ceritaHistori', async () => {
      const ceritaHistori = 'Saya berlatih sejak 2010 dan didadar oleh Andi serta Budi pada 2012.';
      mockPrisma.klaim.create.mockResolvedValue({ id: 'cl1', status: 'pending' });
      jest.spyOn(service, 'findOne').mockResolvedValue({ id: 'cl1', status: 'pending' } as never);
      await service.create({
        tipe: 'keanggotaan',
        email: 'klaimer@test.com',
        modeBukti: 'cerita',
        ceritaHistori,
      });
      expect(mockPrisma.klaim.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          trackingToken: expect.any(String),
          modeBukti: 'cerita',
          ceritaHistori,
        }),
      }));
    });
  });

  describe('update', () => {
    it('should update a claim', async () => {
      mockPrisma.klaim.update.mockResolvedValue({ id: 'cl1', tipe: 'keanggotaan' });
      const result = await service.update('cl1', { tipe: 'keanggotaan' });
    });

    it('should throw ForbiddenException for out-of-scope resource', async () => {
      mockPrisma.klaim.findUnique.mockResolvedValue({
        id: 'cl1',
        anggota: { rantingId: 'r-other' },
      });
      mockScopeHelper.hasAccessToResourceAsync.mockResolvedValue(false);
      await expect(service.update('cl1', { catatan: 'test' }, { rantingId: 'r1' })).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('remove', () => {
    it('should reject deletion of a claim that is not rejected', async () => {
      mockPrisma.klaim.findUnique.mockResolvedValue({
        id: 'cl1',
        status: 'pending',
        rantingId: 'r1',
        anggota: null,
        buktiKeanggotaan: [],
        dokumenPendukung: [],
      });
      mockScopeHelper.hasAccessToResourceAsync.mockResolvedValue(true);

      await expect(
        service.remove('cl1', { role: 'admin_ranting', rantingId: 'r1' }),
      ).rejects.toThrow('Hanya klaim yang ditolak yang dapat dihapus');
      expect(mockPrisma.klaim.delete).not.toHaveBeenCalled();
    });

    it('should delete a rejected claim within scope', async () => {
      mockPrisma.klaim.findUnique.mockResolvedValue({
        id: 'cl1',
        status: 'ditolak',
        rantingId: 'r1',
        anggotaId: null,
        anggota: null,
        buktiKeanggotaan: [],
        dokumenPendukung: [],
      });
      mockScopeHelper.hasAccessToResourceAsync.mockResolvedValue(true);
      await service.remove('cl1', { role: 'admin_ranting', rantingId: 'r1' });
      expect(mockPrisma.klaim.delete).toHaveBeenCalledWith({ where: { id: 'cl1' } });
    });

  });


  describe('staged approval', () => {
    const baseClaim = {
      id: 'cl1', tipe: 'keanggotaan', status: 'pending', currentStage: 'ranting',
      namaLengkap: 'Pemohon', jenisKelamin: 'L', rantingId: 'r1', anggotaId: null,
    };

    it('requires ranting approval before wilayah', async () => {
      mockPrisma.klaim.findUnique.mockResolvedValue({
        ...baseClaim,
        ranting: { id: 'r1', wilayahId: 'w1', wilayah: { distrikId: 'd1' } },
      });
      await expect(service.approve('cl1', { role: 'admin_wilayah', wilayahId: 'w1' }))
        .rejects.toThrow('Level ini hanya dapat diproses oleh Admin Ranting');
    });

    it('routes ranting approval to wilayah when the branch has one', async () => {
      mockPrisma.ranting.findUnique.mockResolvedValue({ wilayahId: 'w1' });
      mockPrisma.klaim.findUnique.mockResolvedValue({
        ...baseClaim,
        ranting: { id: 'r1', wilayahId: 'w1', wilayah: { distrikId: 'd1' } },
      });
      await service.approve('cl1', { role: 'admin_ranting', rantingId: 'r1' }, 'user-r');
      expect(mockPrisma.klaim.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'cl1' }, data: expect.objectContaining({ currentStage: 'wilayah', status: 'pending' }),
      }));
    });

    it('routes ranting approval directly to distrik when branch has no wilayah', async () => {
      mockPrisma.ranting.findUnique.mockResolvedValue(null);
      mockPrisma.klaim.findUnique.mockResolvedValue({
        ...baseClaim,
        ranting: { id: 'r1', wilayahId: null, wilayah: null },
      });
      await service.approve('cl1', { role: 'admin_ranting', rantingId: 'r1' }, 'user-r');
      expect(mockPrisma.klaim.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ currentStage: 'distrik', status: 'pending' }),
      }));
    });

    it('requires wilayah approval before distrik when the branch has one', async () => {
      mockPrisma.klaim.findUnique.mockResolvedValue({
        ...baseClaim, status: 'pending', currentStage: 'wilayah',
        ranting: { id: 'r1', wilayahId: 'w1', wilayah: { distrikId: 'd1' } },
      });
      await expect(service.approve('cl1', { role: 'admin_distrik', distrikId: 'd1' }))
        .rejects.toThrow('Level ini hanya dapat diproses oleh Admin Wilayah');
    });

    it('routes distrik approval to nasional without creating the member yet', async () => {
      mockPrisma.klaim.findUnique.mockResolvedValue({
        ...baseClaim, status: 'pending', currentStage: 'distrik',
      });
      await service.approve('cl1', { role: 'admin_distrik', distrikId: 'd1' }, 'user-d');
      expect(mockPrisma.klaim.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ currentStage: 'nasional', status: 'pending' }),
      }));
      expect(mockPrisma.anggota.create).not.toHaveBeenCalled();
    });

    it('creates member and KTA application after national approval', async () => {
      mockPrisma.klaim.findUnique.mockResolvedValue({
        ...baseClaim, status: 'pending', currentStage: 'nasional',
      });
      mockPrisma.anggota.findFirst.mockResolvedValue(null);
      mockPrisma.anggota.create.mockResolvedValue({ id: 'member-1' });
      mockPrisma.ktaApplication.findFirst.mockResolvedValue(null);
      mockPrisma.ktaApplication.create.mockResolvedValue({ id: 'kta-1' });
      await service.approve('cl1', { role: 'admin_nasional' }, 'user-n');
      expect(mockPrisma.ktaApplication.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ anggotaId: 'member-1', status: 'APPROVED' }),
      }));
      expect(mockPrisma.klaim.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ anggotaId: 'member-1', currentStage: 'kta_processing' }),
      }));
    });
  });

  describe('approve', () => {
    it('should approve a claim and send email', async () => {
      mockPrisma.klaim.findUnique.mockResolvedValue({
        id: 'cl1',
        tipe: 'dokumen',
        status: 'pending',
        anggota: { namaLengkap: 'Budi', email: 'budi@test.com', rantingId: 'r1' },
      });
      await service.approve('cl1');
      expect(mockPrisma.klaim.update).toHaveBeenCalledWith({
        where: { id: 'cl1' },
        data: expect.objectContaining({ status: 'disetujui' }),
      });
      expect(mockMailService.sendMail).toHaveBeenCalledTimes(1);
      expect(mockMailService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'budi@test.com' }),
      );
    });

    it('should approve membership claim by scoped admin using claim.rantingId', async () => {
      mockPrisma.ranting.findUnique.mockResolvedValue({ wilayahId: 'w1' });
      mockPrisma.klaim.findUnique.mockResolvedValue({
        id: 'cl2',
        tipe: 'keanggotaan',
        status: 'pending',
        currentStage: 'ranting',
        namaLengkap: 'Pemohon Baru',
        jenisKelamin: 'L',
        rantingId: 'r1',
        anggotaId: null,
        anggota: null,
      });
      mockScopeHelper.hasAccessToResourceAsync.mockResolvedValue(true);

      await service.approve('cl2', { role: 'admin_ranting', rantingId: 'r1' }, 'user-r');

      expect(mockPrisma.klaim.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'cl2' },
          data: expect.objectContaining({
            currentStage: 'wilayah',
            status: 'pending',
            rantingApprovedBy: 'user-r',
          }),
        }),
      );
    });
  });

  describe('reject', () => {
    it('should reject a claim and send rejection email', async () => {
      mockPrisma.klaim.findUnique.mockResolvedValue({
        id: 'cl1',
        status: 'pending',
        anggota: { namaLengkap: 'Budi', email: 'budi@test.com', rantingId: 'r1' },
      });
      await service.reject('cl1', 'Tidak memenuhi syarat');
      expect(mockPrisma.klaim.update).toHaveBeenCalled();
      expect(mockMailService.sendMail).toHaveBeenCalledTimes(1);
      expect(mockMailService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'budi@test.com' }),
      );
    });
  });

  describe('process', () => {
    it('should set claim status to diproses and send email', async () => {
      mockPrisma.klaim.findUnique.mockResolvedValue({
        id: 'cl1',
        status: 'pending',
        anggota: { namaLengkap: 'Budi', email: 'budi@test.com', rantingId: 'r1' },
      });
      mockPrisma.klaim.update.mockResolvedValue({ id: 'cl1', status: 'diproses' });
      const result = await service.process('cl1');
      expect(result.status).toBe('diproses');
      expect(mockMailService.sendMail).toHaveBeenCalledTimes(1);
    });
  });
});