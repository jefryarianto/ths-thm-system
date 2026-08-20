import { NotFoundException } from '@nestjs/common';
import { RevisionService, diffObjects } from './revision.service';

describe('RevisionService', () => {
  let service: RevisionService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      dataRevision: {
        create: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      anggota: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    service = new RevisionService(prisma);
  });

  describe('diffObjects', () => {
    it('should return only changed fields', () => {
      const diff = diffObjects({ nama: 'A', alamat: 'X', umur: 1 }, { nama: 'A', alamat: 'Y', umur: 1 });
      expect(diff).toEqual([{ field: 'alamat', before: 'X', after: 'Y' }]);
    });

    it('should exclude system fields', () => {
      const diff = diffObjects(
        { id: 'x', version: 1, createdAt: new Date(0).toISOString(), nama: 'A' },
        { id: 'x', version: 2, createdAt: new Date(1).toISOString(), nama: 'B' },
      );
      expect(diff).toEqual([{ field: 'nama', before: 'A', after: 'B' }]);
    });

    it('should treat null and undefined as equal', () => {
      const diff = diffObjects({ a: null }, { a: undefined });
      expect(diff).toEqual([]);
    });
  });

  describe('recordUpdate', () => {
    it('should create a revision with diff', async () => {
      prisma.dataRevision.create.mockResolvedValue({ id: 'r1' });
      const id = await service.recordUpdate(
        'anggota',
        'a1',
        { nama: 'A', alamat: 'X' },
        { nama: 'B', alamat: 'X' },
        'u1',
      );
      expect(prisma.dataRevision.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          entity: 'anggota',
          entityId: 'a1',
          action: 'UPDATE',
          changedById: 'u1',
          diff: [{ field: 'nama', before: 'A', after: 'B' }],
        }),
      });
      expect(id).toBe('r1');
    });

    it('should return null when DB write fails', async () => {
      prisma.dataRevision.create.mockRejectedValue(new Error('db down'));
      const id = await service.recordUpdate('anggota', 'a1', { a: 1 }, { a: 2 });
      expect(id).toBeNull();
    });
  });

  describe('listRevisions', () => {
    it('should return paginated revisions', async () => {
      prisma.dataRevision.count.mockResolvedValue(5);
      prisma.dataRevision.findMany.mockResolvedValue([{ id: 'r2' }, { id: 'r1' }]);
      const result = await service.listRevisions('anggota', 'a1', 1, 2);
      expect(result.total).toBe(5);
      expect(result.data).toHaveLength(2);
      expect(prisma.dataRevision.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 2, orderBy: { createdAt: 'desc' } }),
      );
    });
  });

  describe('getRevision', () => {
    it('should throw NotFound when missing', async () => {
      prisma.dataRevision.findUnique.mockResolvedValue(null);
      await expect(service.getRevision('r1')).rejects.toThrow(NotFoundException);
    });

    it('should return diff of a revision', async () => {
      prisma.dataRevision.findUnique.mockResolvedValue({
        id: 'r1',
        entity: 'anggota',
        entityId: 'a1',
        diff: [{ field: 'nama', before: 'A', after: 'B' }],
      });
      const result = await service.getRevision('r1');
      expect(result.diff[0].field).toBe('nama');
    });
  });

  describe('compareRevisions', () => {
    it('should compute diff between two revisions of same entity', async () => {
      prisma.dataRevision.findUnique
        .mockResolvedValueOnce({ id: 'r1', entity: 'anggota', entityId: 'a1', after: { nama: 'A' } })
        .mockResolvedValueOnce({ id: 'r2', entity: 'anggota', entityId: 'a1', after: { nama: 'B' } });
      const result = await service.compareRevisions('anggota', 'a1', 'r1', 'r2');
      expect(result.diff).toEqual([{ field: 'nama', before: 'A', after: 'B' }]);
    });

    it('should throw NotFound when both revisions not found', async () => {
      prisma.dataRevision.findUnique.mockResolvedValue(null);
      await expect(service.compareRevisions('anggota', 'a1', 'r1', 'r9')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('restore', () => {
    it('should restore changed fields and record RESTORE revision', async () => {
      prisma.dataRevision.findUnique.mockResolvedValue({
        id: 'r1',
        entity: 'anggota',
        entityId: 'a1',
        before: { nama: 'Lama', alamat: 'X' },
        diff: [{ field: 'nama', before: 'Lama', after: 'Baru' }],
      });
      prisma.anggota.findUnique.mockResolvedValue({ id: 'a1', nama: 'Baru', alamat: 'X' });
      prisma.anggota.update.mockResolvedValue({ id: 'a1', nama: 'Lama', alamat: 'X' });
      prisma.dataRevision.create.mockResolvedValue({ id: 'r2' });

      const result = await service.restore('anggota', 'a1', 'r1', 'u1');

      expect(prisma.anggota.update).toHaveBeenCalledWith({
        where: { id: 'a1' },
        data: { nama: 'Lama' },
      });
      expect(result.id).toBe('r1');
      expect(prisma.dataRevision.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: 'RESTORE', changedById: 'u1' }),
      });
    });

    it('should throw NotFound for unknown entity delegate', async () => {
      prisma.dataRevision.findUnique.mockResolvedValue({
        id: 'r1',
        entity: 'ghost',
        entityId: 'g1',
        before: { a: 1 },
        diff: [{ field: 'a', before: 1, after: 2 }],
      });
      await expect(service.restore('ghost', 'g1', 'r1')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFound when revision mismatches entity', async () => {
      prisma.dataRevision.findUnique.mockResolvedValue({ id: 'r1', entity: 'klaim', entityId: 'k1' });
      await expect(service.restore('anggota', 'a1', 'r1')).rejects.toThrow(NotFoundException);
    });
  });
});