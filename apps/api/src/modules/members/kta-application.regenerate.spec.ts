import { KtaApplicationService } from './kta-application.service';

function makeService(overrides: Record<string, any> = {}) {
  const prisma: any = {
    ktaApplication: {
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({}),
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

describe('KtaApplicationService.regenerateGeneratedKtaForMember', () => {
  it('regenerates only CARD_GENERATED apps, writes history, keeps snapshot/batch/payment untouched', async () => {
    const { service, prisma, digitalCardService } = makeService();
    prisma.ktaApplication.findMany.mockResolvedValue([
      {
        id: 'app-1',
        anggotaId: 'anggota-1',
        status: 'CARD_GENERATED',
        batchId: 'batch-1',
        submittedSnapshot: { nama: 'before' },
        statusPembayaran: 'LUNAS',
        biaya: 50000,
      },
    ]);

    const result = await service.regenerateGeneratedKtaForMember('anggota-1', {
      id: 'actor-1',
      role: 'superadmin',
    });

    expect(prisma.ktaApplication.findMany).toHaveBeenCalledWith({
      where: { anggotaId: 'anggota-1', status: 'CARD_GENERATED' },
      select: expect.objectContaining({ id: true, anggotaId: true, status: true }),
      orderBy: { createdAt: 'desc' },
    });
    expect(digitalCardService.issuePrintedCard).toHaveBeenCalledWith(
      'anggota-1',
      { reason: 'member_update_approved' },
      undefined,
      { id: 'actor-1' },
    );
    expect(prisma.ktaAppHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        ktaApplicationId: 'app-1',
        level: 'DISTRIK',
        action: 'CARD_GENERATED',
        actorId: 'actor-1',
        actorRole: 'superadmin',
        catatan: 'Auto-regenerate after approved member_update',
      }),
    });
    // No direct application mutation for snapshot/batch/payment/status
    expect(prisma.ktaApplication.update).not.toHaveBeenCalled();
    expect(prisma.ktaBatch?.update).toBeUndefined();
    expect(result).toEqual({ regenerated: 1, applicationIds: ['app-1'] });
  });

  it('returns no-op when no CARD_GENERATED application exists', async () => {
    const { service, digitalCardService, prisma } = makeService();
    prisma.ktaApplication.findMany.mockResolvedValue([]);

    const result = await service.regenerateGeneratedKtaForMember('anggota-1', {
      id: 'actor-1',
      role: 'superadmin',
    });

    expect(digitalCardService.issuePrintedCard).not.toHaveBeenCalled();
    expect(prisma.ktaAppHistory.create).not.toHaveBeenCalled();
    expect(result).toEqual({ regenerated: 0, applicationIds: [] });
  });
});
