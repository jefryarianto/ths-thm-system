import { Test, TestingModule } from '@nestjs/testing';
import { NraService } from '../nra.service';
import { PrismaService } from '../../../prisma/prisma.service';

describe('NraService', () => {
  let service: NraService;

  const mockRanting = {
    id: 'r1',
    kodeRanting: 'RTG-0114-01',
    nama: 'Ranting Test',
    wilayah: {
      id: 'w1',
      kodeWilayah: 'WLY-0114-01',
      nama: 'Wilayah Test',
      distrik: {
        id: 'd1',
        kodeDistrik: 'DST-0114',
        nama: 'Distrik Test',
      },
    },
  };

  const mockRantingKodeBerbeda = {
    id: 'r2',
    kodeRanting: 'RTG-0999-88',
    nama: 'Ranting Lain',
    wilayah: {
      id: 'w2',
      kodeWilayah: 'WLY-0999-77',
      nama: 'Wilayah Lain',
      distrik: {
        id: 'd2',
        kodeDistrik: 'DST-0999',
        nama: 'Distrik Lain',
      },
    },
  };

  const mockPrisma = {
    ranting: {
      findUnique: jest.fn(),
    },
    anggota: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NraService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<NraService>(NraService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateMemberNumber', () => {
    it('should generate NRA in format [kode_distrik]-[kode_wilayah][kode_ranting]-[3digit_urut]-[tahun]', async () => {
      mockPrisma.ranting.findUnique.mockResolvedValue(mockRanting);
      mockPrisma.anggota.findMany.mockResolvedValue([
        { nomorAnggota: '0114-0101-001-2020' },
        { nomorAnggota: '0114-0101-002-2020' },
        { nomorAnggota: '0114-0101-003-2020' },
      ]);

      const nra = await service.generateMemberNumber('r1');

      // Format: DST-0114 → 0114, WLY-0114-01 → 01, RTG-0114-01 → 01
      // Sequence: max(001, 002, 003) + 1 = 004
      // Default tahun: current year (2026)
      expect(nra).toMatch(/^\d{3,4}-\d{2,4}-\d{3}-\d{4}$/);
      expect(nra).toBe('0114-0101-004-2026');
    });

    it('should use max sequence + 1 even for non-sequential members', async () => {
      mockPrisma.ranting.findUnique.mockResolvedValue(mockRanting);
      mockPrisma.anggota.findMany.mockResolvedValue([
        { nomorAnggota: '0114-0101-005-2020' },
        { nomorAnggota: '0114-0101-010-2024' },
      ]);

      const nra = await service.generateMemberNumber('r1');

      // Max seq: 010, next: 011
      expect(nra).toBe('0114-0101-011-2026');
    });

    it('should start from 001 when no existing members', async () => {
      mockPrisma.ranting.findUnique.mockResolvedValue(mockRanting);
      mockPrisma.anggota.findMany.mockResolvedValue([]);

      const nra = await service.generateMemberNumber('r1');

      expect(nra).toBe('0114-0101-001-2026');
    });

    it('should extract numeric codes from different kode formats', async () => {
      mockPrisma.ranting.findUnique.mockResolvedValue(mockRantingKodeBerbeda);
      mockPrisma.anggota.findMany.mockResolvedValue([]);

      const nra = await service.generateMemberNumber('r2');

      // DST-0999 → 0999, WLY-0999-77 → 77, RTG-0999-88 → 88
      expect(nra).toBe('0999-7788-001-2026');
    });

    it('should use provided tahunDadar when specified', async () => {
      mockPrisma.ranting.findUnique.mockResolvedValue(mockRanting);
      mockPrisma.anggota.findMany.mockResolvedValue([]);

      const nra = await service.generateMemberNumber('r1', '2020');

      expect(nra).toBe('0114-0101-001-2020');
    });

    it('should handle members without nomorAnggota gracefully', async () => {
      mockPrisma.ranting.findUnique.mockResolvedValue(mockRanting);
      mockPrisma.anggota.findMany.mockResolvedValue([
        { nomorAnggota: null },
        { nomorAnggota: '0114-0101-005-2020' },
      ]);

      const nra = await service.generateMemberNumber('r1');

      // null should be skipped, max seq from 005 → 006
      expect(nra).toBe('0114-0101-006-2026');
    });

    it('should handle members with new format NRA (4 segments)', async () => {
      mockPrisma.ranting.findUnique.mockResolvedValue(mockRanting);
      mockPrisma.anggota.findMany.mockResolvedValue([
        { nomorAnggota: '0114-0101-001-2020' },
        { nomorAnggota: '0114-0102-005-2024' }, // different kodeWilayahRanting
        { nomorAnggota: '0114-0101-012-2025' },
      ]);

      const nra = await service.generateMemberNumber('r1');

      // Max seq from parts[parts.length - 2]: 012 → next: 013
      // (005 is from kodeWilayahRanting 0102 which also parses correctly)
      expect(nra).toBe('0114-0101-013-2026');
    });

    it('should use fallback codes when ranting has no wilayah/distrik', async () => {
      mockPrisma.ranting.findUnique.mockResolvedValue({
        id: 'r3',
        kodeRanting: null,
        nama: 'Ranting Tanpa Struktur',
        wilayah: null,
      });
      mockPrisma.anggota.findMany.mockResolvedValue([]);

      const nra = await service.generateMemberNumber('r3');

      // Fallback: 0000-0000-001-2026
      expect(nra).toBe('0000-0000-001-2026');
    });

    it('should use default current year when no tahunDadar provided', async () => {
      const currentYear = String(new Date().getFullYear());

      mockPrisma.ranting.findUnique.mockResolvedValue(mockRanting);
      mockPrisma.anggota.findMany.mockResolvedValue([]);

      const nra = await service.generateMemberNumber('r1');

      expect(nra.endsWith(`-${currentYear}`)).toBe(true);
    });
  });
});
