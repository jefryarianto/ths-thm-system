// @ts-nocheck
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { MutationsService, stepLabel } from './mutations.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ScopeHelper } from '../../common/utils/scope-helpers';
import { NotificationsService } from '../notifications/notifications.service';

describe('MutationsService', () => {
  let service: MutationsService;

  const orgDistrik = {
    fromRantingId: 'r-asal',
    fromWilayahId: 'w-asal',
    fromDistrikId: 'd1',
    toRantingId: 'r-tujuan',
    toWilayahId: 'w-tujuan2',
    toDistrikId: 'd1',
  };

  const transferRequestMock = {
    id: 'tr1',
    anggotaId: 'm1',
    fromRantingId: orgDistrik.fromRantingId,
    toRantingId: orgDistrik.toRantingId,
    reason: 'Ikut orang tua',
    scope: 'distrik',
    status: 'pending',
    requestedBy: 'u-requester',
    approvedBy: null,
    approvedAt: null,
    rejectedBy: null,
    rejectedAt: null,
    note: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    anggota: {
      id: 'm1',
      email: 'budi@test.com',
      namaLengkap: 'Budi',
      nomorAnggota: '0114-0101-001-2026',
      rantingId: 'r-asal',
    },
    fromRanting: { id: 'r-asal', wilayahId: 'w-asal', wilayah: { id: 'w-asal', distrikId: 'd1', distrik: { id: 'd1' } } },
    toRanting: { id: 'r-tujuan', wilayahId: 'w-tujuan2', wilayah: { id: 'w-tujuan2', distrikId: 'd1', distrik: { id: 'd1' } } },
    approvals: [
      { id: 'a1', transferRequestId: 'tr1', side: 'asal', level: 'wilayah', status: 'pending', order: 1 },
      { id: 'a2', transferRequestId: 'tr1', side: 'asal', level: 'distrik', status: 'pending', order: 2 },
    ],
  };

  const users = [{ id: 'u-wilayah', role: 'admin_wilayah', rantingId: 'r-asal', isActive: true }];

  const mockPrisma = {
    anggota: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    ranting: {
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([{ id: 'r-asal' }]),
    },
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue(users),
      update: jest.fn(),
    },
    transferRequest: {
      create: jest.fn().mockResolvedValue({ id: 'tr1', anggotaId: 'm1' }),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn().mockResolvedValue({ status: 'rejected' }),
    },
    transferApproval: {
      createMany: jest.fn().mockResolvedValue({ count: 2 }),
      update: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      count: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn((fn) => fn(mockPrisma)),
  };

  const mockScopeHelper = {
    hasAccessToResourceAsync: jest.fn().mockResolvedValue(true),
  };

  const mockNotifications = {
    send: jest.fn().mockResolvedValue({}),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MutationsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ScopeHelper, useValue: mockScopeHelper },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();

    service = module.get<MutationsService>(MutationsService);
    jest.clearAllMocks();
    mockScopeHelper.hasAccessToResourceAsync.mockResolvedValue(true);
    mockPrisma.anggota.findUnique.mockResolvedValue({
      ...transferRequestMock.anggota,
      rantingId: 'r-asal',
      statusKeanggotaan: 'aktif',
      ranting: { id: 'r-asal', wilayahId: 'w-asal', wilayah: { id: 'w-asal', distrikId: 'd1', distrik: { id: 'd1' } } },
    });
    mockPrisma.ranting.findUnique.mockImplementation(({ where, include }) => {
      if (where.id === 'r-asal') {
        return Promise.resolve({
          id: 'r-asal',
          wilayahId: 'w-asal',
          wilayah: { id: 'w-asal', distrikId: 'd1', distrik: { id: 'd1' } },
        });
      }
      return Promise.resolve({
        id: 'r-tujuan',
        wilayahId: 'w-tujuan2',
        wilayah: { id: 'w-tujuan2', distrikId: 'd1', distrik: { id: 'd1' } },
      });
    });
    mockPrisma.transferRequest.findUnique.mockResolvedValue(transferRequestMock);
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'u-anggota', email: 'budi@test.com' });
    mockPrisma.user.findFirst.mockResolvedValue(null);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create distrik-scope request with 2 levels', async () => {
      const result = await service.create(
        { anggotaId: 'm1', toRantingId: 'r-tujuan', reason: 'Ikut orang tua' },
        'u-requester',
        'admin_ranting',
        { rantingId: 'r-asal' },
      );

      expect(result.currentStep.side).toBe('asal');
      expect(result.currentStep.level).toBe('wilayah');
      expect(mockPrisma.transferApproval.createMany).toHaveBeenCalledTimes(1);
    });

    it('should reject when target ranting equals current ranting', async () => {
      await expect(
        service.create({ anggotaId: 'm1', toRantingId: 'r-asal' }, 'u-requester', 'admin_ranting', { rantingId: 'r-asal' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject when scope does not cover origin ranting', async () => {
      mockScopeHelper.hasAccessToResourceAsync.mockResolvedValue(false);
      await expect(
        service.create({ anggotaId: 'm1', toRantingId: 'r-tujuan' }, 'u-requester', 'admin_ranting', { rantingId: 'r-lain' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('approve', () => {
    it('should approve pending step and move to next', async () => {
      mockPrisma.transferApproval.count.mockResolvedValue(1);
      mockPrisma.transferRequest.findUnique.mockResolvedValue({
        ...transferRequestMock,
        approvals: [
          { id: 'a1', side: 'asal', level: 'wilayah', status: 'pending', order: 1 },
          { id: 'a2', side: 'asal', level: 'distrik', status: 'pending', order: 2 },
        ],
      });

      await service.approve('tr1', 'u-wilayah', undefined, 'admin_wilayah', { rantingId: 'r-asal' });
      expect(mockPrisma.transferApproval.update).toHaveBeenCalled();
      expect(mockNotifications.send).toHaveBeenCalled();
    });

    it('should finalize when all steps approved', async () => {
      mockPrisma.transferApproval.count.mockResolvedValue(0);
      mockPrisma.transferRequest.findUnique.mockResolvedValue({
        ...transferRequestMock,
        approvals: [
          { id: 'a1', side: 'asal', level: 'wilayah', status: 'approved', order: 1 },
          { id: 'a2', side: 'asal', level: 'distrik', status: 'pending', order: 2 },
        ],
      });

      const result = await service.approve('tr1', 'u-distrik', undefined, 'admin_distrik', { rantingId: 'r-asal' });
      expect(mockPrisma.anggota.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { rantingId: orgDistrik.toRantingId },
        }),
      );
      expect(mockPrisma.transferRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'approved' }),
        }),
      );
      expect(result.status).toBe('pending');
    });

    it('should forbid approve when role/scope mismatched', async () => {
      mockPrisma.transferRequest.findUnique.mockResolvedValue({
        ...transferRequestMock,
        approvals: [{ id: 'a1', side: 'asal', level: 'wilayah', status: 'pending', order: 1 }],
      });

      await expect(
        service.approve('tr1', 'u-salah', undefined, 'admin_ranting', { rantingId: 'r-salah' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('reject', () => {
    it('should reject by requester', async () => {
      mockPrisma.transferRequest.findUnique.mockResolvedValue(transferRequestMock);
      await service.reject('tr1', 'u-requester', 'Batal', 'admin_ranting', { rantingId: 'r-asal' });
      expect(mockPrisma.transferRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'rejected' }) }),
      );
    });
  });

  describe('findAll', () => {
    it('should return requests visible to scope', async () => {
      mockPrisma.transferRequest.findMany.mockResolvedValue([transferRequestMock]);
      const result = await service.findAll(undefined, { rantingId: 'r-asal' }, 'u-wilayah', 'admin_wilayah');
      expect(Array.isArray(result)).toBe(true);
      expect(result[0].currentStep.level).toBe('wilayah');
    });
  });

  describe('stepLabel', () => {
    it('should build readable label', () => {
      expect(stepLabel('asal', 'wilayah')).toContain('Wilayah');
      expect(stepLabel('tujuan', 'distrik')).toContain('Ranting Tujuan');
    });
  });
});