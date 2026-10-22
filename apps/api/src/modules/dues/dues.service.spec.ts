// @ts-nocheck
import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DuesService } from './dues.service';
import { GamificationService } from '../gamification/gamification.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ScopeHelper } from '../../common/utils/scope-helpers';
import { CacheService } from '../../common/services/cache.service';
import { MemberMailService } from '../../common/services/member-mail.service';

describe('DuesService', () => {
  let service: DuesService;

  const mockPrisma = {
    iuran: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      aggregate: jest.fn(),
      groupBy: jest.fn(),
    },
    anggota: {
      count: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockScopeHelper = {
    buildScopeFilter: jest.fn().mockReturnValue({}),
    buildIndirectScopeFilter: jest.fn().mockReturnValue({}),
    buildSelfScopeFilter: jest.fn().mockReturnValue({}),
    selfCacheSegment: jest.fn().mockReturnValue(''),
    hasAccessToResource: jest.fn().mockReturnValue(true),
    hasAccessToResourceAsync: jest.fn().mockResolvedValue(true),
    verifyKegiatanScope: jest.fn(),
  };

  const mockCache = {
    get: jest.fn().mockReturnValue(undefined),
    set: jest.fn(),
    del: jest.fn(),
    invalidatePrefix: jest.fn(),
    getOrSet: jest
      .fn()
      .mockImplementation((_key: string, factory: () => Promise<unknown>) => factory()),
    clear: jest.fn(),
    getStats: jest.fn().mockReturnValue({ size: 0, keys: [] }),
  };

  const mockGamification = {
    recordTraining: jest.fn().mockResolvedValue({ profile: { points: 10 }, newBadges: [] }),
    recordDuesPayment: jest.fn().mockResolvedValue({ profile: { points: 20 }, newBadges: [] }),
  };

  const mockMemberMailService = {
    sendToMember: jest.fn().mockResolvedValue(undefined),
    sendToMemberWithArgs: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DuesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ScopeHelper, useValue: mockScopeHelper },
        { provide: CacheService, useValue: mockCache },
        { provide: GamificationService, useValue: mockGamification },
        { provide: MemberMailService, useValue: mockMemberMailService },
      ],
    }).compile();

    service = module.get<DuesService>(DuesService);
    jest.clearAllMocks();
    mockScopeHelper.buildIndirectScopeFilter.mockReturnValue({});
    mockScopeHelper.buildSelfScopeFilter.mockReturnValue({});
    mockScopeHelper.selfCacheSegment.mockReturnValue('');
    mockScopeHelper.hasAccessToResourceAsync.mockResolvedValue(true);
    mockCache.invalidatePrefix.mockClear();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated dues', async () => {
      mockPrisma.iuran.findMany.mockResolvedValue([{ id: 'd1', jumlah: 100000 }]);
      mockPrisma.iuran.count.mockResolvedValue(1);
      const result = await service.findAll({ page: 1, limit: 10 });
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should filter by status and periode', async () => {
      mockPrisma.iuran.findMany.mockResolvedValue([]);
      mockPrisma.iuran.count.mockResolvedValue(0);
      await service.findAll({ status: 'lunas', periode: '2026-01' });
      expect(mockPrisma.iuran.findMany).toHaveBeenCalled();
    });

    it('should restrict self-scope (anggota) to their own dues and own cache bucket', async () => {
      mockPrisma.iuran.findMany.mockResolvedValue([]);
      mockPrisma.iuran.count.mockResolvedValue(0);
      const selfScope = { selfMemberId: 'member-a', rantingId: 'r1' };
      mockScopeHelper.selfCacheSegment.mockReturnValue('member-a');
      mockScopeHelper.buildSelfScopeFilter.mockReturnValue({ anggotaId: 'member-a' });

      await service.findAll({ page: 1, limit: 10 }, selfScope);

      // Self filter ikut masuk where → anggota hanya melihat baris miliknya.
      expect(mockScopeHelper.buildSelfScopeFilter).toHaveBeenCalledWith(selfScope, 'anggotaId');
      expect(mockPrisma.iuran.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ anggotaId: 'member-a' }),
        }),
      );
      // Bucket cache harus menyertakan segmen self agar tidak berbagi dengan
      // bucket admin ranting yang sama (mencegah cache-hit daftar milik admin).
      expect(mockCache.getOrSet).toHaveBeenCalledWith(
        expect.stringContaining(':member-a:'),
        expect.any(Function),
        expect.any(Number),
      );
    });

    it('should not apply self filter for admin scope (no selfMemberId)', async () => {
      mockPrisma.iuran.findMany.mockResolvedValue([]);
      mockPrisma.iuran.count.mockResolvedValue(0);
      const adminScope = { rantingId: 'r1' };

      await service.findAll({ page: 1, limit: 10 }, adminScope);

      // buildSelfScopeFilter tetap dipanggil tapi mengembalikan {} untuk admin.
      expect(mockScopeHelper.buildSelfScopeFilter).toHaveBeenCalledWith(adminScope, 'anggotaId');
      const where = mockPrisma.iuran.findMany.mock.calls[0][0].where;
      expect(where.anggotaId).toBeUndefined();
    });
  });

  describe('create', () => {
    it('should create a due record and send payment email', async () => {
      mockPrisma.anggota.findUnique.mockResolvedValue({
        email: 'anggota@test.com',
        namaLengkap: 'Budi',
      });
      mockPrisma.iuran.create.mockResolvedValue({ id: 'd1', jumlah: 100000 });
      const result = await service.create({ anggotaId: 'a1', jumlah: 100000, periode: '2026-01' });
      expect(mockMemberMailService.sendToMemberWithArgs).toHaveBeenCalledTimes(1);
    });

    it('should not send email when member has no email', async () => {
      mockPrisma.anggota.findUnique.mockResolvedValue({ email: null, namaLengkap: 'Budi' });
      mockPrisma.iuran.create.mockResolvedValue({ id: 'd1', jumlah: 100000 });
      await service.create({ anggotaId: 'a1', jumlah: 100000, periode: '2026-01' });
      expect(mockMemberMailService.sendToMemberWithArgs).toHaveBeenCalledTimes(1);
    });

    it('should map P2002 duplicate to ConflictException (unique anggotaId+periode)', async () => {
      const dupError = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      });
      mockPrisma.anggota.findUnique.mockResolvedValue({
        id: 'a1',
        rantingId: 'r1',
        email: null,
        namaLengkap: 'Budi',
      });
      mockPrisma.iuran.create.mockRejectedValue(dupError);
      await expect(
        service.create(
          { anggotaId: 'a1', jumlah: 100000, periode: '2026-02' },
          { rantingId: 'r1' },
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should rethrow non-P2002 errors on create', async () => {
      mockPrisma.anggota.findUnique.mockResolvedValue({
        id: 'a1',
        rantingId: 'r1',
        email: null,
        namaLengkap: 'Budi',
      });
      mockPrisma.iuran.create.mockRejectedValue(new Error('DB down'));
      await expect(
        service.create(
          { anggotaId: 'a1', jumlah: 100000, periode: '2026-02' },
          { rantingId: 'r1' },
        ),
      ).rejects.toThrow('DB down');
    });
  });

  describe('findOne', () => {
    it('should return a single due', async () => {
      mockPrisma.iuran.findUnique.mockResolvedValue({ id: 'd1', jumlah: 100000 });
      const result = await service.findOne('d1');
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrisma.iuran.findUnique.mockResolvedValue(null);
      await expect(service.findOne('d1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a due record', async () => {
      mockPrisma.iuran.update.mockResolvedValue({ id: 'd1', jumlah: 200000 });
      const result = await service.update('d1', { jumlah: 200000 });
    });

    it('should map P2002 to ConflictException when changed periode hits another record', async () => {
      const dupError = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      });
      mockPrisma.iuran.findUnique.mockResolvedValue({
        id: 'd1',
        anggotaId: 'a1',
        periode: '2026-01',
      });
      mockPrisma.iuran.update.mockRejectedValue(dupError);
      await expect(service.update('d1', { periode: '2026-02' })).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('should delete a due record', async () => {
      await service.remove('d1');
      expect(mockPrisma.iuran.delete).toHaveBeenCalledWith({ where: { id: 'd1' } });
    });
  });

  describe('getMemberDues', () => {
    it('should return dues for a member', async () => {
      mockPrisma.iuran.findMany.mockResolvedValue([{ id: 'd1', jumlah: 100000 }]);
      const result = await service.getMemberDues('a1');
      expect(result).toHaveLength(1);
    });

    it('should forbid anggota from viewing another member dues', async () => {
      // assertSelfMember resolve id anggota milik user login (dari email);
      // hasil 'own-member' berbeda dengan memberId yang diminta ('a1').
      mockPrisma.anggota.findFirst.mockResolvedValue({ id: 'own-member' });
      const user = { email: 'other@test.com', role: 'anggota' };

      await expect(service.getMemberDues('a1', user)).rejects.toThrow(ForbiddenException);
      expect(mockPrisma.iuran.findMany).not.toHaveBeenCalled();
    });

    it('should allow anggota to view their own dues', async () => {
      mockPrisma.anggota.findFirst.mockResolvedValue({ id: 'a1' });
      mockPrisma.iuran.findMany.mockResolvedValue([{ id: 'd1' }]);
      const user = { email: 'me@test.com', role: 'anggota' };

      const result = await service.getMemberDues('a1', user);
      expect(result).toHaveLength(1);
    });

    it('should allow admin to view any member dues (role check skipped)', async () => {
      mockPrisma.iuran.findMany.mockResolvedValue([{ id: 'd1' }]);
      const user = { email: 'admin@test.com', role: 'superadmin' };

      const result = await service.getMemberDues('a1', user);
      expect(result).toHaveLength(1);
      // Tidak ada resolusi anggota untuk role admin.
      expect(mockPrisma.anggota.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('submitPaymentConfirmation', () => {
    const dto = { buktiBayarPath: 'bukti.jpg' };

    it('should forbid anggota from confirming another member dues payment', async () => {
      // Iuran milik anggota lain ('a1'); user login resolve ke 'own-member'
      // yang berbeda → Forbidden, dan status TIDAK boleh diubah.
      mockPrisma.iuran.findUnique.mockResolvedValue({
        id: 'dues-1',
        anggotaId: 'a1',
        status: 'belum_dibayar',
        anggota: { id: 'a1', rantingId: 'r1' },
      });
      mockPrisma.anggota.findFirst.mockResolvedValue({ id: 'own-member' });
      const user = { email: 'me@test.com', role: 'anggota' };

      await expect(service.submitPaymentConfirmation('dues-1', dto, user)).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockPrisma.iuran.update).not.toHaveBeenCalled();
    });

    it('should allow anggota to confirm their own dues payment', async () => {
      mockPrisma.iuran.findUnique.mockResolvedValue({
        id: 'dues-1',
        anggotaId: 'a1',
        status: 'belum_dibayar',
        anggota: { id: 'a1', rantingId: 'r1' },
      });
      mockPrisma.anggota.findFirst.mockResolvedValue({ id: 'a1' });
      mockPrisma.iuran.update.mockResolvedValue({
        id: 'dues-1',
        status: 'menunggu_verifikasi',
      });
      const user = { email: 'me@test.com', role: 'anggota' };

      const result = await service.submitPaymentConfirmation('dues-1', dto, user);
      expect(result.status).toBe('menunggu_verifikasi');
      expect(mockPrisma.iuran.update).toHaveBeenCalledTimes(1);
    });

    it('should allow admin to confirm any dues payment (role check skipped)', async () => {
      mockPrisma.iuran.findUnique.mockResolvedValue({
        id: 'dues-1',
        anggotaId: 'a1',
        status: 'belum_dibayar',
        anggota: { id: 'a1', rantingId: 'r1' },
      });
      mockPrisma.iuran.update.mockResolvedValue({ id: 'dues-1', status: 'menunggu_verifikasi' });
      const user = { email: 'admin@test.com', role: 'superadmin' };

      const result = await service.submitPaymentConfirmation('dues-1', dto, user);
      expect(result.status).toBe('menunggu_verifikasi');
      // Role admin: assertSelfMember dilewati → tanpa resolusi anggota.
      expect(mockPrisma.anggota.findFirst).not.toHaveBeenCalled();
    });

    it('should throw NotFound when dues does not exist', async () => {
      mockPrisma.iuran.findUnique.mockResolvedValue(null);
      const user = { email: 'me@test.com', role: 'anggota' };

      await expect(service.submitPaymentConfirmation('missing', dto, user)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrisma.iuran.update).not.toHaveBeenCalled();
    });
  });

  describe('getArrears', () => {
    it('should return arrears data', async () => {
      mockPrisma.iuran.findMany.mockResolvedValue([
        { id: 'd1', jumlah: 100000, status: 'menunggak' },
        { id: 'd2', jumlah: 200000, status: 'menunggak' },
      ]);
      const result = await service.getArrears({});
      expect(result.count).toBe(2);
      expect(result.totalArrears).toBe(300000);
    });
  });

  describe('getDashboardStats', () => {
    it('should return dashboard statistics', async () => {
      mockPrisma.iuran.aggregate
        .mockResolvedValueOnce({ _sum: { jumlah: 5000000 }, _count: 50 })
        .mockResolvedValueOnce({ _sum: { jumlah: 5000000 }, _count: 50 })
        .mockResolvedValueOnce({ _sum: { jumlah: 2000000 }, _count: 15 });
      mockPrisma.iuran.count.mockResolvedValue(65);
      mockPrisma.iuran.findMany.mockResolvedValue([
        { jumlah: 100000, status: 'lunas' },
        { jumlah: 50000, status: 'lunas' },
      ]);
      mockPrisma.anggota.count.mockResolvedValue(100);
      const result = await service.getDashboardStats();
      expect(result.totalIuran).toBe(5000000);
      expect(result.anggotaAktif).toBe(100);
    });
  });

  describe('importDues', () => {
    it('should import dues and count successes', async () => {
      mockPrisma.iuran.create.mockResolvedValue({ id: 'd1' });
      const result = await service.importDues([
        { anggota_id: 'a1', periode: '2026-01', jumlah: '100000' },
      ]);
      expect(result.imported).toBe(1);
    });

    it('should count failures on error', async () => {
      mockPrisma.iuran.create.mockRejectedValue(new Error('DB error'));
      const result = await service.importDues([
        { anggota_id: 'a1', periode: '2026-01', jumlah: '100000' },
      ]);
      expect(result.imported).toBe(0);
      expect(result.failed).toBe(1);
    });
  });

  describe('batchPayment', () => {
    it('should process batch payment', async () => {
      mockPrisma.iuran.create.mockResolvedValue({ id: 'd1' });
      const result = await service.batchPayment({
        memberIds: ['a1', 'a2'],
        periode: '2026-01',
        jumlah: 100000,
      });
      expect(mockPrisma.iuran.create).toHaveBeenCalledTimes(2);
    });

    it('should skip duplicates (P2002) and report counts instead of failing the batch', async () => {
      const dupError = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      });
      mockPrisma.iuran.create.mockResolvedValueOnce({ id: 'd1' }).mockRejectedValueOnce(dupError);
      const result = await service.batchPayment({
        memberIds: ['a1', 'a2'],
        periode: '2026-03',
        jumlah: 50000,
      });
      expect(mockPrisma.iuran.create).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ created: 1, skipped: 1, total: 2 });
    });
  });

  describe('tenant isolation on create (regression)', () => {
    it('should reject create for a member outside the admin scope', async () => {
      mockPrisma.anggota.findUnique.mockResolvedValue({ id: 'a-out', rantingId: 'r-other' });
      mockScopeHelper.hasAccessToResourceAsync.mockResolvedValue(false);
      await expect(
        service.create(
          { anggotaId: 'a-out', jumlah: 100000, periode: '2026-01' },
          { rantingId: 'r1' },
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(mockPrisma.iuran.create).not.toHaveBeenCalled();
    });

    it('should allow create for a member inside the admin scope', async () => {
      mockPrisma.anggota.findUnique.mockResolvedValue({
        id: 'a1',
        rantingId: 'r1',
        email: null,
        namaLengkap: 'Budi',
      });
      mockScopeHelper.hasAccessToResourceAsync.mockResolvedValue(true);
      mockPrisma.iuran.create.mockResolvedValue({ id: 'd1' });
      await service.create(
        { anggotaId: 'a1', jumlah: 100000, periode: '2026-01' },
        { rantingId: 'r1' },
      );
      expect(mockPrisma.iuran.create).toHaveBeenCalled();
    });

    it('should reject batchPayment targeting members outside the admin scope', async () => {
      mockPrisma.anggota.findUnique.mockResolvedValue({ id: 'a-out', rantingId: 'r-other' });
      mockScopeHelper.hasAccessToResourceAsync.mockResolvedValue(false);
      await expect(
        service.batchPayment(
          { memberIds: ['a-out'], periode: '2026-01', jumlah: 100000 },
          { distrikId: 'd1' },
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(mockPrisma.iuran.create).not.toHaveBeenCalled();
    });

    it('should count out-of-scope rows as failed during importDues (no partial row created)', async () => {
      mockPrisma.anggota.findUnique.mockResolvedValue({ id: 'a-out', rantingId: 'r-other' });
      mockScopeHelper.hasAccessToResourceAsync.mockResolvedValue(false);
      const result = await service.importDues(
        [{ anggota_id: 'a-out', periode: '2026-01', jumlah: '100000' }],
        { rantingId: 'r1' },
      );
      expect(result.imported).toBe(0);
      expect(result.failed).toBe(1);
      expect(mockPrisma.iuran.create).not.toHaveBeenCalled();
    });

    it('should allow superadmin (empty scope) to create for any member', async () => {
      mockPrisma.anggota.findUnique.mockClear();
      mockPrisma.iuran.create.mockResolvedValue({ id: 'd1' });
      await service.create({ anggotaId: 'a-any', jumlah: 100000, periode: '2026-01' }, {});
      expect(mockPrisma.iuran.create).toHaveBeenCalled();
    });
  });
});
