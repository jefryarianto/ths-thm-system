import { NotFoundException } from '@nestjs/common';
import { PublicService } from './public.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PeriodeService } from '../periode/periode.service';

describe('PublicService claim tracking', () => {
  let service: PublicService;
  let prisma: { klaim: { findUnique: jest.Mock } };

  beforeEach(() => {
    prisma = { klaim: { findUnique: jest.fn() } };
    service = new PublicService(
      prisma as unknown as PrismaService,
      {} as PeriodeService,
    );
  });

  it('returns a claim with approval histories by tracking token', async () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const claim = {
      id: 'claim-1',
      namaLengkap: 'Budi',
      status: 'pending',
      currentStage: 'distrik',
      createdAt,
      ranting: { nama: 'Ranting A' },
      approvalHistories: [
        {
          id: 'history-1',
          stage: 'ranting',
          action: 'approve',
          actorRole: 'admin_ranting',
          catatan: null,
          createdAt,
        },
      ],
    };
    prisma.klaim.findUnique.mockResolvedValue(claim);

    const result = await service.getClaimTracking('token-1');

    expect(prisma.klaim.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { trackingToken: 'token-1' } }),
    );
    const query = (prisma.klaim.findUnique as jest.Mock).mock.calls[0][0];
    expect(Object.keys(query.select)).toEqual(
      expect.arrayContaining(['id', 'namaLengkap', 'status', 'currentStage', 'ranting', 'approvalHistories']),
    );
    expect(query.select).not.toHaveProperty('email');
    expect(query.select).not.toHaveProperty('phone');
    expect(result).toEqual(claim);
  });

  it('throws NotFoundException for an unknown tracking token', async () => {
    prisma.klaim.findUnique.mockResolvedValue(null);

    await expect(service.getClaimTracking('bad-token')).rejects.toThrow(NotFoundException);
  });
});
