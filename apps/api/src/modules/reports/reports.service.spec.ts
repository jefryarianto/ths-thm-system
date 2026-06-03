import { Test, TestingModule } from '@nestjs/testing';
import { ReportsService } from './reports.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('ReportsService', () => {
  let service: ReportsService;

  const mockPrisma = {
    anggota: {
      count: jest.fn(),
      groupBy: jest.fn(),
      findMany: jest.fn(),
    },
    calonAnggota: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    iuran: {
      aggregate: jest.fn(),
      findMany: jest.fn(),
    },
    ranting: {
      findMany: jest.fn(),
    },
    absensiLatihan: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    dokumen: {
      count: jest.fn(),
    },
    kegiatan: {
      count: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── membersReport ───
  describe('membersReport', () => {
    it('should return members stats with status and ranting breakdown', async () => {
      mockPrisma.anggota.count.mockResolvedValue(50);
      mockPrisma.anggota.groupBy.mockResolvedValue([
        { statusKeanggotaan: 'aktif', _count: 40 },
        { statusKeanggotaan: 'nonaktif', _count: 10 },
      ]);
      mockPrisma.ranting.findMany.mockResolvedValue([
        { nama: 'Ranting A', _count: { anggota: 25 } },
        { nama: 'Ranting B', _count: { anggota: 25 } },
      ]);

      const result = await service.membersReport();
      expect(result.success).toBe(true);
      expect(result.data.total).toBe(50);
      expect(result.data.byStatus).toHaveLength(2);
      expect(result.data.byRanting).toHaveLength(2);
      expect(result.data.byRanting[0]).toEqual({ ranting: 'Ranting A', count: 25 });
    });
  });

  // ─── dashboardStats ───
  describe('dashboardStats', () => {
    it('should return comprehensive dashboard data', async () => {
      mockPrisma.anggota.count
        .mockResolvedValueOnce(100) // totalMembers
        .mockResolvedValueOnce(5)  // pendingValidasi
        .mockResolvedValueOnce(3); // incompleteData
      mockPrisma.calonAnggota.count
        .mockResolvedValueOnce(20) // totalCandidates
        .mockResolvedValueOnce(12); // totalGraduated
      mockPrisma.iuran.aggregate.mockResolvedValue({ _sum: { jumlah: 5000000 } });
      mockPrisma.anggota.groupBy.mockResolvedValue([
        { statusKeanggotaan: 'aktif', _count: 90 },
      ]);
      mockPrisma.$queryRaw.mockResolvedValue([]);

      const result = await service.dashboardStats();
      expect(result.success).toBe(true);
      expect(result.data.totalMembers).toBe(100);
      expect(result.data.totalCandidates).toBe(20);
      expect(result.data.totalGraduated).toBe(12);
      expect(result.data.totalDuesCollected).toBe(5000000);
      expect(result.data.pendingValidasi).toBe(5);
      expect(result.data.incompleteData).toBe(3);
      expect(result.data.memberStatus).toHaveLength(1);
    });
  });

  // ─── scanStats ───
  describe('scanStats', () => {
    it('should return scan statistics with absensi, dokumen, and kegiatan counts', async () => {
      mockPrisma.absensiLatihan.count.mockResolvedValue(150);
      mockPrisma.dokumen.count.mockResolvedValue(30);
      mockPrisma.kegiatan.count.mockResolvedValue(3);
      mockPrisma.absensiLatihan.findMany.mockResolvedValue([
        {
          id: 'abs-1',
          hadir: true,
          catatan: 'Check-in via QR',
          createdAt: new Date('2026-06-01'),
          anggota: { namaLengkap: 'Budi Santoso', nomorAnggota: 'ANG-001' },
          latihan: { jenisMateri: 'Latihan Tangan', kegiatan: { nama: 'Latihan Mingguan' } },
        },
        {
          id: 'abs-2',
          hadir: false,
          catatan: null,
          createdAt: new Date('2026-05-30'),
          anggota: { namaLengkap: 'Siti Rahayu', nomorAnggota: 'ANG-002' },
          latihan: { jenisMateri: null, kegiatan: { nama: 'Kegiatan Sosial' } },
        },
      ]);
      mockPrisma.$queryRaw.mockResolvedValue([
        { tanggal: '2026-06-01', count: 5n },
        { tanggal: '2026-06-02', count: 8n },
      ]);

      const result = await service.scanStats();
      expect(result.success).toBe(true);
      expect(result.data.totalAbsensi).toBe(150);
      expect(result.data.totalDokumen).toBe(30);
      expect(result.data.activeKegiatan).toBe(3);
      expect(result.data.absensiHarian).toHaveLength(2);
      expect(result.data.absensiHarian[0].count).toBe(5);
      expect(result.data.recentAbsensi).toHaveLength(2);
      expect(result.data.recentAbsensi[0].namaAnggota).toBe('Budi Santoso');
      expect(result.data.recentAbsensi[0].nomorAnggota).toBe('ANG-001');
      expect(result.data.recentAbsensi[0].kegiatan).toBe('Latihan Mingguan');
      expect(result.data.recentAbsensi[0].hadir).toBe(true);
    });

    it('should handle empty recent absensi', async () => {
      mockPrisma.absensiLatihan.count.mockResolvedValue(0);
      mockPrisma.dokumen.count.mockResolvedValue(0);
      mockPrisma.kegiatan.count.mockResolvedValue(0);
      mockPrisma.absensiLatihan.findMany.mockResolvedValue([]);
      mockPrisma.$queryRaw.mockResolvedValue([]);

      const result = await service.scanStats();
      expect(result.success).toBe(true);
      expect(result.data.totalAbsensi).toBe(0);
      expect(result.data.recentAbsensi).toHaveLength(0);
      expect(result.data.absensiHarian).toHaveLength(0);
    });

    it('should fallback kegiatan name to jenisMateri when kegiatan is null', async () => {
      mockPrisma.absensiLatihan.count.mockResolvedValue(1);
      mockPrisma.dokumen.count.mockResolvedValue(0);
      mockPrisma.kegiatan.count.mockResolvedValue(0);
      mockPrisma.absensiLatihan.findMany.mockResolvedValue([
        {
          id: 'abs-3',
          hadir: true,
          catatan: null,
          createdAt: new Date(),
          anggota: { namaLengkap: 'Andi', nomorAnggota: 'A-001' },
          latihan: { jenisMateri: 'Tendangan', kegiatan: null },
        },
      ]);
      mockPrisma.$queryRaw.mockResolvedValue([]);

      const result = await service.scanStats();
      expect(result.data.recentAbsensi[0].kegiatan).toBe('Tendangan');
    });

    it('should fallback to dash when both kegiatan and jenisMateri are null', async () => {
      mockPrisma.absensiLatihan.count.mockResolvedValue(1);
      mockPrisma.dokumen.count.mockResolvedValue(0);
      mockPrisma.kegiatan.count.mockResolvedValue(0);
      mockPrisma.absensiLatihan.findMany.mockResolvedValue([
        {
          id: 'abs-4',
          hadir: true,
          catatan: null,
          createdAt: new Date(),
          anggota: { namaLengkap: 'Rina', nomorAnggota: 'R-001' },
          latihan: { jenisMateri: null, kegiatan: null },
        },
      ]);
      mockPrisma.$queryRaw.mockResolvedValue([]);

      const result = await service.scanStats();
      expect(result.data.recentAbsensi[0].kegiatan).toBe('-');
    });
  });

  // ─── getAbsensiHarian (via scanStats) ───
  describe('getAbsensiHarian', () => {
    it('should return daily absensi counts for last 30 days', async () => {
      mockPrisma.absensiLatihan.count.mockResolvedValue(20);
      mockPrisma.dokumen.count.mockResolvedValue(0);
      mockPrisma.kegiatan.count.mockResolvedValue(0);
      mockPrisma.absensiLatihan.findMany.mockResolvedValue([]);
      mockPrisma.$queryRaw.mockResolvedValue([
        { tanggal: '2026-05-15', count: 3n },
        { tanggal: '2026-05-16', count: 7n },
      ]);

      const result = await service.scanStats();
      expect(result.data.absensiHarian).toHaveLength(2);
      expect(result.data.absensiHarian[0]).toEqual({ tanggal: '2026-05-15', count: 3 });
      expect(result.data.absensiHarian[1]).toEqual({ tanggal: '2026-05-16', count: 7 });
    });

    it('should return empty array when raw query fails', async () => {
      mockPrisma.absensiLatihan.count.mockResolvedValue(0);
      mockPrisma.dokumen.count.mockResolvedValue(0);
      mockPrisma.kegiatan.count.mockResolvedValue(0);
      mockPrisma.absensiLatihan.findMany.mockResolvedValue([]);
      mockPrisma.$queryRaw.mockRejectedValue(new Error('Table does not exist'));

      const result = await service.scanStats();
      expect(result.data.absensiHarian).toEqual([]);
    });
  });

  // ─── exportReport ───
  describe('exportReport', () => {
    it('should export members data', async () => {
      mockPrisma.anggota.findMany.mockResolvedValue([{ namaLengkap: 'Budi' }]);
      const result = await service.exportReport('members', {});
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(mockPrisma.anggota.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        include: { ranting: true },
      });
    });

    it('should export dues data', async () => {
      mockPrisma.iuran.findMany.mockResolvedValue([{ jumlah: 100000 }]);
      const result = await service.exportReport('dues', {});
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });

    it('should export graduates data', async () => {
      mockPrisma.calonAnggota.findMany.mockResolvedValue([{ namaLengkap: 'Lulusan' }]);
      const result = await service.exportReport('graduates', {});
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(mockPrisma.calonAnggota.findMany).toHaveBeenCalledWith({
        where: { status: 'lulus' },
      });
    });

    it('should return empty array for unknown type', async () => {
      const result = await service.exportReport('unknown', {});
      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });
});
