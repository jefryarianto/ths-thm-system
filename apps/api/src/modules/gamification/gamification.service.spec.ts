import { Test, TestingModule } from '@nestjs/testing';
import { GamificationService } from './gamification.service';

describe('GamificationService', () => {
  let service: GamificationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GamificationService],
    }).compile();

    service = module.get<GamificationService>(GamificationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('addPoints', () => {
    it('should add points to a member', () => {
      const result = service.addPoints('a1', 'manual', 50, 'Manual award');
      expect(result.profile.points).toBe(50);
      expect(result.profile.anggotaId).toBe('a1');
    });

    it('should accumulate points', () => {
      service.addPoints('a1', 'manual', 30, 'First');
      const result = service.addPoints('a1', 'manual', 20, 'Second');
      expect(result.profile.points).toBe(50);
    });

    it('should return new badges when threshold reached', () => {
      const result = service.addPoints('a1', 'manual', 500, 'Big award');
      expect(result.profile.points).toBe(500);
      expect(result.newBadges.some((b) => b.id === 'keaktifan_500')).toBe(true);
    });

    it('should not return already earned badges', () => {
      service.addPoints('a1', 'manual', 500, 'Big award');
      const result = service.addPoints('a1', 'manual', 100, 'More');
      expect(result.newBadges.filter((b) => b.id === 'keaktifan_500')).toHaveLength(0);
    });
  });

  describe('recordTraining', () => {
    it('should add 10 points and increment streak', () => {
      const result = service.recordTraining('a1');
      expect(result.profile.points).toBe(10);
      expect(result.profile.streaks.latihan).toBe(1);
    });

    it('should award training badges at thresholds', () => {
      for (let i = 0; i < 5; i++) service.recordTraining('a1');
      const profile = service.getProfile('a1');
      expect(profile.badges).toContain('latihan_5');
    });
  });

  describe('recordDuesPayment', () => {
    it('should add 20 points for on-time payment', () => {
      const result = service.recordDuesPayment('a1', true);
      expect(result.profile.points).toBe(20);
      expect(result.profile.streaks.iuran).toBe(1);
    });

    it('should add 5 points and reset streak for late payment', () => {
      service.recordDuesPayment('a1', true);
      service.recordDuesPayment('a1', true);
      const result = service.recordDuesPayment('a1', false);
      expect(result.profile.points).toBe(45);
      expect(result.profile.streaks.iuran).toBe(0);
    });

    it('should award iuran badges at streak thresholds', () => {
      for (let i = 0; i < 3; i++) service.recordDuesPayment('a1', true);
      const profile = service.getProfile('a1');
      expect(profile.badges).toContain('iuran_3');
    });
  });

  describe('getLeaderboard', () => {
    it('should return top members sorted by points', () => {
      service.addPoints('a1', 'manual', 100, '');
      service.addPoints('a2', 'manual', 200, '');
      service.addPoints('a3', 'manual', 150, '');

      const leaderboard = service.getLeaderboard(2);
      expect(leaderboard).toHaveLength(2);
      expect(leaderboard[0].anggotaId).toBe('a2');
      expect(leaderboard[1].anggotaId).toBe('a3');
    });
  });

  describe('getAllBadges', () => {
    it('should return all available badges', () => {
      const badges = service.getAllBadges();
      expect(badges.length).toBeGreaterThan(0);
      expect(badges.every((b) => b.id && b.name && b.icon)).toBe(true);
    });
  });

  describe('getRecentEvents', () => {
    it('should return recent events for a member', () => {
      service.addPoints('a1', 'training', 10, 'Latihan 1');
      service.addPoints('a1', 'training', 10, 'Latihan 2');
      service.addPoints('a2', 'training', 10, 'Other member');

      const events = service.getRecentEvents('a1');
      expect(events).toHaveLength(2);
      expect(events.every((e) => e.anggotaId === 'a1')).toBe(true);
    });
  });

  describe('getStats', () => {
    it('should return correct stats', () => {
      service.addPoints('a1', 'manual', 100, '');
      service.addPoints('a2', 'manual', 200, '');

      const stats = service.getStats();
      expect(stats.totalMembers).toBe(2);
      expect(stats.totalEvents).toBe(2);
      expect(stats.totalPointsAwarded).toBe(300);
    });
  });
});
