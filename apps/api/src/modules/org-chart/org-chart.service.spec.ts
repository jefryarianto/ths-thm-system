import { Test, TestingModule } from '@nestjs/testing';
import { OrgChartService } from './org-chart.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('OrgChartService', () => {
  let service: OrgChartService;
  let prisma: PrismaService;

  const mockNasionalData = [
    {
      id: 'nas-1',
      nama: 'Nasional 1',
      kode: 'NAS-01',
      distriks: [
        {
          id: 'dis-1',
          nama: 'Distrik 1',
          kodeDistrik: 'DIS-01',
          wilayahs: [
            {
              id: 'wil-1',
              nama: 'Wilayah 1',
              kodeWilayah: 'WIL-01',
              rantings: [
                {
                  id: 'ran-1',
                  nama: 'Ranting 1',
                  kodeRanting: 'RAN-01',
                  _count: { anggota: 25 },
                },
              ],
            },
          ],
        },
      ],
    },
  ];

  const mockPrismaService = {
    nasional: {
      findMany: jest.fn().mockResolvedValue(mockNasionalData),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrgChartService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<OrgChartService>(OrgChartService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('returns org chart tree and summary statistics for unscoped request', async () => {
    mockPrismaService.nasional.findMany.mockResolvedValueOnce(mockNasionalData);

    const result = await service.getOrgChart(false);

    expect(result.success).toBe(true);
    expect(result.data.tree).toHaveLength(1);
    expect(result.data.tree[0].name).toBe('Nasional 1');
    expect(result.data.tree[0].children[0].name).toBe('Distrik 1');
    expect(result.data.summary.totalNasional).toBe(1);
    expect(result.data.summary.totalDistrik).toBe(1);
    expect(result.data.summary.totalWilayah).toBe(1);
    expect(result.data.summary.totalRanting).toBe(1);
    expect(result.data.summary.totalMembers).toBe(25);

    expect(prisma.nasional.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
      }),
    );
  });

  it('filters by isVisible when isPublic is true', async () => {
    mockPrismaService.nasional.findMany.mockResolvedValueOnce(mockNasionalData);

    await service.getOrgChart(true);

    expect(prisma.nasional.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isVisible: true },
      }),
    );
  });

  it('filters by distrikId when distrik scope is provided', async () => {
    mockPrismaService.nasional.findMany.mockResolvedValueOnce(mockNasionalData);

    await service.getOrgChart(false, { distrikId: 'dis-1' });

    expect(prisma.nasional.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { distriks: { some: { id: 'dis-1' } } },
      }),
    );
  });

  it('filters by wilayahId when wilayah scope is provided', async () => {
    mockPrismaService.nasional.findMany.mockResolvedValueOnce(mockNasionalData);

    await service.getOrgChart(false, { wilayahId: 'wil-1', distrikId: 'dis-1' });

    expect(prisma.nasional.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { distriks: { some: { wilayahs: { some: { id: 'wil-1' } } } } },
      }),
    );
  });

  it('filters by rantingId when ranting scope is provided', async () => {
    mockPrismaService.nasional.findMany.mockResolvedValueOnce(mockNasionalData);

    await service.getOrgChart(false, { rantingId: 'ran-1', wilayahId: 'wil-1', distrikId: 'dis-1' });

    expect(prisma.nasional.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { distriks: { some: { wilayahs: { some: { rantings: { some: { id: 'ran-1' } } } } } } },
      }),
    );
  });
});
