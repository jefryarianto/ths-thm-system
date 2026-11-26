import { KtaApplicationService } from './kta-application.service';

function makeService(overrides: Record<string, any> = {}) {
  const prisma: any = {
    ktaApplication: {
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    ktaAppHistory: {
      create: jest.fn().mockResolvedValue({}),
    },
    $transaction: jest.fn(async (cb: (tx: any) => unknown) => cb(prisma)),
    ...overrides.prisma,
  };
  const digitalCardService = {
    issuePrintedCard: jest.fn().mockResolvedValue({ success: true }),
    ...overrides.digitalCardService,
  };
  const eventBus = {
    on: jest.fn(),
    off: jest.fn(),
    ...overrides.eventBus,
  };
  const persistentAudit = { log: jest.fn() };

  const service = new KtaApplicationService(
    prisma,
    {} as any,
    {} as any,
    undefined,
    persistentAudit as any,
    undefined,
    digitalCardService as any,
    undefined,
    eventBus as any,
  );

  return { service, prisma, digitalCardService, eventBus, persistentAudit };
}

const generatedApp = (id: string, createdAt: string) => ({
  id,
  anggotaId: 'anggota-1',
  status: 'CARD_GENERATED',
  batchId: 'batch-1',
  submittedSnapshot: { nama: 'before' },
  statusPembayaran: 'LUNAS',
  biaya: 50000,
  createdAt: new Date(createdAt),
});

describe('KtaApplicationService.regenerateGeneratedKtaForMember', () => {
  it('regenerates exactly once against newest CARD_GENERATED app despite newer PAYMENT_PENDING app', async () => {
    const { service, prisma, digitalCardService, persistentAudit } = makeService();
    const older = generatedApp('app-old', '2026-01-01T00:00:00Z');
    const newest = generatedApp('app-newest', '2026-02-01T00:00:00Z');
    const allApps = [
      {
        ...generatedApp('app-pending', '2026-03-01T00:00:00Z'),
        status: 'PAYMENT_PENDING',
      },
      older,
      newest,
    ];
    prisma.ktaApplication.findMany.mockImplementation(async (args: any) =>
      allApps
        .filter((app) => app.anggotaId === args.where.anggotaId && app.status === args.where.status)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, args.take),
    );

    const result = await service.regenerateGeneratedKtaForMember('anggota-1', {
      id: 'actor-1',
      role: 'superadmin',
    });

    expect(prisma.ktaApplication.findMany).toHaveBeenCalledWith({
      where: { anggotaId: 'anggota-1', status: 'CARD_GENERATED' },
      select: expect.objectContaining({ id: true, anggotaId: true, status: true }),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 1,
    });
    expect(digitalCardService.issuePrintedCard).toHaveBeenCalledTimes(1);
    expect(digitalCardService.issuePrintedCard).toHaveBeenCalledWith(
      'anggota-1',
      { reason: 'member_update_approved', internalAutoRegenerate: true },
      undefined,
      { id: 'actor-1' },
    );
    expect(prisma.ktaAppHistory.create).toHaveBeenCalledTimes(1);
    expect(prisma.ktaAppHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        ktaApplicationId: 'app-newest',
        level: 'DISTRIK',
        action: 'CARD_GENERATED',
        actorId: 'actor-1',
        actorRole: 'superadmin',
        catatan: 'Auto-regenerate after approved member_update',
      }),
    });
    expect(persistentAudit.log).toHaveBeenCalledTimes(1);
    expect(persistentAudit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'KTA_AUTO_REGENERATE',
        entity: 'KtaApplication',
        entityId: 'app-newest',
        userId: 'actor-1',
      }),
    );
    expect(prisma.ktaApplication.update).not.toHaveBeenCalled();
    expect(prisma.ktaApplication.updateMany).not.toHaveBeenCalled();
    expect(prisma.ktaBatch?.update).toBeUndefined();
    expect(result).toEqual({ regenerated: 1, applicationIds: ['app-newest'] });
  });

  it('returns no-op when no CARD_GENERATED application exists', async () => {
    const { service, digitalCardService, prisma, persistentAudit } = makeService();
    prisma.ktaApplication.findMany.mockResolvedValue([]);

    const result = await service.regenerateGeneratedKtaForMember('anggota-1', {
      id: 'actor-1',
      role: 'superadmin',
    });

    expect(digitalCardService.issuePrintedCard).not.toHaveBeenCalled();
    expect(prisma.ktaAppHistory.create).not.toHaveBeenCalled();
    expect(persistentAudit.log).not.toHaveBeenCalled();
    expect(result).toEqual({ regenerated: 0, applicationIds: [] });
  });
});
