import { Test, TestingModule } from '@nestjs/testing';
import { GamificationService } from './gamification.service';
import { MailService } from '../../mail/mail.service';

/** Minimal Prisma mock — uses non-Once methods for findUnique since it's called multiple times */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prismaMock: any = {
  gamificationProfile: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
    findMany: jest.fn(),
  },
  gamificationBadge: {
    findMany: jest.fn(),
    createMany: jest.fn(),
    count: jest.fn(),
  },
  gamificationEvent: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  anggota: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  user: {
    findMany: jest.fn(),
  },
  $transaction: jest.fn(),
};

const notificationsServiceMock = {
  send: jest.fn(),
};

const mailServiceMock = {
  sendMail: jest.fn().mockResolvedValue(true),
};

const PROFILE_TEMPLATE = {
  id: 'profile-1',
  anggotaId: 'anggota-1',
  points: 0,
  latihanStreak: 0,
  iuranStreak: 0,
  lastActivity: new Date(),
};

function makeProfile(overrides: Partial<typeof PROFILE_TEMPLATE> = {}) {
  return { ...PROFILE_TEMPLATE, ...overrides };
}

describe('GamificationService', () => {
  let service: GamificationService;

  beforeEach(() => {
    jest.clearAllMocks();

    // Default: profile exists
    prismaMock.gamificationProfile.findUnique.mockResolvedValue(makeProfile());
    prismaMock.gamificationProfile.create.mockImplementation(({ data }: any) =>
      Promise.resolve(makeProfile({ anggotaId: data.anggotaId || 'anggota-1' })),
    );
    prismaMock.gamificationProfile.update.mockImplementation(({ where, data }: any) =>
      Promise.resolve(makeProfile({ id: where.id || 'profile-1', ...data })),
    );
    prismaMock.gamificationProfile.count.mockResolvedValue(0);
    prismaMock.gamificationProfile.aggregate.mockResolvedValue({ _sum: { points: 0 } });
    prismaMock.gamificationProfile.findMany.mockResolvedValue([]);
    prismaMock.gamificationBadge.findMany.mockResolvedValue([]);
    prismaMock.gamificationBadge.createMany.mockResolvedValue({ count: 0 });
    prismaMock.gamificationBadge.count.mockResolvedValue(0);
    prismaMock.gamificationEvent.create.mockResolvedValue({});
    prismaMock.gamificationEvent.findMany.mockResolvedValue([]);
    prismaMock.gamificationEvent.count.mockResolvedValue(0);
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GamificationService,
        { provide: require('../../prisma/prisma.service').PrismaService, useValue: prismaMock },
        { provide: require('../notifications/notifications.service').NotificationsService, useValue: notificationsServiceMock },
        { provide: MailService, useValue: mailServiceMock },
      ],
    }).compile();

    service = module.get<GamificationService>(GamificationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAllBadges', () => {
    it('should return all 10 badges', () => {
      const badges = service.getAllBadges();
      expect(badges).toHaveLength(10);
      expect(badges.map((b) => b.id)).toContain('latihan_5');
      expect(badges.map((b) => b.id)).toContain('keaktifan_500');
    });
  });

  describe('addPoints', () => {
    it('should add points and create event', async () => {
      prismaMock.gamificationProfile.update.mockResolvedValueOnce(
        makeProfile({ points: 50 }),
      );

      const result = await service.addPoints('anggota-1', 'manual', 50, 'Bonus poin');

      expect(result.profile.points).toBe(50);
      expect(result.profile.anggotaId).toBe('anggota-1');
      expect(prismaMock.gamificationEvent.create).toHaveBeenCalled();
    });
  });

  describe('recordTraining', () => {
    it('should add 10 points and increment latihan streak', async () => {
      // getOrCreate finds existing profile with streak 0
      prismaMock.gamificationProfile.findUnique.mockResolvedValue(makeProfile());
      // streak update returns streak 1
      prismaMock.gamificationProfile.update.mockResolvedValueOnce(
        makeProfile({ latihanStreak: 1 }),
      );
      // addPoints → getOrCreate, then update points
      prismaMock.gamificationProfile.update.mockResolvedValueOnce(
        makeProfile({ points: 10, latihanStreak: 1 }),
      );

      const result = await service.recordTraining('anggota-1');

      expect(result.profile.points).toBe(10);
      expect(result.profile.streaks.latihan).toBe(1);
    });

    it('should award badge at threshold (5 latihan)', async () => {
      // Pre-existing profile with 4 latihan streak
      prismaMock.gamificationProfile.findUnique.mockResolvedValue(
        makeProfile({ latihanStreak: 4, points: 40 }),
      );
      // streak update: 4→5
      prismaMock.gamificationProfile.update.mockResolvedValueOnce(
        makeProfile({ latihanStreak: 5, points: 40 }),
      );
      // points update inside addPoints
      prismaMock.gamificationProfile.update.mockResolvedValueOnce(
        makeProfile({ points: 50, latihanStreak: 5 }),
      );

      const result = await service.recordTraining('anggota-1');

      expect(result.profile.streaks.latihan).toBe(5);
      // Badge should be earned via streak check
      const badgeIds = result.newBadges.map((b) => b.id);
      expect(badgeIds).toContain('latihan_5');
    });
  });

  describe('recordDuesPayment', () => {
    it('should add 20 points on-time and increment iuran streak', async () => {
      prismaMock.gamificationProfile.findUnique.mockResolvedValue(makeProfile());
      // streak increment
      prismaMock.gamificationProfile.update.mockResolvedValueOnce(
        makeProfile({ iuranStreak: 1 }),
      );
      // addPoints → update
      prismaMock.gamificationProfile.update.mockResolvedValueOnce(
        makeProfile({ points: 20, iuranStreak: 1 }),
      );
      // badge check → findUnique for updated profile
      prismaMock.gamificationProfile.findUnique.mockResolvedValue(
        makeProfile({ iuranStreak: 1, points: 20 }),
      );

      const result = await service.recordDuesPayment('anggota-1', true);

      expect(result.profile.points).toBe(20);
      expect(result.profile.streaks.iuran).toBe(1);
    });

    it('should reset iuran streak on late payment', async () => {
      prismaMock.gamificationProfile.findUnique.mockResolvedValue(
        makeProfile({ iuranStreak: 3 }),
      );
      // streak reset to 0
      prismaMock.gamificationProfile.update.mockResolvedValueOnce(
        makeProfile({ iuranStreak: 0 }),
      );
      // addPoints → update
      prismaMock.gamificationProfile.update.mockResolvedValueOnce(
        makeProfile({ points: 5, iuranStreak: 0 }),
      );
      // badge check → findUnique
      prismaMock.gamificationProfile.findUnique.mockResolvedValue(
        makeProfile({ iuranStreak: 0, points: 5 }),
      );

      const result = await service.recordDuesPayment('anggota-1', false);

      expect(result.profile.points).toBe(5);
      expect(result.profile.streaks.iuran).toBe(0);
    });
  });

  describe('getLeaderboard', () => {
    it('should return members sorted by points desc', async () => {
      prismaMock.gamificationProfile.findMany.mockResolvedValue([
        { anggotaId: 'a-1', points: 200, latihanStreak: 10, iuranStreak: 5, lastActivity: new Date(), badges: [] },
        { anggotaId: 'a-2', points: 150, latihanStreak: 8, iuranStreak: 3, lastActivity: new Date(), badges: [] },
        { anggotaId: 'a-3', points: 100, latihanStreak: 5, iuranStreak: 2, lastActivity: new Date(), badges: [] },
      ]);

      const leaderboard = await service.getLeaderboard(3);

      expect(leaderboard).toHaveLength(3);
      expect(leaderboard[0].points).toBe(200);
      expect(leaderboard[1].points).toBe(150);
      expect(leaderboard[2].points).toBe(100);
    });

    it('should filter by search query', async () => {
      prismaMock.gamificationProfile.findMany.mockResolvedValue([
        { anggotaId: 'a-1', points: 200, latihanStreak: 10, iuranStreak: 5, lastActivity: new Date(), badges: [] },
      ]);

      const leaderboard = await service.getLeaderboard(10, undefined, 'Test Member');

      expect(leaderboard).toHaveLength(1);
      expect(prismaMock.gamificationProfile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            anggota: expect.objectContaining({
              namaLengkap: { contains: 'Test Member', mode: 'insensitive' },
            }),
          }),
        }),
      );
    });

    it('should support skip/offset pagination', async () => {
      prismaMock.gamificationProfile.findMany.mockResolvedValue([
        { anggotaId: 'a-1', points: 200, latihanStreak: 10, iuranStreak: 5, lastActivity: new Date(), badges: [] },
      ]);

      const leaderboard = await service.getLeaderboard(10, undefined, undefined, 5);

      expect(leaderboard).toHaveLength(1);
      expect(prismaMock.gamificationProfile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 5, take: 10 }),
      );
    });

    it('should merge search with scope filter', async () => {
      prismaMock.gamificationProfile.findMany.mockResolvedValue([]);

      await service.getLeaderboard(10, { rantingId: 'ranting-1' }, 'Anggota');

      expect(prismaMock.gamificationProfile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            anggota: expect.objectContaining({
              rantingId: 'ranting-1',
              namaLengkap: { contains: 'Anggota', mode: 'insensitive' },
            }),
          }),
        }),
      );
    });
  });

  describe('getRecentEvents', () => {
    it('should return empty array when no profile exists', async () => {
      prismaMock.gamificationProfile.findUnique.mockResolvedValue(null);

      const events = await service.getRecentEvents('nonexistent');

      expect(events).toEqual([]);
    });
  });

  describe('getStats', () => {
    it('should return aggregated stats', async () => {
      prismaMock.gamificationProfile.count.mockResolvedValue(50);
      prismaMock.gamificationEvent.count.mockResolvedValue(1200);
      prismaMock.gamificationProfile.aggregate.mockResolvedValue({ _sum: { points: 25000 } });
      prismaMock.gamificationBadge.count.mockResolvedValue(120);

      const stats = await service.getStats();

      expect(stats.totalMembers).toBe(50);
      expect(stats.totalEvents).toBe(1200);
      expect(stats.totalPointsAwarded).toBe(25000);
      expect(stats.badgesAwarded).toBe(120);
    });
  });
});
