import { ApprovalService } from './approval.service';

describe('ApprovalService member_update final approval', () => {
  let service: ApprovalService;
  let prisma: any;
  let eventBus: { emit: jest.Mock };
  let notificationsService: { send: jest.Mock };
  let persistentAudit: { log: jest.Mock };

  beforeEach(() => {
    eventBus = { emit: jest.fn() };
    notificationsService = { send: jest.fn().mockResolvedValue(undefined) };
    persistentAudit = { log: jest.fn() };
    prisma = {
      approvalRequest: {
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
      approvalRequestLevel: {
        update: jest.fn().mockResolvedValue({}),
      },
      anggota: {
        update: jest.fn().mockResolvedValue({}),
        findUnique: jest.fn().mockResolvedValue({ email: 'm@test.com', namaLengkap: 'M' }),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 'u-member' }),
      },
      $transaction: jest.fn(async (cb: (tx: any) => unknown) => cb(prisma)),
    };

    service = new ApprovalService(
      prisma,
      {} as any,
      notificationsService as any,
      persistentAudit as any,
      eventBus as any,
    );
  });

  it('emits approval:member_update:approved on final member_update approval', async () => {
    prisma.approvalRequest.findUnique.mockResolvedValue({
      id: 'req-1',
      requestType: 'member_update',
      itemId: 'anggota-1',
      submittedBy: 'submitter-1',
      status: 'pending',
      levels: [
        {
          status: 'pending',
          approvalLevelId: 'lvl-1',
          approvalLevel: { order: 1, id: 'lvl-1' },
        },
      ],
    });

    await service.approve('req-1', 'approver-1');

    expect(prisma.approvalRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'req-1' },
        data: expect.objectContaining({ status: 'approved' }),
      }),
    );
    expect(eventBus.emit).toHaveBeenCalledWith('approval:member_update:approved', {
      anggotaId: 'anggota-1',
      userId: 'approver-1',
    });
  });
});
