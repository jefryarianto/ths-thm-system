import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Badge definition.
 */
export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  threshold: number;
  category: 'latihan' | 'iuran' | 'prestasi' | 'keaktifan';
}

/**
 * Member gamification profile (API response shape).
 */
export interface GamificationProfile {
  anggotaId: string;
  points: number;
  badges: string[];
  streaks: {
    latihan: number;
    iuran: number;
  };
  lastActivity: string;
}

/**
 * Point event for tracking.
 */
export interface PointEvent {
  id: string;
  anggotaId: string;
  type: string;
  points: number;
  description: string;
  timestamp: string;
}

/** All available badges */
const BADGES: Badge[] = [
  { id: 'latihan_5', name: 'Pemula Latihan', description: 'Mengikuti 5 latihan', icon: '🥋', threshold: 5, category: 'latihan' },
  { id: 'latihan_20', name: 'Aktif Latihan', description: 'Mengikuti 20 latihan', icon: '💪', threshold: 20, category: 'latihan' },
  { id: 'latihan_50', name: 'Master Latihan', description: 'Mengikuti 50 latihan', icon: '🏆', threshold: 50, category: 'latihan' },
  { id: 'iuran_3', name: 'Tepat Waktu', description: 'Bayar iuran 3 bulan berturut-turut', icon: '⏰', threshold: 3, category: 'iuran' },
  { id: 'iuran_6', name: 'Disiplin', description: 'Bayar iuran 6 bulan berturut-turut', icon: '⭐', threshold: 6, category: 'iuran' },
  { id: 'iuran_12', name: 'Setia', description: 'Bayar iuran 12 bulan berturut-turut', icon: '👑', threshold: 12, category: 'iuran' },
  { id: 'prestasi_1', name: 'Berprestasi', description: 'Memiliki 1 sertifikat', icon: '🎓', threshold: 1, category: 'prestasi' },
  { id: 'prestasi_3', name: 'Juara', description: 'Memiliki 3 sertifikat', icon: '🥇', threshold: 3, category: 'prestasi' },
  { id: 'keaktifan_100', name: 'Angel Points', description: 'Mengumpulkan 100 poin', icon: '😈', threshold: 100, category: 'keaktifan' },
  { id: 'keaktifan_500', name: 'Legend', description: 'Mengumpulkan 500 poin', icon: '🔥', threshold: 500, category: 'keaktifan' },
];

/**
 * Database-backed gamification service.
 *
 * Tracks points, badges, and streaks for members via PostgreSQL.
 * Points are earned through training attendance, on-time dues payments, and achievements.
 */
@Injectable()
export class GamificationService {
  constructor(private readonly prisma: PrismaService) {}

  /** Get or create a member's gamification profile */
  private async getOrCreate(anggotaId: string) {
    let profile = await this.prisma.gamificationProfile.findUnique({
      where: { anggotaId },
    });

    if (!profile) {
      profile = await this.prisma.gamificationProfile.create({
        data: {
          anggotaId,
          points: 0,
          latihanStreak: 0,
          iuranStreak: 0,
        },
      });
    }

    return profile;
  }

  /** Add points to a member and check for new badges */
  async addPoints(
    anggotaId: string,
    type: string,
    points: number,
    description: string,
  ): Promise<{ profile: GamificationProfile; newBadges: Badge[] }> {
    const profile = await this.getOrCreate(anggotaId);

    // Get existing badge IDs
    const existingBadges = await this.prisma.gamificationBadge.findMany({
      where: { profileId: profile.id },
      select: { badgeId: true },
    });
    const existingBadgeIds = new Set(existingBadges.map((b) => b.badgeId));

    // Add points
    const updatedProfile = await this.prisma.gamificationProfile.update({
      where: { id: profile.id },
      data: {
        points: profile.points + points,
        lastActivity: new Date(),
      },
    });

    // Record event
    await this.prisma.gamificationEvent.create({
      data: {
        profileId: profile.id,
        anggotaId,
        type,
        points,
        description,
      },
    });

    // Check for new badges
    const newBadges: Badge[] = [];
    const badgesToAward: Array<{ badgeId: string; name: string; description: string; icon: string; category: string }> = [];

    for (const badge of BADGES) {
      if (existingBadgeIds.has(badge.id)) continue;

      let earned = false;
      if (badge.category === 'keaktifan' && updatedProfile.points >= badge.threshold) {
        earned = true;
      }

      if (earned) {
        newBadges.push(badge);
        badgesToAward.push({
          badgeId: badge.id,
          name: badge.name,
          description: badge.description,
          icon: badge.icon,
          category: badge.category,
        });
      }
    }

    // Persist new badges
    if (badgesToAward.length > 0) {
      await this.prisma.gamificationBadge.createMany({
        data: badgesToAward.map((b) => ({
          profileId: profile.id,
          badgeId: b.badgeId,
          name: b.name,
          description: b.description,
          icon: b.icon,
          category: b.category,
        })),
      });
    }

    // Reload profile with all badges
    const fullBadges = await this.prisma.gamificationBadge.findMany({
      where: { profileId: profile.id },
      select: { badgeId: true },
    });

    return {
      profile: {
        anggotaId,
        points: updatedProfile.points,
        badges: fullBadges.map((b) => b.badgeId),
        streaks: {
          latihan: updatedProfile.latihanStreak,
          iuran: updatedProfile.iuranStreak,
        },
        lastActivity: updatedProfile.lastActivity.toISOString(),
      },
      newBadges,
    };
  }

  /** Award a training attendance point */
  async recordTraining(anggotaId: string): Promise<{ profile: GamificationProfile; newBadges: Badge[] }> {
    const profile = await this.getOrCreate(anggotaId);

    // Increment latihan streak
    const updatedProfile = await this.prisma.gamificationProfile.update({
      where: { id: profile.id },
      data: {
        latihanStreak: profile.latihanStreak + 1,
      },
    });

    const result = await this.addPoints(anggotaId, 'training', 10, 'Latihan rutin');

    // Check training streak badges
    const existingBadgeIds = new Set(result.profile.badges);
    const newStreakBadges: Badge[] = [];
    const badgesToAward: Array<{ badgeId: string; name: string; description: string; icon: string; category: string }> = [];

    for (const badge of BADGES) {
      if (badge.category !== 'latihan' || existingBadgeIds.has(badge.id)) continue;
      if (updatedProfile.latihanStreak >= badge.threshold) {
        newStreakBadges.push(badge);
        badgesToAward.push({
          badgeId: badge.id,
          name: badge.name,
          description: badge.description,
          icon: badge.icon,
          category: badge.category,
        });
      }
    }

    if (badgesToAward.length > 0) {
      await this.prisma.gamificationBadge.createMany({
        data: badgesToAward.map((b) => ({
          profileId: profile.id,
          badgeId: b.badgeId,
          name: b.name,
          description: b.description,
          icon: b.icon,
          category: b.category,
        })),
      });
    }

    // Reload final badges
    const allBadges = await this.prisma.gamificationBadge.findMany({
      where: { profileId: profile.id },
      select: { badgeId: true },
    });

    return {
      ...result,
      newBadges: [...result.newBadges, ...newStreakBadges],
      profile: {
        ...result.profile,
        badges: allBadges.map((b) => b.badgeId),
        streaks: {
          latihan: updatedProfile.latihanStreak,
          iuran: result.profile.streaks.iuran,
        },
      },
    };
  }

  /** Record an on-time dues payment */
  async recordDuesPayment(anggotaId: string, onTime: boolean): Promise<{ profile: GamificationProfile; newBadges: Badge[] }> {
    const profile = await this.getOrCreate(anggotaId);

    if (onTime) {
      await this.prisma.gamificationProfile.update({
        where: { id: profile.id },
        data: { iuranStreak: profile.iuranStreak + 1 },
      });
    } else {
      await this.prisma.gamificationProfile.update({
        where: { id: profile.id },
        data: { iuranStreak: 0 },
      });
    }

    const points = onTime ? 20 : 5;
    const result = await this.addPoints(anggotaId, 'dues', points, onTime ? 'Iuran tepat waktu' : 'Iuran terlambat');

    // Check iuran streak badges
    const existingBadgeIds = new Set(result.profile.badges);
    const newStreakBadges: Badge[] = [];
    const badgesToAward: Array<{ badgeId: string; name: string; description: string; icon: string; category: string }> = [];

    const updatedProfile = await this.prisma.gamificationProfile.findUnique({
      where: { anggotaId },
    });

    for (const badge of BADGES) {
      if (badge.category !== 'iuran' || existingBadgeIds.has(badge.id)) continue;
      if (updatedProfile && updatedProfile.iuranStreak >= badge.threshold) {
        newStreakBadges.push(badge);
        badgesToAward.push({
          badgeId: badge.id,
          name: badge.name,
          description: badge.description,
          icon: badge.icon,
          category: badge.category,
        });
      }
    }

    if (badgesToAward.length > 0) {
      await this.prisma.gamificationBadge.createMany({
        data: badgesToAward.map((b) => ({
          profileId: profile.id,
          badgeId: b.badgeId,
          name: b.name,
          description: b.description,
          icon: b.icon,
          category: b.category,
        })),
      });
    }

    // Reload final badges
    const allBadges = await this.prisma.gamificationBadge.findMany({
      where: { profileId: profile.id },
      select: { badgeId: true },
    });

    return {
      ...result,
      newBadges: [...result.newBadges, ...newStreakBadges],
      profile: {
        ...result.profile,
        badges: allBadges.map((b) => b.badgeId),
        streaks: {
          latihan: result.profile.streaks.latihan,
          iuran: updatedProfile?.iuranStreak ?? 0,
        },
      },
    };
  }

  /** Get a member's gamification profile */
  async getProfile(anggotaId: string): Promise<GamificationProfile> {
    const profile = await this.getOrCreate(anggotaId);
    const badges = await this.prisma.gamificationBadge.findMany({
      where: { profileId: profile.id },
      select: { badgeId: true },
    });

    return {
      anggotaId,
      points: profile.points,
      badges: badges.map((b) => b.badgeId),
      streaks: {
        latihan: profile.latihanStreak,
        iuran: profile.iuranStreak,
      },
      lastActivity: profile.lastActivity.toISOString(),
    };
  }

  /** Get all badges a member has earned with full details */
  async getBadges(anggotaId: string): Promise<Badge[]> {
    const profile = await this.getOrCreate(anggotaId);
    const earned = await this.prisma.gamificationBadge.findMany({
      where: { profileId: profile.id },
      select: { badgeId: true },
    });
    const earnedIds = new Set(earned.map((b) => b.badgeId));
    return BADGES.filter((b) => earnedIds.has(b.id));
  }

  /** Get all available badges */
  getAllBadges(): Badge[] {
    return [...BADGES];
  }

  /** Get leaderboard — top members by points */
  async getLeaderboard(limit: number = 10): Promise<GamificationProfile[]> {
    const profiles = await this.prisma.gamificationProfile.findMany({
      orderBy: { points: 'desc' },
      take: limit,
      include: { badges: { select: { badgeId: true } } },
    });

    return profiles.map((p) => ({
      anggotaId: p.anggotaId,
      points: p.points,
      badges: p.badges.map((b) => b.badgeId),
      streaks: {
        latihan: p.latihanStreak,
        iuran: p.iuranStreak,
      },
      lastActivity: p.lastActivity.toISOString(),
    }));
  }

  /** Get recent point events for a member */
  async getRecentEvents(anggotaId: string, limit: number = 20): Promise<PointEvent[]> {
    const profile = await this.prisma.gamificationProfile.findUnique({
      where: { anggotaId },
    });

    if (!profile) return [];

    const events = await this.prisma.gamificationEvent.findMany({
      where: { profileId: profile.id },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    return events.map((e) => ({
      id: e.id,
      anggotaId: e.anggotaId,
      type: e.type,
      points: e.points,
      description: e.description,
      timestamp: e.timestamp.toISOString(),
    }));
  }

  /** Get gamification stats */
  async getStats(): Promise<{ totalMembers: number; totalEvents: number; totalPointsAwarded: number; badgesAwarded: number }> {
    const [totalMembers, totalEvents, pointsAgg, badgesCount] = await Promise.all([
      this.prisma.gamificationProfile.count(),
      this.prisma.gamificationEvent.count(),
      this.prisma.gamificationProfile.aggregate({ _sum: { points: true } }),
      this.prisma.gamificationBadge.count(),
    ]);

    return {
      totalMembers,
      totalEvents,
      totalPointsAwarded: pointsAgg._sum.points ?? 0,
      badgesAwarded: badgesCount,
    };
  }
}
