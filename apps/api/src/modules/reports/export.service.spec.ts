import { Test } from '@nestjs/testing';
import { ExportService } from './export.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('ExportService', () => {
  let service: ExportService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      anggota: { findMany: jest.fn().mockResolvedValue([]) },
      iuran: { findMany: jest.fn().mockResolvedValue([]) },
      latihan: { findMany: jest.fn().mockResolvedValue([]) },
      calonAnggota: { findMany: jest.fn().mockResolvedValue([]) },
      nilaiPendadaran: { findMany: jest.fn().mockResolvedValue([]) },
      auditLog: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const module = await Test.createTestingModule({
      providers: [ExportService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(ExportService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should export xlsx buffer with rowCount', async () => {
    prisma.anggota.findMany.mockResolvedValue([
      { namaLengkap: 'Andi', nomorAnggota: 'THS-001' },
      { namaLengkap: 'Budi', nomorAnggota: 'THS-002' },
    ]);
    const result = await service.exportData('members', 'xlsx');
    expect(result.content).toBeInstanceOf(Buffer);
    expect(result.rowCount).toBe(2);
    expect(result.headers.length).toBeGreaterThan(0);
  });

  it('should export csv with BOM and rowCount', async () => {
    prisma.anggota.findMany.mockResolvedValue([{ namaLengkap: 'Andi', nomorAnggota: 'THS-001' }]);
    const result = await service.exportData('members', 'csv');
    expect(result.content).toContain('\uFEFF');
    expect(result.rowCount).toBe(1);
  });

  describe('scope filtering (graduations & assessments)', () => {
    it('should scope graduations to the requesting wilayah', async () => {
      await service.exportData('graduations', 'csv', { wilayahId: 'w1' });
      expect(prisma.calonAnggota.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'lulus',
            ranting: { wilayahId: 'w1' },
          }),
        }),
      );
    });

    it('should scope graduations to the requesting ranting', async () => {
      await service.exportData('graduations', 'csv', { rantingId: 'r1' });
      expect(prisma.calonAnggota.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'lulus', rantingId: 'r1' }),
        }),
      );
    });

    it('should scope assessments to the requesting district', async () => {
      await service.exportData('assessments', 'csv', { distrikId: 'd1' });
      expect(prisma.nilaiPendadaran.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            calonAnggota: { ranting: { wilayah: { distrikId: 'd1' } } },
          }),
        }),
      );
    });

    it('should not add a hierarchy filter for national scope', async () => {
      await service.exportData('graduations', 'csv', {});
      expect(prisma.calonAnggota.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: 'lulus' } }),
      );
    });
  });

  it('should reject unknown export type', async () => {
    await expect(service.exportData('nope', 'xlsx')).rejects.toThrow('Unknown export type');
  });

  it('should support audit_logs export type', async () => {
    prisma.auditLog.findMany.mockResolvedValue([
      {
        createdAt: new Date(),
        action: 'LOGIN_SUCCESS',
        entity: 'User',
        entityId: 'u1',
        userId: 'u1',
        ipAddress: '1.2.3.4',
        details: null,
      },
    ]);
    const result = await service.exportData('audit_logs', 'csv');
    expect(result.content).toContain('LOGIN_SUCCESS');
    expect(result.rowCount).toBe(1);
  });

  describe('scope filtering (candidates & trainings)', () => {
    it('should scope candidates to the requesting district', async () => {
      await service.exportData('candidates', 'csv', { distrikId: 'd1' });
      expect(prisma.calonAnggota.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            wilayah: { distrikId: 'd1' },
          }),
        }),
      );
    });

    it('should scope candidates to the requesting region', async () => {
      await service.exportData('candidates', 'csv', { wilayahId: 'w1' });
      expect(prisma.calonAnggota.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            wilayahId: 'w1',
          }),
        }),
      );
    });

    it('should not add a hierarchy filter for national scope (candidates)', async () => {
      await service.exportData('candidates', 'csv', {});
      expect(prisma.calonAnggota.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
    });

    it('should scope trainings to the requesting district', async () => {
      await service.exportData('trainings', 'csv', { distrikId: 'd1' });
      expect(prisma.latihan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            wilayah: { distrikId: 'd1' },
          }),
        }),
      );
    });

    it('should scope trainings to the requesting region', async () => {
      await service.exportData('trainings', 'csv', { wilayahId: 'w1' });
      expect(prisma.latihan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            wilayahId: 'w1',
          }),
        }),
      );
    });

    it('should not add a hierarchy filter for national scope (trainings)', async () => {
      await service.exportData('trainings', 'csv', {});
      expect(prisma.latihan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
    });
  });
});
