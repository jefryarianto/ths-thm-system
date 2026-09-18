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
    ujianPraktek: { create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn() },
    ujianPraktekItem: { createMany: jest.fn() },
    ujianPraktekPenilai: { createMany: jest.fn() },
    aspekPenilaian: { count: jest.fn(), findMany: jest.fn() },
    itemPenilaian: { findMany: jest.fn() },
    penugasanPenguji: { findMany: jest.fn(), findFirst: jest.fn() },
    user: { findUnique: jest.fn() },
    nilaiPendadaran: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), upsert: jest.fn(), findMany: jest.fn() },
    kegiatan: { findUnique: jest.fn() },
    pesertaPendadaran: { findMany: jest.fn() },
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

  describe('getMyScoreCard (agregat layar input nilai)', () => {
    const baseKegiatan = { id: 'k1', nama: 'Pendadaran Distrik A', status: 'published' };

    beforeEach(() => {
      mockPrisma.kegiatan.findUnique.mockResolvedValue(baseKegiatan);
      mockPrisma.aspekPenilaian.count.mockResolvedValue(1);
    });

    it('mengembalikan ujian aktif + aspek/item + peserta + skor penguji dalam satu respons', async () => {
      mockPrisma.ujianPraktek.findMany.mockResolvedValue([
        { id: 'u1', status: 'berlangsung', createdAt: new Date() },
      ]);
      mockPrisma.pesertaPendadaran.findMany.mockResolvedValue([
        {
          sumber: 'manual',
          createdAt: new Date(),
          calonAnggota: { id: 'c1', namaLengkap: 'Budi', email: null },
        },
      ]);
      mockPrisma.aspekPenilaian.findMany.mockResolvedValue([
        {
          id: 'a1', kodeAspek: 'A', namaAspek: 'Teknis', isActive: true,
          itemPenilaian: [{ id: 'i1', namaItem: 'Kuda', urutan: 1, isActive: true }],
        },
      ]);
      mockPrisma.nilaiPendadaran.findMany.mockResolvedValue([
        { ujianPraktekId: 'u1', itemPenilaianId: 'i1', skor: '85.5', komentar: 'baik', createdAt: new Date() },
      ]);

      const res = await service.getMyScoreCard('k1', 'penguji-1');

      expect(res.kegiatan).toEqual(baseKegiatan);
      expect(res.ujianAktif).toEqual({ id: 'u1', status: 'berlangsung' });
      expect(res.aspects).toHaveLength(1);
      expect(res.aspects[0].itemPenilaian).toHaveLength(1);
      expect(res.participants).toEqual([
        expect.objectContaining({ id: 'c1', namaLengkap: 'Budi', sumberPeserta: 'manual' }),
      ]);
      expect(res.myScores).toEqual({ i1: { skor: 85.5, komentar: 'baik' } });
    });

    it('ujianAktif melewati yang dibatalkan dan memprioritaskan berlangsung', async () => {
      mockPrisma.ujianPraktek.findMany.mockResolvedValue([
        { id: 'u0', status: 'dibatalkan', createdAt: new Date('2026-01-01') },
        { id: 'u2', status: 'draft', createdAt: new Date('2026-01-02') },
        { id: 'u1', status: 'berlangsung', createdAt: new Date('2026-01-03') },
      ]);
      mockPrisma.pesertaPendadaran.findMany.mockResolvedValue([]);
      mockPrisma.aspekPenilaian.findMany.mockResolvedValue([]);
      mockPrisma.nilaiPendadaran.findMany.mockResolvedValue([]);

      const res = await service.getMyScoreCard('k1', 'penguji-1');

      expect(res.ujianAktif).toEqual({ id: 'u1', status: 'berlangsung' });
    });

    it('semua ujian dibatalkan → ujianAktif null, data lain tetap ada', async () => {
      mockPrisma.ujianPraktek.findMany.mockResolvedValue([
        { id: 'u0', status: 'dibatalkan', createdAt: new Date() },
      ]);
      mockPrisma.pesertaPendadaran.findMany.mockResolvedValue([
        {
          sumber: 'manual', createdAt: new Date(),
          calonAnggota: { id: 'c1', namaLengkap: 'Budi', email: null },
        },
      ]);
      mockPrisma.aspekPenilaian.findMany.mockResolvedValue([]);
      mockPrisma.nilaiPendadaran.findMany.mockResolvedValue([
        { ujianPraktekId: 'u0', itemPenilaianId: 'i1', skor: 90, komentar: null, createdAt: new Date() },
      ]);

      const res = await service.getMyScoreCard('k1', 'penguji-1');

      expect(res.ujianAktif).toBeNull();
      expect(res.participants).toHaveLength(1);
      // Skor tidak dipilih karena tidak ada ujian aktif.
      expect(res.myScores).toEqual({});
    });

    it('kegiatan tidak ditemukan → NotFoundException', async () => {
      mockPrisma.kegiatan.findUnique.mockResolvedValue(null);

      await expect(service.getMyScoreCard('x', 'penguji-1')).rejects.toThrow(NotFoundException);
    });

    it('fallback ke template global bila pendadaran belum punya set aspek', async () => {
      mockPrisma.aspekPenilaian.count.mockResolvedValue(0);
      mockPrisma.ujianPraktek.findMany.mockResolvedValue([]);
      mockPrisma.pesertaPendadaran.findMany.mockResolvedValue([]);
      mockPrisma.aspekPenilaian.findMany.mockResolvedValue([]);
      mockPrisma.nilaiPendadaran.findMany.mockResolvedValue([]);

      await service.getMyScoreCard('k1', 'penguji-1');

      expect(mockPrisma.aspekPenilaian.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ kegiatanId: null }),
        }),
      );
    });

    it('skor duplikat item → nilai createdAt terbaru yang menang', async () => {
      mockPrisma.ujianPraktek.findMany.mockResolvedValue([
        { id: 'u1', status: 'berlangsung', createdAt: new Date() },
      ]);
      mockPrisma.pesertaPendadaran.findMany.mockResolvedValue([]);
      mockPrisma.aspekPenilaian.findMany.mockResolvedValue([]);
      mockPrisma.nilaiPendadaran.findMany.mockResolvedValue([
        { ujianPraktekId: 'u1', itemPenilaianId: 'i1', skor: 70, komentar: null, createdAt: new Date('2026-01-01') },
        { ujianPraktekId: 'u1', itemPenilaianId: 'i1', skor: 88, komentar: 'revisi', createdAt: new Date('2026-01-02') },
      ]);

      const res = await service.getMyScoreCard('k1', 'penguji-1');

      expect(res.myScores).toEqual({ i1: { skor: 88, komentar: 'revisi' } });
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

    it('penguji approved → boleh input nilai (dalam transaksi)', async () => {
      mockPrisma.ujianPraktek.findUnique.mockResolvedValue(ujian);
      mockPrisma.user.findUnique.mockResolvedValue({ role: 'penguji' });
      mockPrisma.penugasanPenguji.findFirst.mockResolvedValue({ id: 'pp1' });
      mockPrisma.nilaiPendadaran.findFirst.mockResolvedValue(null);
      mockPrisma.nilaiPendadaran.create.mockResolvedValue({});

      const result = await service.scoreCandidate('uj1', dto, 'u1');
      expect(result.scored).toBe(1);
      expect(mockPrisma.nilaiPendadaran.create).toHaveBeenCalledTimes(1);
    });

    it('submit batch → semua tulisan dalam SATU transaksi (atomik)', async () => {
      mockPrisma.ujianPraktek.findUnique.mockResolvedValue(ujian);
      mockPrisma.user.findUnique.mockResolvedValue({ role: 'admin_kegiatan' });
      mockPrisma.nilaiPendadaran.findFirst.mockResolvedValue(null);
      mockPrisma.nilaiPendadaran.create.mockResolvedValue({});
      const dto2 = {
        scores: [
          { calonAnggotaId: 'c1', items: [{ itemPenilaianId: 'i1', skor: 80 }] },
          { calonAnggotaId: 'c2', items: [{ itemPenilaianId: 'i1', skor: 70 }] },
        ],
      };

      const result = await service.scoreCandidate('uj1', dto2, 'admin1');
      expect(result.scored).toBe(2);
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockPrisma.nilaiPendadaran.create).toHaveBeenCalledTimes(2);
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
