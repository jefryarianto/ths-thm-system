// @ts-nocheck
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { UjianPraktekService } from './ujian-praktek.service';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Aturan pendadaran: SEMUA penguji menguji SEMUA aspek/item.
 * Spec ini memverifikasi auto-fill saat create, autoSync additive,
 * dan guard approved pada scoreCandidate.
 */
describe('UjianPraktekService', () => {
  let service: UjianPraktekService;

  const mockPrisma = {
    $transaction: jest.fn((fn) => fn(mockPrisma)),
    kegiatan: { findUnique: jest.fn() },
    ujianPraktek: { create: jest.fn(), findUnique: jest.fn() },
    ujianPraktekItem: { createMany: jest.fn() },
    ujianPraktekPenilai: { createMany: jest.fn() },
    aspekPenilaian: { count: jest.fn() },
    itemPenilaian: { findMany: jest.fn() },
    penugasanPenguji: { findMany: jest.fn(), findFirst: jest.fn() },
    user: { findUnique: jest.fn() },
    nilaiPendadaran: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UjianPraktekService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<UjianPraktekService>(UjianPraktekService);
    jest.clearAllMocks();
    mockPrisma.$transaction.mockImplementation((fn) => fn(mockPrisma));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create (auto-fill semua item & penguji)', () => {
    const dto = { nama: 'Ujian Praktek 1' };

    it('auto-attach semua item aktif & penguji approved (dedupe) saat ujian dibuat', async () => {
      mockPrisma.kegiatan.findUnique.mockResolvedValue({ id: 'k1' });
      mockPrisma.aspekPenilaian.count.mockResolvedValue(2);
      mockPrisma.itemPenilaian.findMany.mockResolvedValue([
        { id: 'i1', urutan: 1 },
        { id: 'i2', urutan: 2 },
      ]);
      mockPrisma.penugasanPenguji.findMany.mockResolvedValue([
        { pengujiUserId: 'u1' },
        { pengujiUserId: 'u2' },
        { pengujiUserId: 'u1' }, // duplikat — harus di-dedupe
      ]);
      mockPrisma.ujianPraktek.create.mockResolvedValue({ id: 'uj1', kegiatanId: 'k1' });

      const result = await service.create('k1', dto);
      expect(result.id).toBe('uj1');

      expect(mockPrisma.ujianPraktekItem.createMany).toHaveBeenCalledTimes(1);
      const itemArg = mockPrisma.ujianPraktekItem.createMany.mock.calls[0][0];
      expect(itemArg.skipDuplicates).toBe(true);
      expect(itemArg.data.map((d) => d.itemPenilaianId)).toEqual(['i1', 'i2']);
      expect(itemArg.data.map((d) => d.urutan)).toEqual([1, 2]);

      expect(mockPrisma.ujianPraktekPenilai.createMany).toHaveBeenCalledTimes(1);
      const penilaiArg = mockPrisma.ujianPraktekPenilai.createMany.mock.calls[0][0];
      expect(penilaiArg.skipDuplicates).toBe(true);
      expect(penilaiArg.data).toEqual([
        { ujianPraktekId: 'uj1', pengujiUserId: 'u1' },
        { ujianPraktekId: 'uj1', pengujiUserId: 'u2' },
      ]);
    });

    it('fallback ke template global bila pendadaran belum punya set sendiri', async () => {
      mockPrisma.kegiatan.findUnique.mockResolvedValue({ id: 'k1' });
      mockPrisma.aspekPenilaian.count.mockResolvedValue(0);
      mockPrisma.itemPenilaian.findMany.mockResolvedValue([]);
      mockPrisma.penugasanPenguji.findMany.mockResolvedValue([]);
      mockPrisma.ujianPraktek.create.mockResolvedValue({ id: 'uj1' });

      await service.create('k1', dto);
      const arg = mockPrisma.itemPenilaian.findMany.mock.calls[0][0];
      expect(arg.where.aspek.kegiatanId).toBeNull();
      expect(mockPrisma.ujianPraktekItem.createMany).not.toHaveBeenCalled();
      expect(mockPrisma.ujianPraktekPenilai.createMany).not.toHaveBeenCalled();
    });

    it('tolak bila kegiatan tidak ditemukan', async () => {
      mockPrisma.kegiatan.findUnique.mockResolvedValue(null);
      await expect(service.create('kX', dto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('autoSync (additive & idempoten)', () => {
    it('attach item & penguji yang belum ada tanpa menghapus yang sudah ada', async () => {
      mockPrisma.ujianPraktek.findUnique.mockResolvedValue({
        id: 'uj1',
        kegiatanId: 'k1',
        items: [],
        penilais: [],
        _count: { penilaians: 0 },
      });
      mockPrisma.aspekPenilaian.count.mockResolvedValue(1);
      mockPrisma.itemPenilaian.findMany.mockResolvedValue([{ id: 'i1', urutan: 1 }]);
      mockPrisma.penugasanPenguji.findMany.mockResolvedValue([{ pengujiUserId: 'u1' }]);

      const result = await service.autoSync('uj1');
      expect(result.id).toBe('uj1');
      expect(mockPrisma.ujianPraktekItem.createMany).toHaveBeenCalledWith(
        expect.objectContaining({ skipDuplicates: true }),
      );
      expect(mockPrisma.ujianPraktekPenilai.createMany).toHaveBeenCalledWith(
        expect.objectContaining({ skipDuplicates: true }),
      );
    });

    it('tolak bila ujian tidak ditemukan', async () => {
      mockPrisma.ujianPraktek.findUnique.mockResolvedValue(null);
      await expect(service.autoSync('ujX')).rejects.toThrow(NotFoundException);
    });
  });

  describe('scoreCandidate guard (penguji harus approved)', () => {
    const dto = { scores: [{ calonAnggotaId: 'c1', items: [{ itemPenilaianId: 'i1', skor: 80 }] }] };
    const ujian = { id: 'uj1', kegiatanId: 'k1', status: 'draft' };

    it('penguji belum approved → Forbidden', async () => {
      mockPrisma.ujianPraktek.findUnique.mockResolvedValue(ujian);
      mockPrisma.user.findUnique.mockResolvedValue({ role: 'penguji' });
      mockPrisma.penugasanPenguji.findFirst.mockResolvedValue(null);

      await expect(service.scoreCandidate('uj1', dto, 'u1')).rejects.toThrow(ForbiddenException);
    });

    it('penguji approved → boleh input nilai', async () => {
      mockPrisma.ujianPraktek.findUnique.mockResolvedValue(ujian);
      mockPrisma.user.findUnique.mockResolvedValue({ role: 'penguji' });
      mockPrisma.penugasanPenguji.findFirst.mockResolvedValue({ id: 'pp1' });
      mockPrisma.nilaiPendadaran.findFirst.mockResolvedValue(null);
      mockPrisma.nilaiPendadaran.create.mockResolvedValue({});

      const result = await service.scoreCandidate('uj1', dto, 'u1');
      expect(result.scored).toBe(1);
      expect(mockPrisma.nilaiPendadaran.create).toHaveBeenCalledTimes(1);
    });

    it('admin (bukan role penguji) → tanpa cek penugasan', async () => {
      mockPrisma.ujianPraktek.findUnique.mockResolvedValue(ujian);
      mockPrisma.user.findUnique.mockResolvedValue({ role: 'admin_kegiatan' });
      mockPrisma.nilaiPendadaran.findFirst.mockResolvedValue(null);
      mockPrisma.nilaiPendadaran.create.mockResolvedValue({});

      await service.scoreCandidate('uj1', dto, 'admin1');
      expect(mockPrisma.penugasanPenguji.findFirst).not.toHaveBeenCalled();
    });

    it('ujian sudah selesai → BadRequest', async () => {
      mockPrisma.ujianPraktek.findUnique.mockResolvedValue({ ...ujian, status: 'selesai' });
      await expect(service.scoreCandidate('uj1', dto, 'u1')).rejects.toThrow(BadRequestException);
    });
  });
});
