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

  // Mock transaction client that delegates to the main mockPrisma
  const mockTx = {
    ranting: { findUnique: jest.fn() },
    anggota: { findFirst: jest.fn() },
  };

  const mockPrisma = {
    // Interactive transaction: passes mockTx to the callback
    $transaction: jest.fn((cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx)),
    ranting: mockTx.ranting,
    anggota: mockTx.anggota,
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
      mockTx.ranting.findUnique.mockResolvedValue(mockRanting);
      mockTx.anggota.findFirst.mockResolvedValue({
        nomorAnggota: '0114-0101-003-2020',
      });

      const nra = await service.generateMemberNumber('r1');

      // Format: DST-0114 → 0114, WLY-0114-01 → 01, RTG-0114-01 → 01
      // Sequence: max from latest (003) + 1 = 004
      // Default tahun: current year (2026)
      expect(nra).toMatch(/^\d{3,4}-\d{2,4}-\d{3}-\d{4}$/);
      expect(nra).toBe('0114-0101-004-2026');
    });

    it('should use max sequence + 1 even for non-sequential members', async () => {
      mockTx.ranting.findUnique.mockResolvedValue(mockRanting);
      mockTx.anggota.findFirst.mockResolvedValue({
        nomorAnggota: '0114-0101-010-2024',
      });

      const nra = await service.generateMemberNumber('r1');

      // Max seq: 010, next: 011
      expect(nra).toBe('0114-0101-011-2026');
    });

    it('should start from 001 when no existing members', async () => {
      mockTx.ranting.findUnique.mockResolvedValue(mockRanting);
      mockTx.anggota.findFirst.mockResolvedValue(null);

      const nra = await service.generateMemberNumber('r1');

      expect(nra).toBe('0114-0101-001-2026');
    });

    it('should extract numeric codes from different kode formats', async () => {
      mockTx.ranting.findUnique.mockResolvedValue(mockRantingKodeBerbeda);
      mockTx.anggota.findFirst.mockResolvedValue(null);

      const nra = await service.generateMemberNumber('r2');

      // DST-0999 → 0999, WLY-0999-77 → 77, RTG-0999-88 → 88
      expect(nra).toBe('0999-7788-001-2026');
    });

    it('should use provided tahunDadar when specified', async () => {
      mockTx.ranting.findUnique.mockResolvedValue(mockRanting);
      mockTx.anggota.findFirst.mockResolvedValue(null);

      const nra = await service.generateMemberNumber('r1', '2020');

      expect(nra).toBe('0114-0101-001-2020');
    });

    it('should handle members without nomorAnggota gracefully', async () => {
      mockTx.ranting.findUnique.mockResolvedValue(mockRanting);
      mockTx.anggota.findFirst.mockResolvedValue({
        nomorAnggota: '0114-0101-005-2020',
      });

      const nra = await service.generateMemberNumber('r1');

      // max seq from 005 → 006
      expect(nra).toBe('0114-0101-006-2026');
    });

    it('should handle members with new format NRA (4 segments)', async () => {
      mockTx.ranting.findUnique.mockResolvedValue(mockRanting);
      mockTx.anggota.findFirst.mockResolvedValue({
        nomorAnggota: '0114-0101-012-2025',
      });

      const nra = await service.generateMemberNumber('r1');

      // Max seq from parts[parts.length - 2]: 012 → next: 013
      expect(nra).toBe('0114-0101-013-2026');
    });

    it('should use fallback codes when ranting has no wilayah/distrik', async () => {
      mockTx.ranting.findUnique.mockResolvedValue({
        id: 'r3',
        kodeRanting: null,
        nama: 'Ranting Tanpa Struktur',
        wilayah: null,
      });
      mockTx.anggota.findFirst.mockResolvedValue(null);

      const nra = await service.generateMemberNumber('r3');

      // Fallback: 0000-0000-001-2026
      expect(nra).toBe('0000-0000-001-2026');
    });

    it('should use default current year when no tahunDadar provided', async () => {
      const currentYear = String(new Date().getFullYear());

      mockTx.ranting.findUnique.mockResolvedValue(mockRanting);
      mockTx.anggota.findFirst.mockResolvedValue(null);

      const nra = await service.generateMemberNumber('r1');

      expect(nra.endsWith(`-${currentYear}`)).toBe(true);
    });

    it('should support teks kode distrik (mis. LRT) + kode ranting per-wilayah', async () => {
      mockTx.ranting.findUnique.mockResolvedValue({
        id: 'r4',
        kodeRanting: '03',
        nama: 'San Juan Lebao',
        wilayah: {
          id: 'w4',
          kodeWilayah: '01',
          nama: 'Wilayah Larantuka & Solor',
          distrik: { id: 'd4', kodeDistrik: 'LRT', nama: 'Keuskupan Larantuka' },
        },
      });
      mockTx.anggota.findFirst.mockResolvedValue(null);

      const nra = await service.generateMemberNumber('r4');

      // LRT-0103-001-2026
      expect(nra).toBe('LRT-0103-001-2026');
    });

    it('should support kode distrik ber-prefix lama (DST-0114) tanpa merusak format', async () => {
      mockTx.ranting.findUnique.mockResolvedValue(mockRanting);
      mockTx.anggota.findFirst.mockResolvedValue(null);

      const nra = await service.generateMemberNumber('r1');

      // DST-0114 → 0114, WLY-0114-01 → 01, RTG-0114-01 → 01
      expect(nra).toBe('0114-0101-001-2026');
    });
  });
});
