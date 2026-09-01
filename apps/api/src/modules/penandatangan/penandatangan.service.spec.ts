import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PenandatanganService } from './penandatangan.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('PenandatanganService (scope distrik)', () => {
  let service: PenandatanganService;

  const m = {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
  };
  const dpm = {
    findMany: jest.fn(),
    deleteMany: jest.fn(),
    create: jest.fn(),
  };
  const mockPrisma = {
    penandatangan: m,
    dokumenPenandatangan: dpm,
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PenandatanganService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<PenandatanganService>(PenandatanganService);
    jest.clearAllMocks();
  });

  describe('resolveSigners (rantai: distrik → global → aktif → env)', () => {
    it('menggunakan set penugasan distrik bila ada (all-or-nothing)', async () => {
      dpm.findMany.mockResolvedValue([
        { penandatangan: { nama: 'A FX Distrik', jabatan: 'Koordinator Distrik' } },
        { penandatangan: { nama: 'Pastor Distrik', jabatan: 'Moderator' } },
      ]);
      const result = await service.resolveSigners('kartu_anggota', 'd-lrt');
      expect(dpm.findMany).toHaveBeenCalledTimes(1);
      expect(dpm.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { dokumenType: 'kartu_anggota', distrikId: 'd-lrt' } }),
      );
      expect(result).toHaveLength(2);
      expect(result[0].signerName).toBe('A FX Distrik');
    });

    it('fallback ke set global bila distrik tidak punya sendiri', async () => {
      dpm.findMany
        .mockResolvedValueOnce([]) // distrik kosong
        .mockResolvedValueOnce([{ penandatangan: { nama: 'Global Signer', jabatan: 'Nasional' } }]);
      const result = await service.resolveSigners('sertifikat_pelatihan', 'd-lrt');
      expect(dpm.findMany).toHaveBeenCalledTimes(2);
      expect(result[0].signerName).toBe('Global Signer');
    });

    it('fallback ke penandatangan aktif ketika tidak ada penugasan sama sekali', async () => {
      dpm.findMany.mockResolvedValue([]);
      m.findFirst
        .mockResolvedValueOnce({ nama: 'Aktif Distrik', jabatan: 'Koordinator' }) // distrik aktif
        .mockResolvedValueOnce(null); // global (tidak dipakai)
      const result = await service.resolveSigners('piagam_prestasi', 'd-lrt');
      expect(result).toEqual([{ signerName: 'Aktif Distrik', signerTitle: 'Koordinator' }]);
    });
  });

  describe('create/update (multi-active per scope)', () => {
    it('create creates penandatangan without deactivating others', async () => {
      m.create.mockImplementation(async (args: any) => ({ id: 'p1', ...args.data }));
      await service.create({ nama: 'Baru Distrik', jabatan: 'Koor', isActive: true, distrikId: 'd-lrt' });
      expect(m.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ nama: 'Baru Distrik' }) }),
      );
    });

    it('admin_distrik tidak boleh mengubah penandatangan distrik lain', async () => {
      m.findUnique.mockResolvedValue({ id: 'p-g', distrikId: null });
      await expect(
        service.update('p-g', { nama: 'X' }, { role: 'admin_distrik', distrikId: 'd-lrt' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('admin_distrik boleh mengubah penandatangan distriknya sendiri', async () => {
      m.findUnique.mockResolvedValue({ id: 'p-l', distrikId: 'd-lrt' });
      m.update.mockResolvedValue({ id: 'p-l', nama: 'X' });
      const result = await service.update('p-l', { nama: 'X' }, { role: 'admin_distrik', distrikId: 'd-lrt' });
      expect(result.id).toBe('p-l');
    });
  });

  describe('setDocSigners (all-or-nothing per scope)', () => {
    it('menghapus + membuat ulang pada scope yang sama, membiarkan scope lain utuh', async () => {
      m.count.mockResolvedValue(2);
      dpm.deleteMany.mockResolvedValue({ count: 2 });
      dpm.create.mockResolvedValue({});
      mockPrisma.$transaction.mockImplementation(async (arr: unknown[]) => arr);
      dpm.findMany.mockResolvedValue([{ penandatangan: { nama: 'A', jabatan: '1' } }]);

      await service.setDocSigners('kartu_anggota', ['p1', 'p2'], 'd-lrt');

      expect(dpm.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { dokumenType: 'kartu_anggota', distrikId: 'd-lrt' } }),
      );
      expect(dpm.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ distrikId: 'd-lrt' }) }),
      );
    });
  });
});