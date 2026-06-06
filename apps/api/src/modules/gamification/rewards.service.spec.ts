import { Test, TestingModule } from '@nestjs/testing';
import { RewardsService } from './rewards.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

/** Minimal Prisma mock for rewards tests */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prismaMock: any = {
  gamificationReward: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  gamificationRedemption: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  gamificationProfile: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  gamificationEvent: {
    create: jest.fn(),
  },
  anggota: {
    findUnique: jest.fn(),
  },
  user: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
  },
  $transaction: jest.fn((promises: any[]) => Promise.all(promises)),
};

const REWARD_TEMPLATE = {
  id: 'reward-1',
  name: 'Test Reward',
  description: 'A test reward',
  icon: '\ud83c\udf81',
  pointCost: 100,
  stock: 10,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const PROFILE_TEMPLATE = {
  id: 'profile-1',
  anggotaId: 'anggota-1',
  points: 500,
  latihanStreak: 0,
  iuranStreak: 0,
  lastActivity: new Date(),
};

describe('RewardsService', () => {
  let service: RewardsService;

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mocks
    prismaMock.gamificationReward.findMany.mockResolvedValue([]);
    prismaMock.gamificationReward.create.mockImplementation(({ data }: any) =>
      Promise.resolve({ ...REWARD_TEMPLATE, ...data }),
    );
    prismaMock.gamificationReward.update.mockImplementation(({ where, data }: any) =>
      Promise.resolve({ ...REWARD_TEMPLATE, id: where.id, ...data }),
    );
    prismaMock.gamificationReward.delete.mockResolvedValue(undefined);
    prismaMock.gamificationRedemption.findMany.mockResolvedValue([]);
    prismaMock.gamificationProfile.findUnique.mockResolvedValue(null);
    prismaMock.anggota.findUnique.mockResolvedValue(null);
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RewardsService,
        { provide: require('../../prisma/prisma.service').PrismaService, useValue: prismaMock },
        { provide: require('../notifications/notifications.service').NotificationsService, useValue: { send: jest.fn() } },
      ],
    }).compile();

    service = module.get<RewardsService>(RewardsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getRewards', () => {
    it('should return all rewards ordered by pointCost', async () => {
      prismaMock.gamificationReward.findMany.mockResolvedValue([
        REWARD_TEMPLATE,
        { ...REWARD_TEMPLATE, id: 'reward-2', name: 'Reward 2', pointCost: 200 },
      ]);

      const rewards = await service.getRewards();

      expect(rewards).toHaveLength(2);
      expect(rewards[0].name).toBe('Test Reward');
      expect(prismaMock.gamificationReward.findMany).toHaveBeenCalledWith({
        orderBy: { pointCost: 'asc' },
      });
    });
  });

  describe('createReward', () => {
    it('should create a reward with required fields', async () => {
      const result = await service.createReward({
        name: 'New Reward',
        pointCost: 150,
      });

      expect(result.name).toBe('New Reward');
      expect(result.pointCost).toBe(150);
      expect(result.icon).toBe('\ud83c\udf81');
      expect(result.stock).toBe(0);
    });
  });

  describe('updateReward', () => {
    it('should throw NotFoundException if reward does not exist', async () => {
      prismaMock.gamificationReward.findUnique.mockResolvedValue(null);

      await expect(service.updateReward('nonexistent', { name: 'Test' }))
        .rejects.toThrow(NotFoundException);
    });

    it('should update reward fields', async () => {
      prismaMock.gamificationReward.findUnique.mockResolvedValue(REWARD_TEMPLATE);
      prismaMock.gamificationReward.update.mockResolvedValue({
        ...REWARD_TEMPLATE,
        name: 'Updated',
        pointCost: 200,
      });

      const result = await service.updateReward('reward-1', {
        name: 'Updated',
        pointCost: 200,
      });

      expect(result.name).toBe('Updated');
      expect(result.pointCost).toBe(200);
    });
  });

  describe('deleteReward', () => {
    it('should throw NotFoundException if reward does not exist', async () => {
      prismaMock.gamificationReward.findUnique.mockResolvedValue(null);

      await expect(service.deleteReward('nonexistent'))
        .rejects.toThrow(NotFoundException);
    });

    it('should delete existing reward', async () => {
      prismaMock.gamificationReward.findUnique.mockResolvedValue(REWARD_TEMPLATE);

      await service.deleteReward('reward-1');

      expect(prismaMock.gamificationReward.delete).toHaveBeenCalledWith({
        where: { id: 'reward-1' },
      });
    });
  });

  describe('redeemReward', () => {
    it('should throw NotFoundException if reward does not exist', async () => {
      prismaMock.gamificationReward.findUnique.mockResolvedValue(null);

      await expect(service.redeemReward('anggota-1', 'nonexistent'))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if reward is inactive', async () => {
      prismaMock.gamificationReward.findUnique.mockResolvedValue({
        ...REWARD_TEMPLATE,
        isActive: false,
      });

      await expect(service.redeemReward('anggota-1', 'reward-1'))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if stock is 0', async () => {
      prismaMock.gamificationReward.findUnique.mockResolvedValue({
        ...REWARD_TEMPLATE,
        stock: 0,
      });

      await expect(service.redeemReward('anggota-1', 'reward-1'))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if profile does not exist', async () => {
      prismaMock.gamificationReward.findUnique.mockResolvedValue(REWARD_TEMPLATE);
      prismaMock.gamificationProfile.findUnique.mockResolvedValue(null);

      await expect(service.redeemReward('anggota-1', 'reward-1'))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if insufficient points', async () => {
      prismaMock.gamificationReward.findUnique.mockResolvedValue(REWARD_TEMPLATE);
      prismaMock.gamificationProfile.findUnique.mockResolvedValue({ ...PROFILE_TEMPLATE, points: 50 });

      await expect(service.redeemReward('anggota-1', 'reward-1'))
        .rejects.toThrow(BadRequestException);
    });

    it('should create redemption in transaction with sufficient points', async () => {
      prismaMock.gamificationReward.findUnique.mockResolvedValue(REWARD_TEMPLATE);
      prismaMock.gamificationProfile.findUnique.mockResolvedValue(PROFILE_TEMPLATE);
      prismaMock.gamificationRedemption.create.mockResolvedValue({
        id: 'redemption-1',
        rewardId: 'reward-1',
        anggotaId: 'anggota-1',
        pointsSpent: 100,
        status: 'pending',
        createdAt: new Date(),
      });
      prismaMock.gamificationProfile.update.mockResolvedValue({ ...PROFILE_TEMPLATE, points: 400 });
      prismaMock.gamificationReward.update.mockResolvedValue({ ...REWARD_TEMPLATE, stock: 9 });
      prismaMock.gamificationEvent.create.mockResolvedValue({ id: 'event-1' });
      prismaMock.anggota.findUnique.mockResolvedValue({
        id: 'anggota-1',
        namaLengkap: 'Test Member',
      });

      const result = await service.redeemReward('anggota-1', 'reward-1');

      expect(result.status).toBe('pending');
      expect(result.pointsSpent).toBe(100);
      expect(result.namaLengkap).toBe('Test Member');
      expect(prismaMock.$transaction).toHaveBeenCalled();
    });
  });

  describe('getAllRedemptions', () => {
    it('should return all redemptions with reward and anggota info', async () => {
      prismaMock.gamificationRedemption.findMany.mockResolvedValue([
        {
          id: 'r-1',
          rewardId: 'reward-1',
          anggotaId: 'anggota-1',
          pointsSpent: 100,
          status: 'pending',
          notes: null,
          createdAt: new Date(),
          reward: { name: 'Test Reward', icon: '\ud83c\udf81' },
          anggota: { namaLengkap: 'Test Member' },
        },
      ]);

      const redemptions = await service.getAllRedemptions();

      expect(redemptions).toHaveLength(1);
      expect(redemptions[0].rewardName).toBe('Test Reward');
      expect(redemptions[0].namaLengkap).toBe('Test Member');
    });
  });

  describe('updateRedemptionStatus', () => {
    it('should throw NotFoundException if redemption does not exist', async () => {
      prismaMock.gamificationRedemption.findUnique.mockResolvedValue(null);

      await expect(service.updateRedemptionStatus('nonexistent', 'approved'))
        .rejects.toThrow(NotFoundException);
    });

    it('should update redemption status', async () => {
      prismaMock.gamificationRedemption.findUnique.mockResolvedValue({
        id: 'r-1',
        rewardId: 'reward-1',
        anggotaId: 'anggota-1',
        pointsSpent: 100,
        status: 'pending',
        notes: null,
        createdAt: new Date(),
        reward: { name: 'Test Reward', icon: '\ud83c\udf81' },
      });
      prismaMock.gamificationRedemption.update.mockResolvedValue({
        id: 'r-1',
        rewardId: 'reward-1',
        anggotaId: 'anggota-1',
        pointsSpent: 100,
        status: 'approved',
        notes: null,
        createdAt: new Date(),
        reward: { name: 'Test Reward', icon: '\ud83c\udf81' },
      });
      prismaMock.anggota.findUnique.mockResolvedValue({
        id: 'anggota-1',
        namaLengkap: 'Test Member',
      });

      const result = await service.updateRedemptionStatus('r-1', 'approved');

      expect(result.status).toBe('approved');
    });

    it('should send personal notification to member via email on status change', async () => {
      const testServiceModule: TestingModule = await Test.createTestingModule({
        providers: [
          RewardsService,
          { provide: require('../../prisma/prisma.service').PrismaService, useValue: prismaMock },
          { provide: require('../notifications/notifications.service').NotificationsService, useValue: { send: jest.fn() } },
        ],
      }).compile();
      const testService = testServiceModule.get<RewardsService>(RewardsService);

      prismaMock.gamificationRedemption.findUnique.mockResolvedValue({
        id: 'r-1',
        rewardId: 'reward-1',
        anggotaId: 'anggota-1',
        pointsSpent: 100,
        status: 'pending',
        notes: null,
        createdAt: new Date(),
        reward: { name: 'Test Reward', icon: '\ud83c\udf81' },
      });
      prismaMock.gamificationRedemption.update.mockResolvedValue({
        id: 'r-1',
        rewardId: 'reward-1',
        anggotaId: 'anggota-1',
        pointsSpent: 100,
        status: 'approved',
        notes: 'Selamat!',
        createdAt: new Date(),
        reward: { name: 'Test Reward', icon: '\ud83c\udf81' },
      });
      // First anggota findUnique for namaLengkap
      prismaMock.anggota.findUnique.mockResolvedValueOnce({
        id: 'anggota-1',
        namaLengkap: 'Test Member',
      });
      // Second anggota findUnique for rantingId + email (inside sendRedemptionNotification)
      prismaMock.anggota.findUnique.mockResolvedValueOnce({
        id: 'anggota-1',
        namaLengkap: 'Test Member',
        rantingId: 'ranting-1',
        email: 'member@test.com',
      });
      prismaMock.user.findMany.mockResolvedValue([{ id: 'admin-1' }]);
      prismaMock.user.findFirst.mockResolvedValue({ id: 'member-user-1' });

      await testService.updateRedemptionStatus('r-1', 'approved', 'Selamat!');

      expect(prismaMock.user.findFirst).toHaveBeenCalledWith({
        where: { email: 'member@test.com', isActive: true },
        select: { id: true },
      });
    });
  });
});
