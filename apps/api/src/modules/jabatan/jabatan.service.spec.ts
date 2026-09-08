import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { JabatanService } from './jabatan.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('JabatanService', () => {
  let service: JabatanService;

  const mockPrisma = {
    jabatan: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const req = (role: string, distrikId?: string) =>
    ({ user: { role }, scope: { distrikId } }) as never;

  const detail = (over: Record<string, unknown> = {}) => ({
    id: 'j1',
    nama: 'Sekretaris',
    distrikId: null,
    _count: { pengurus: 0 },
    ...over,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [JabatanService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<JabatanService>(JabatanService);
    // resetAllMocks (bukan clearAllMocks) agar queue mockResolvedValueOnce dari
    // test sebelumnya tidak bocor ke test berikutnya.
    jest.resetAllMocks();
  });

  describe('findAll (scoping)', () => {
    it('superadmin melihat semua jabatan (tanpa filter)', async () => {
      mockPrisma.jabatan.findMany.mockResolvedValue([]);
      await service.findAll({ role: 'superadmin', distrikId: undefined });
      expect(mockPrisma.jabatan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: undefined }),
      );
    });

    it('admin_distrik melihat jabatan distriknya + global', async () => {
      mockPrisma.jabatan.findMany.mockResolvedValue([]);
      await service.findAll({ role: 'admin_distrik', distrikId: 'd-lrt' });
      expect(mockPrisma.jabatan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { OR: [{ distrikId: 'd-lrt' }, { distrikId: null }] },
        }),
      );
    });

    it('admin_distrik tanpa distrik (scope belum resolve) melihat semua', async () => {
      mockPrisma.jabatan.findMany.mockResolvedValue([]);
      await service.findAll({ role: 'admin_distrik', distrikId: undefined });
      expect(mockPrisma.jabatan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: undefined }),
      );
    });
  });

  describe('create (scoping + duplikat per scope)', () => {
    it('superadmin membuat jabatan global (distrikId null)', async () => {
      mockPrisma.jabatan.findFirst.mockResolvedValue(null);
      mockPrisma.jabatan.create.mockImplementation(async ({ data }) => ({ id: 'j1', ...data }));

      const result = await service.create(req('superadmin'), { nama: 'Bendahara' });

      expect(mockPrisma.jabatan.findFirst).toHaveBeenCalledWith({
        where: { nama: 'Bendahara', distrikId: null },
      });
      expect(result.distrikId).toBeNull();
    });

    it('superadmin membuat jabatan untuk distrik tertentu', async () => {
      mockPrisma.jabatan.findFirst.mockResolvedValue(null);
      mockPrisma.jabatan.create.mockImplementation(async ({ data }) => ({ id: 'j2', ...data }));

      const result = await service.create(req('superadmin'), { nama: 'Sekretaris', distrikId: 'd-lrt' });

      expect(mockPrisma.jabatan.findFirst).toHaveBeenCalledWith({
        where: { nama: 'Sekretaris', distrikId: 'd-lrt' },
      });
      expect(result.distrikId).toBe('d-lrt');
    });

    it('admin_distrik menulis ke distrik lain ditolak', async () => {
      await expect(
        service.create(req('admin_distrik', 'd-lrt'), { nama: 'Sekretaris', distrikId: 'd-lain' }),
      ).rejects.toThrow(/distrik Anda sendiri/);
      expect(mockPrisma.jabatan.create).not.toHaveBeenCalled();
    });

    it('admin_distrik tanpa scope distrik ditolak', async () => {
      await expect(service.create(req('admin_distrik'), { nama: 'X' })).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockPrisma.jabatan.create).not.toHaveBeenCalled();
    });

    it('menolak nama duplikat pada scope yang sama', async () => {
      mockPrisma.jabatan.findFirst.mockResolvedValue({ id: 'exists' });
      await expect(service.create(req('superadmin'), { nama: 'Sekretaris' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('nama sama di scope berbeda diperbolehkan (unik per scope)', async () => {
      // findFirst dipanggil dengan distrikId 'd-lrt' → tidak ada duplikat
      mockPrisma.jabatan.findFirst
        .mockResolvedValueOnce(null) // cek duplikat distrik
        .mockResolvedValueOnce({ id: 'global-1', distrikId: null }); // "sudah ada" global — boleh
      mockPrisma.jabatan.create.mockImplementation(async ({ data }) => ({ id: 'j4', ...data }));

      const result = await service.create(req('superadmin'), { nama: 'Sekretaris', distrikId: 'd-lrt' });
      expect(result.distrikId).toBe('d-lrt');
    });
  });

  describe('update (ownership + duplikat per scope)', () => {
    it('admin_distrik tidak bisa mengubah jabatan global', async () => {
      mockPrisma.jabatan.findUnique.mockResolvedValue(detail());
      await expect(
        service.update(req('admin_distrik', 'd-lrt'), 'j1', { nama: 'Baru' }),
      ).rejects.toThrow(/distrik Anda sendiri/);
      expect(mockPrisma.jabatan.update).not.toHaveBeenCalled();
    });

    it('admin_distrik boleh mengubah jabatan distriknya', async () => {
      mockPrisma.jabatan.findUnique.mockResolvedValue(detail({ distrikId: 'd-lrt' }));
      mockPrisma.jabatan.findFirst.mockResolvedValue(null);
      mockPrisma.jabatan.update.mockResolvedValue(detail({ nama: 'Sekretaris II' }));

      const result = await service.update(req('admin_distrik', 'd-lrt'), 'j1', { nama: 'Sekretaris II' });

      expect(result.nama).toBe('Sekretaris II');
    });

    it('menolak rename ke nama yang sudah dipakai pada scope yang sama', async () => {
      mockPrisma.jabatan.findUnique.mockResolvedValue(detail());
      mockPrisma.jabatan.findFirst.mockResolvedValue({ id: 'other' });
      await expect(
        service.update(req('superadmin'), 'j1', { nama: 'Bendahara' }),
      ).rejects.toThrow(ConflictException);
      expect(mockPrisma.jabatan.update).not.toHaveBeenCalled();
    });

    it('menolak kode duplikat pada scope yang sama', async () => {
      mockPrisma.jabatan.findUnique.mockResolvedValue(detail({ kode: 'SKR' }));
      mockPrisma.jabatan.findFirst.mockResolvedValue({ id: 'other' });
      await expect(
        service.update(req('superadmin'), 'j1', { kode: 'BND' }),
      ).rejects.toThrow(ConflictException);
    });

    it('NotFound bila jabatan tidak ada', async () => {
      mockPrisma.jabatan.findUnique.mockResolvedValue(null);
      await expect(service.update(req('superadmin'), 'missing', { nama: 'X' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove (ownership + masih dipakai)', () => {
    it('superadmin menghapus jabatan global', async () => {
      mockPrisma.jabatan.findUnique.mockResolvedValue(detail());
      mockPrisma.jabatan.delete.mockResolvedValue({});

      const result = await service.remove(req('superadmin'), 'j1');

      expect(result.deleted).toBe(true);
      expect(mockPrisma.jabatan.delete).toHaveBeenCalledWith({ where: { id: 'j1' } });
    });

    it('admin_distrik tidak bisa menghapus jabatan distrik lain', async () => {
      mockPrisma.jabatan.findUnique.mockResolvedValue(detail({ distrikId: 'd-lain' }));
      await expect(service.remove(req('admin_distrik', 'd-lrt'), 'j1')).rejects.toThrow(
        /distrik Anda sendiri/,
      );
      expect(mockPrisma.jabatan.delete).not.toHaveBeenCalled();
    });

    it('menolak hapus jabatan yang masih dipakai pengurus', async () => {
      mockPrisma.jabatan.findUnique.mockResolvedValue(detail({ _count: { pengurus: 3 } }));
      await expect(service.remove(req('superadmin'), 'j1')).rejects.toThrow(/masih digunakan/);
      expect(mockPrisma.jabatan.delete).not.toHaveBeenCalled();
    });
  });
});
