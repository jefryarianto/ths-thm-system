import { CronTasksService } from './cron-tasks.service';
import { PersistentAuditService } from '../../common/services/persistent-audit.service';

describe('CronTasksService — cleanupStaleSessions', () => {
  let service: CronTasksService;
  let deleteMany: jest.Mock;
  let auditLog: jest.Mock;
  let audit: PersistentAuditService;

  const buildService = () =>
    new CronTasksService(
      { userSession: { deleteMany } } as never,
      {} as never,
      {} as never,
      audit,
    );

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.SESSION_RETENTION_DAYS;
    deleteMany = jest.fn().mockResolvedValue({ count: 0 });
    auditLog = jest.fn().mockResolvedValue(undefined);
    audit = { log: auditLog } as unknown as PersistentAuditService;
    service = buildService();
  });

  /** Selisih tanggal terhadap kira-kira `days` hari lalu (toleransi 1 menit). */
  const expectRoughlyDaysAgo = (received: Date, days: number) => {
    const expected = new Date();
    expected.setDate(expected.getDate() - days);
    expect(Math.abs(received.getTime() - expected.getTime())).toBeLessThan(
      60_000,
    );
  };

  it('menghapus sesi tidak aktif lebih dari 14 hari', async () => {
    deleteMany.mockResolvedValue({ count: 3 });

    await service.cleanupStaleSessions();

    expect(deleteMany).toHaveBeenCalledTimes(2);
    const staleWhere = deleteMany.mock.calls[0][0].where;
    expect(staleWhere).toEqual({
      lastUsedAt: { lt: expect.any(Date) },
    });
    expectRoughlyDaysAgo(staleWhere.lastUsedAt.lt, 14);
  });

  it('menghapus sesi revoked lebih dari 1 hari', async () => {
    await service.cleanupStaleSessions();

    const revokedWhere = deleteMany.mock.calls[1][0].where;
    expect(revokedWhere).toEqual({
      revokedAt: { lt: expect.any(Date) },
    });
    expectRoughlyDaysAgo(revokedWhere.revokedAt.lt, 1);
  });

  it('mencatat audit SESSION_CLEANUP ketika ada sesi dihapus', async () => {
    deleteMany
      .mockResolvedValueOnce({ count: 12 })
      .mockResolvedValueOnce({ count: 5 });

    await service.cleanupStaleSessions();

    expect(auditLog).toHaveBeenCalledTimes(1);
    expect(auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'SESSION_CLEANUP',
        entity: 'UserSession',
        details: expect.objectContaining({ stale: 12, revoked: 5 }),
      }),
    );
  });

  it('tidak mencatat audit ketika tidak ada sesi dihapus', async () => {
    deleteMany.mockResolvedValue({ count: 0 });

    await service.cleanupStaleSessions();

    expect(auditLog).not.toHaveBeenCalled();
  });

  it('menghormati override env SESSION_RETENTION_DAYS', async () => {
    process.env.SESSION_RETENTION_DAYS = '7';
    service = buildService();

    await service.cleanupStaleSessions();

    const staleWhere = deleteMany.mock.calls[0][0].where;
    expectRoughlyDaysAgo(staleWhere.lastUsedAt.lt, 7);
  });

  it('tetap jalan tanpa PersistentAuditService (opsional)', async () => {
    deleteMany = jest.fn().mockResolvedValue({ count: 2 });
    service = new CronTasksService(
      { userSession: { deleteMany } } as never,
      {} as never,
      {} as never,
      undefined,
    );

    await expect(service.cleanupStaleSessions()).resolves.toBeUndefined();
    expect(deleteMany).toHaveBeenCalledTimes(2);
  });
});
