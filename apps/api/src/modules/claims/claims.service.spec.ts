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
      findFirst: jest.fn().mockResolvedValue({ id: 'user-w', role: 'admin_wilayah', wilayahId: 'w1' }),
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
      findMany: jest.fn(),
    },
    setting: {
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

  const mockNotificationsService = {
    sendToRole: jest.fn().mockResolvedValue({ sentTo: 1 }),
  };

  const mockPersistentAudit = {
    log: jest.fn(),
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
          provide: require('../notifications/notifications.service').NotificationsService,
          useValue: mockNotificationsService,
        },
        {
          provide: require('../../common/services/persistent-audit.service').PersistentAuditService,
          useValue: mockPersistentAudit,
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

    it('filters claims by currentStage', async () => {
      mockPrisma.klaim.findMany.mockResolvedValue([]);
      mockPrisma.klaim.count.mockResolvedValue(0);
      await service.findAll({ page: 1, limit: 10, currentStage: 'distrik' });
      expect(mockPrisma.klaim.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ currentStage: 'distrik' }) }),
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
      const result = await service.create({
        tipe: 'keanggotaan',
        anggotaId: 'a1',
        email: 'klaimer@test.com',
        modeBukti: 'cerita',
        ceritaHistori: 'Saya berlatih sejak 2010 dan didadar oleh Andi serta Budi pada 2012.',
      });
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

    it('does not pass buktiTipe to prisma.klaim.create', async () => {
      mockPrisma.klaim.create.mockResolvedValue({ id: 'cl1', status: 'pending' });
      jest.spyOn(service, 'findOne').mockResolvedValue({ id: 'cl1', status: 'pending' } as never);
      await service.create({
        tipe: 'keanggotaan',
        email: 'klaimer@test.com',
        modeBukti: 'cerita',
        ceritaHistori: 'Saya berlatih sejak 2010 dan didadar oleh Andi serta Budi pada 2012.',
        buktiTipe: 'kartu_anggota',
      });
      const payload = mockPrisma.klaim.create.mock.calls[0][0].data;
      expect(payload).not.toHaveProperty('buktiTipe');
      expect(payload).not.toHaveProperty('buktiFiles');
      expect(payload).not.toHaveProperty('dokumenPendukungFiles');
    });

    it('persists pekerjaan and pelantikan on claim create', async () => {
      mockPrisma.klaim.create.mockResolvedValue({ id: 'cl1', status: 'pending' });
      jest.spyOn(service, 'findOne').mockResolvedValue({ id: 'cl1', status: 'pending' } as never);

      await service.create({
        tipe: 'keanggotaan',
        email: 'klaimer@test.com',
        modeBukti: 'cerita',
        ceritaHistori: 'Saya berlatih sejak 2010 dan didadar oleh Andi serta Budi pada 2012.',
        pekerjaan: 'Guru',
        pelantikan: '12 JULI 2020',
      } as any);

      expect(mockPrisma.klaim.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          pekerjaan: 'Guru',
          pelantikan: '12 JULI 2020',
        }),
      }));
    });

    it('requires evidence for keanggotaan claims even when anggotaId is supplied', async () => {
      await expect(service.create({
        tipe: 'keanggotaan',
        email: 'klaimer@test.com',
        anggotaId: 'a1',
      })).rejects.toThrow(BadRequestException);
    });
  });

  describe('public claim submission notification', () => {
    const publicClaimDto = {
      tipe: 'keanggotaan',
      rantingId: 'ranting-1',
      namaLengkap: 'Pemohon Baru',
      email: 'klaimer@test.com',
      modeBukti: 'cerita',
      ceritaHistori: 'Saya berlatih sejak 2010 dan didadar oleh Andi serta Budi pada 2012.',
    };

    it('notifies only the admin_ranting of the claim rantingId', async () => {
      mockPrisma.klaim.create.mockResolvedValue({ id: 'cl1', rantingId: 'ranting-1' });
      jest.spyOn(service, 'findOne').mockResolvedValue({ id: 'cl1' } as never);

      await service.create(publicClaimDto);

      expect(mockNotificationsService.sendToRole).toHaveBeenCalledTimes(1);
      expect(mockNotificationsService.sendToRole).toHaveBeenCalledWith({
        role: 'admin_ranting',
        rantingId: 'ranting-1',
        tipe: 'status_klaim',
        judul: expect.any(String),
        isi: expect.any(String),
        data: {
          claimId: 'cl1',
          url: '/claims/cl1',
          screen: 'admin/claims',
          screenId: 'cl1',
        },
      });
    });

    it('skips the notification and records an audit when rantingId is missing', async () => {
      mockPrisma.klaim.create.mockResolvedValue({ id: 'cl2', rantingId: null });
      jest.spyOn(service, 'findOne').mockResolvedValue({ id: 'cl2' } as never);
      const warn = jest.spyOn((service as any).logger, 'warn').mockImplementation(() => undefined);

      await service.create({ ...publicClaimDto, rantingId: undefined });

      expect(mockNotificationsService.sendToRole).not.toHaveBeenCalled();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('cl2'));
      expect(mockPersistentAudit.log).toHaveBeenCalledWith(expect.objectContaining({
        entityId: 'cl2',
        details: expect.objectContaining({ reason: 'missing rantingId' }),
      }));
      warn.mockRestore();
    });
  });

  describe('createBulk', () => {
    it('rejects more than 100 claims', async () => {
      const claims = Array.from({ length: 101 }, () => ({ tipe: 'keanggotaan', rantingId: 'r1' }));
      await expect(service.createBulk({ claims })).rejects.toThrow(BadRequestException);
      expect(mockPrisma.klaim.create).not.toHaveBeenCalled();
    });

    it('rejects claims outside the admin ranting scope', async () => {
      await expect(service.createBulk({
        claims: [{ tipe: 'keanggotaan', rantingId: 'r1' }, { tipe: 'keanggotaan', rantingId: 'r2' }],
      }, { rantingId: 'r1' })).rejects.toThrow(ForbiddenException);
      expect(mockPrisma.klaim.create).not.toHaveBeenCalled();
    });

    it('creates every claim with a unique tracking token in one transaction', async () => {
      let seq = 0;
      mockPrisma.ranting.findMany.mockResolvedValue([{ id: 'r1' }]);
      mockPrisma.klaim.create.mockImplementation(async ({ data }: { data: { trackingToken: string } }) => ({
        id: `cl${++seq}`,
        trackingToken: data.trackingToken,
      }));
      mockPrisma.klaim.findMany.mockResolvedValue([
        { id: 'cl2', trackingToken: 'token-2' },
        { id: 'cl1', trackingToken: 'token-1' },
      ]);

      const result = await service.createBulk({
        claims: [
          { tipe: 'keanggotaan', rantingId: 'r1', email: 'a@test.com', namaLengkap: 'A', jenisKelamin: 'L', tempatDadar: 'T', tahunDadar: '2012' },
          { tipe: 'keanggotaan', rantingId: 'r1', email: 'b@test.com', namaLengkap: 'B', jenisKelamin: 'P', tempatDadar: 'T', tahunDadar: '2012' },
        ],
        batchName: 'Batch ranting',
      }, { rantingId: 'r1' });

      expect(mockPrisma.$transaction).toHaveBeenCalledWith(expect.any(Function), { timeout: 10000 });
      expect(mockPrisma.klaim.create).toHaveBeenCalledTimes(2);
      const tokens = mockPrisma.klaim.create.mock.calls.map(([args]: [{ data: { trackingToken: string } }]) => args.data.trackingToken);
      expect(new Set(tokens).size).toBe(2);
      expect(result.data.map((item: { id: string }) => item.id)).toEqual(['cl1', 'cl2']);
      expect(result).toEqual(expect.objectContaining({ success: true, batchName: 'Batch ranting', count: 2 }));
    });

    it('aborts the batch when one insert fails', async () => {
      mockPrisma.ranting.findMany.mockResolvedValue([{ id: 'r1' }]);
      mockPrisma.klaim.create
        .mockResolvedValueOnce({ id: 'cl1', trackingToken: 'token-1' })
        .mockRejectedValueOnce(new Error('insert failed'));

      await expect(service.createBulk({
        claims: [
          { tipe: 'keanggotaan', rantingId: 'r1', email: 'a@test.com', namaLengkap: 'A', jenisKelamin: 'L', tempatDadar: 'T', tahunDadar: '2012' },
          { tipe: 'keanggotaan', rantingId: 'r1', email: 'b@test.com', namaLengkap: 'B', jenisKelamin: 'P', tempatDadar: 'T', tahunDadar: '2012' },
        ],
      }, { rantingId: 'r1' })).rejects.toThrow('insert failed');

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockPrisma.klaim.findMany).not.toHaveBeenCalled();
    });

    it('rejects admin ranting without an active ranting', async () => {
      await expect(service.createBulk({
        claims: [{ tipe: 'keanggotaan', rantingId: 'r1', email: 'a@test.com', namaLengkap: 'A', jenisKelamin: 'L', tempatDadar: 'T', tahunDadar: '2012' }],
      }, { role: 'admin_ranting' })).rejects.toThrow(ForbiddenException);
      expect(mockPrisma.klaim.create).not.toHaveBeenCalled();
    });

    it('rejects bulk rows that link an existing anggota', async () => {
      await expect(service.createBulk({
        claims: [{ tipe: 'keanggotaan', rantingId: 'r1', email: 'a@test.com', namaLengkap: 'A', jenisKelamin: 'L', tempatDadar: 'T', tahunDadar: '2012', anggotaId: 'a-other' }],
      }, { rantingId: 'r1' })).rejects.toThrow(BadRequestException);
      expect(mockPrisma.klaim.create).not.toHaveBeenCalled();
    });

    it('rejects bulk rows without jenisKelamin', async () => {
      await expect(service.createBulk({
        claims: [{ tipe: 'keanggotaan', rantingId: 'r1', email: 'a@test.com', namaLengkap: 'A', tempatDadar: 'T', tahunDadar: '2012' }],
      }, { rantingId: 'r1' })).rejects.toThrow(BadRequestException);
      expect(mockPrisma.klaim.create).not.toHaveBeenCalled();
    });

    it('validates all ranting ids before creating any claim', async () => {
      mockPrisma.ranting.findMany.mockResolvedValue([{ id: 'r1' }]);
      await expect(service.createBulk({
        claims: [
          { tipe: 'keanggotaan', rantingId: 'r1', email: 'a@test.com', namaLengkap: 'A', jenisKelamin: 'L', tempatDadar: 'T', tahunDadar: '2012' },
          { tipe: 'keanggotaan', rantingId: 'r-missing', email: 'b@test.com', namaLengkap: 'B', jenisKelamin: 'P', tempatDadar: 'T', tahunDadar: '2012' },
        ],
      })).rejects.toThrow(BadRequestException);
      expect(mockPrisma.ranting.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: { in: ['r1', 'r-missing'] } },
      }));
      expect(mockPrisma.klaim.create).not.toHaveBeenCalled();
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

    it('finalizes distrik approval without creating a KTA application', async () => {
      mockPrisma.klaim.findUnique.mockResolvedValue({
        ...baseClaim, status: 'pending', currentStage: 'distrik', email: 'klaimer@test.com',
      });
      mockPrisma.anggota.findFirst.mockResolvedValue(null);
      mockPrisma.anggota.create.mockResolvedValue({ id: 'member-1' });
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.ktaApplication.create.mockResolvedValue({ id: 'kta-1' });
      await service.approve('cl1', { role: 'admin_distrik', distrikId: 'd1' }, 'user-d');
      expect(mockPrisma.klaim.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ currentStage: 'kta_processing', status: 'disetujui' }),
      }));
      expect(mockPrisma.anggota.create).toHaveBeenCalled();
      expect(mockPrisma.ktaApplication.create).not.toHaveBeenCalled();
    });

    it('creates member without KTA application after national approval', async () => {
      mockPrisma.klaim.findUnique.mockResolvedValue({
        ...baseClaim, status: 'pending', currentStage: 'nasional',
      });
      mockPrisma.anggota.findFirst.mockResolvedValue(null);
      mockPrisma.anggota.create.mockResolvedValue({ id: 'member-1' });
      mockPrisma.ktaApplication.create.mockResolvedValue({ id: 'kta-1' });
      await service.approve('cl1', { role: 'admin_nasional' }, 'user-n');
      expect(mockPrisma.ktaApplication.create).not.toHaveBeenCalled();
      expect(mockPrisma.klaim.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ anggotaId: 'member-1', currentStage: 'kta_processing' }),
      }));
      expect(mockPrisma.klaim.update.mock.calls.at(-1)[0].data).not.toHaveProperty('ktaApplicationId');
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
    it('should reject a claim and send rejection email to the claimant email', async () => {
      mockPrisma.klaim.findUnique.mockResolvedValue({
        id: 'cl1',
        status: 'pending',
        email: 'klaimer@test.com',
        namaLengkap: 'Klaimer',
        anggota: { namaLengkap: 'Budi', email: 'budi@test.com', rantingId: 'r1' },
      });
      await service.reject('cl1', 'Tidak memenuhi syarat');
      expect(mockPrisma.klaim.update).toHaveBeenCalled();
      expect(mockMailService.sendMail).toHaveBeenCalledTimes(1);
      expect(mockMailService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'klaimer@test.com' }),
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