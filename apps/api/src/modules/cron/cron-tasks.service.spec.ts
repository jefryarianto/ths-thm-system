import { CronTasksService } from './cron-tasks.service';
import { PersistentAuditService } from '../../common/services/persistent-audit.service';

describe('CronTasksService — cleanupStaleSessions', () => {
  let service: CronTasksService;
  let deleteMany: jest.Mock;
  let emailDeleteMany: jest.Mock;
  let auditLog: jest.Mock;
  let audit: PersistentAuditService;

  const buildService = () =>
    new CronTasksService(
      { userSession: { deleteMany }, emailLog: { deleteMany: emailDeleteMany } } as never,
      {} as never,
      {} as never,
      { enqueue: jest.fn().mockResolvedValue(0) } as never,
      audit,
    );

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.SESSION_RETENTION_DAYS;
    delete process.env.EMAIL_LOG_RETENTION_DAYS;
    deleteMany = jest.fn().mockResolvedValue({ count: 0 });
    emailDeleteMany = jest.fn().mockResolvedValue({ count: 0 });
    auditLog = jest.fn().mockResolvedValue(undefined);
    audit = { log: auditLog } as unknown as PersistentAuditService;
    service = buildService();
  });

  /** Selisih tanggal terhadap kira-kira `days` hari lalu (toleransi 1 menit). */
  const expectRoughlyDaysAgo = (received: Date, days: number) => {
    const expected = new Date();
    expected.setDate(expected.getDate() - days);
    expect(Math.abs(received.getTime() - expected.getTime())).toBeLessThan(60_000);
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
    deleteMany.mockResolvedValueOnce({ count: 12 }).mockResolvedValueOnce({ count: 5 });

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
      { userSession: { deleteMany }, emailLog: { deleteMany: emailDeleteMany } } as never,
      {} as never,
      {} as never,
      { enqueue: jest.fn().mockResolvedValue(0) } as never,
      undefined,
    );

    await expect(service.cleanupStaleSessions()).resolves.toBeUndefined();
    expect(deleteMany).toHaveBeenCalledTimes(2);
  });
});

describe('CronTasksService — cleanupOldEmailLogs', () => {
  let service: CronTasksService;
  let emailDeleteMany: jest.Mock;
  let auditLog: jest.Mock;
  let audit: PersistentAuditService;

  const buildService = () =>
    new CronTasksService(
      {
        userSession: { deleteMany: jest.fn() },
        emailLog: { deleteMany: emailDeleteMany },
      } as never,
      {} as never,
      {} as never,
      { enqueue: jest.fn().mockResolvedValue(0) } as never,
      audit,
    );

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.EMAIL_LOG_RETENTION_DAYS;
    emailDeleteMany = jest.fn().mockResolvedValue({ count: 0 });
    auditLog = jest.fn().mockResolvedValue(undefined);
    audit = { log: auditLog } as unknown as PersistentAuditService;
    service = buildService();
  });

  /** Selisih tanggal terhadap kira-kira `days` hari lalu (toleransi 1 menit). */
  const expectRoughlyDaysAgo = (received: Date, days: number) => {
    const expected = new Date();
    expected.setDate(expected.getDate() - days);
    expect(Math.abs(received.getTime() - expected.getTime())).toBeLessThan(60_000);
  };

  it('menghapus email_logs lebih dari 90 hari', async () => {
    emailDeleteMany.mockResolvedValue({ count: 42 });

    await service.cleanupOldEmailLogs();

    expect(emailDeleteMany).toHaveBeenCalledTimes(1);
    const where = emailDeleteMany.mock.calls[0][0].where;
    expect(where).toEqual({ createdAt: { lt: expect.any(Date) } });
    expectRoughlyDaysAgo(where.createdAt.lt, 90);
  });

  it('menghormati override env EMAIL_LOG_RETENTION_DAYS', async () => {
    process.env.EMAIL_LOG_RETENTION_DAYS = '30';
    service = buildService();

    await service.cleanupOldEmailLogs();

    const where = emailDeleteMany.mock.calls[0][0].where;
    expectRoughlyDaysAgo(where.createdAt.lt, 30);
  });

  it('mencatat audit EMAIL_LOG_CLEANUP ketika ada log dihapus', async () => {
    emailDeleteMany.mockResolvedValue({ count: 7 });

    await service.cleanupOldEmailLogs();

    expect(auditLog).toHaveBeenCalledTimes(1);
    expect(auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'EMAIL_LOG_CLEANUP',
        entity: 'EmailLog',
        details: expect.objectContaining({ deleted: 7, retentionDays: 90 }),
      }),
    );
  });

  it('tidak mencatat audit ketika tidak ada log dihapus', async () => {
    emailDeleteMany.mockResolvedValue({ count: 0 });

    await service.cleanupOldEmailLogs();

    expect(auditLog).not.toHaveBeenCalled();
  });

  it('tetap jalan tanpa PersistentAuditService (opsional)', async () => {
    emailDeleteMany.mockResolvedValue({ count: 3 });
    service = new CronTasksService(
      {
        userSession: { deleteMany: jest.fn() },
        emailLog: { deleteMany: emailDeleteMany },
      } as never,
      {} as never,
      {} as never,
      { enqueue: jest.fn().mockResolvedValue(0) } as never,
      undefined,
    );

    await expect(service.cleanupOldEmailLogs()).resolves.toBeUndefined();
    expect(emailDeleteMany).toHaveBeenCalledTimes(1);
  });
});

describe('CronTasksService — sendDuesReminders (email blast)', () => {
  let service: CronTasksService;
  let emailBlastEnqueue: jest.Mock;
  let notificationsSend: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    emailBlastEnqueue = jest.fn().mockResolvedValue(1);
    notificationsSend = jest.fn().mockResolvedValue(undefined);
  });

  const buildWith = (prisma: Record<string, unknown>) =>
    new CronTasksService(
      prisma as never,
      { send: notificationsSend } as never,
      {} as never,
      { enqueue: emailBlastEnqueue } as never,
      undefined,
    );

  it('menyiapkan item aktif ke antrean email-blast (bukan kirim langsung)', async () => {
    // Hanya jendela H-7 (call pertama iuranRecurring.findMany) yang berisi data;
    // H-1/H+7/pengingat bulan-ini sengaja kosong agar assertion presisi.
    const prisma: Record<string, unknown> = {
      iuranRecurring: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce([
            {
              id: 'r1',
              anggota: { id: 'a1', namaLengkap: 'A', email: 'a@x.co', statusKeanggotaan: 'aktif' },
            },
            {
              id: 'r2',
              anggota: {
                id: 'a2',
                namaLengkap: 'B',
                email: 'b@x.co',
                statusKeanggotaan: 'nonaktif',
              },
            },
          ])
          .mockResolvedValue([]),
      },
      iuran: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };
    // resolveUserIdFromAnggotaId: anggota a1 → user u1 via email
    prisma.anggota = {
      findUnique: jest
        .fn()
        .mockImplementation(({ where }: { where: { id: string } }) =>
          where.id === 'a1'
            ? { id: 'a1', email: 'a@x.co', noHp: null, namaLengkap: 'A', rantingId: null }
            : null,
        ),
      findMany: jest.fn().mockResolvedValue([]),
    };
    prisma.user = { findUnique: jest.fn().mockResolvedValue({ id: 'u1' }), create: jest.fn() };
    service = buildWith(prisma);

    await service.sendDuesReminders();

    // Hanya satu pemanggilan enqueue (H-7; H-1/H+7/bulan-ini kosong)
    expect(emailBlastEnqueue).toHaveBeenCalledTimes(1);
    const [kategori, tanggal, items] = emailBlastEnqueue.mock.calls[0];
    expect(kategori).toBe('reminder_iuran');
    expect(tanggal).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // Anggota nonaktif tidak ikut
    expect(items).toEqual([
      { userId: 'u1', judul: expect.stringContaining('H-7'), isi: expect.any(String) },
    ]);
    // Tidak ada lagi pengiriman langsung di dalam cron
    expect(notificationsSend).not.toHaveBeenCalled();
  });

  it('eskalasi menunggak memakai updateMany set-based (tanpa N+1)', async () => {
    const prisma = {
      iuranRecurring: { findMany: jest.fn().mockResolvedValue([]) },
      iuran: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce([
            {
              id: 'd1',
              periode: '2026-08',
              jumlah: 50000,
              anggota: { id: 'a1', namaLengkap: 'A', email: 'a@x.co' },
            },
            {
              id: 'd2',
              periode: '2026-08',
              jumlah: 60000,
              anggota: { id: 'a2', namaLengkap: 'B', email: 'b@x.co' },
            },
          ])
          .mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        updateMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
      anggota: {
        findUnique: jest
          .fn()
          .mockResolvedValue({
            id: 'a1',
            email: 'a@x.co',
            noHp: null,
            namaLengkap: 'A',
            rantingId: null,
          }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'uX' }), create: jest.fn() },
    };
    service = buildWith(prisma);

    await service.sendDuesReminders();

    // Set-based: SATU updateMany untuk semua iuran (bukan update per baris)
    expect(prisma.iuran.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['d1', 'd2'] } },
      data: { status: 'menunggak' },
    });
    // Keduanya masuk antrean blast
    const [kategori, , items] = emailBlastEnqueue.mock.calls[0];
    expect(kategori).toBe('reminder_iuran');
    expect(items).toHaveLength(2);
    expect(notificationsSend).not.toHaveBeenCalled();
  });

  it('autoGenerateMonthlyDues memakai paging + createMany (tanggal 1)', async () => {
    jest.useFakeTimers({ now: new Date('2026-10-01T12:00:00Z') });
    try {
      const prisma = {
        iuranRecurring: {
          findMany: jest
            .fn()
            // Halaman tunggal (< PAGE_SIZE) → loop selesai setelah 1 iterasi
            .mockResolvedValue([
              { id: 'r1', anggotaId: 'a1', amount: 50000 },
              { id: 'r2', anggotaId: 'a2', amount: 60000 },
            ]),
          updateMany: jest.fn().mockResolvedValue({ count: 2 }),
        },
        iuran: {
          findMany: jest.fn().mockResolvedValue([{ anggotaId: 'a1' }]), // a1 sudah punya
          createMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
      };
      service = buildWith(prisma);

      await service.autoGenerateMonthlyDues();

      // Hanya yang belum punya iuran yang dibuat (a2), periode dari fake time
      expect(prisma.iuran.createMany).toHaveBeenCalledWith({
        data: [{ anggotaId: 'a2', periode: '2026-10', jumlah: 60000, status: 'belum_dibayar' }],
      });
      // nextDueDate dimajukan set-based untuk yang dibuat
      expect(prisma.iuranRecurring.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['r2'] } },
        data: { nextDueDate: expect.any(Date) },
      });
    } finally {
      jest.useRealTimers();
    }
  });
});
