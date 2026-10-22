import { ReportsController } from './reports.controller';

describe('ReportsController — scope filter', () => {
  let controller: ReportsController;
  let prisma: { absensiLatihan: { findMany: jest.Mock } };
  let reportsService: { getMembersOverTime: jest.Mock };
  let exportService: { exportData: jest.Mock };
  let audit: { log: jest.Mock };

  beforeEach(() => {
    prisma = { absensiLatihan: { findMany: jest.fn().mockResolvedValue([]) } };
    reportsService = { getMembersOverTime: jest.fn().mockResolvedValue([]) };
    exportService = { exportData: jest.fn() };
    audit = { log: jest.fn() };

    controller = new ReportsController(
      prisma as never,
      reportsService as never,
      exportService as never,
      audit as never,
    );
  });

  it('should pass the caller scope to the members growth chart', async () => {
    await controller.getMembersOverTime({ scope: { wilayahId: 'w1' } } as never);
    expect(reportsService.getMembersOverTime).toHaveBeenCalledWith({ wilayahId: 'w1' });
  });

  it('should scope training attendance to the requesting ranting', async () => {
    await controller.getTrainingAttendance('2026', { scope: { rantingId: 'r1' } } as never);
    expect(prisma.absensiLatihan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ anggota: { rantingId: 'r1' } }),
      }),
    );
  });

  it('should scope training attendance to the requesting wilayah', async () => {
    await controller.getTrainingAttendance('2026', { scope: { wilayahId: 'w1' } } as never);
    expect(prisma.absensiLatihan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ anggota: { ranting: { wilayahId: 'w1' } } }),
      }),
    );
  });

  it('should scope training attendance to the requesting district', async () => {
    await controller.getTrainingAttendance('2026', { scope: { distrikId: 'd1' } } as never);
    expect(prisma.absensiLatihan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          anggota: { ranting: { wilayah: { distrikId: 'd1' } } },
        }),
      }),
    );
  });
});
