import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

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
  namaLengkap?: string;
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
  namaLengkap?: string;
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
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
  ) {}

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

      // Send badge notifications
      await this.sendBadgeNotifications(anggotaId, badgesToAward);
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

    // Get member name
    const anggota = await this.prisma.anggota.findUnique({
      where: { id: anggotaId },
      select: { namaLengkap: true },
    });

    return {
      anggotaId,
      namaLengkap: anggota?.namaLengkap ?? undefined,
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

  /** Send badge earned notifications to users in the same ranting */
  private async sendBadgeNotifications(
    anggotaId: string,
    badges: Array<{ name: string; description: string; icon: string }>,
  ): Promise<void> {
    try {
      // Get the anggota's rantingId
      const anggota = await this.prisma.anggota.findUnique({
        where: { id: anggotaId },
        select: { namaLengkap: true, rantingId: true },
      });
      if (!anggota) return;

      // Find users in the same ranting
      const users = await this.prisma.user.findMany({
        where: { rantingId: anggota.rantingId, isActive: true },
        select: { id: true },
      });

      // Send notification to each user
      for (const user of users) {
        for (const badge of badges) {
          await this.notificationsService.send(user.id, {
            userId: user.id,
            judul: `${badge.icon} Badge Baru!`,
            isi: `${anggota.namaLengkap} mendapatkan badge "${badge.name}" — ${badge.description}`,
            tipe: 'badge_earned',
            data: { anggotaId, badge: badge.name, type: 'badge_earned' },
          });
        }
      }
    } catch (error) {
      console.warn('Failed to send badge notification:', (error as Error).message);
    }
  }

  /** Get leaderboard — top members by points */
  async getLeaderboard(limit: number = 10, scope?: { rantingId?: string; wilayahId?: string; distrikId?: string }): Promise<GamificationProfile[]> {
    const where: Record<string, unknown> = {};

    if (scope?.rantingId) {
      where.anggota = { rantingId: scope.rantingId };
    } else if (scope?.wilayahId) {
      where.anggota = { ranting: { wilayahId: scope.wilayahId } };
    } else if (scope?.distrikId) {
      where.anggota = { ranting: { wilayah: { distrikId: scope.distrikId } } };
    }

    const profiles = await this.prisma.gamificationProfile.findMany({
      where,
      orderBy: { points: 'desc' },
      take: limit,
      include: {
        badges: { select: { badgeId: true } },
        anggota: { select: { namaLengkap: true, rantingId: true } },
      },
    });

    return profiles.map((p) => ({
      anggotaId: p.anggotaId,
      namaLengkap: p.anggota?.namaLengkap ?? undefined,
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

    // Get member names for each event
    const anggotaIds = [...new Set(events.map((e) => e.anggotaId))];
    const anggotas = await this.prisma.anggota.findMany({
      where: { id: { in: anggotaIds } },
      select: { id: true, namaLengkap: true },
    });
    const namaMap = new Map(anggotas.map((a) => [a.id, a.namaLengkap]));

    return events.map((e) => ({
      id: e.id,
      anggotaId: e.anggotaId,
      namaLengkap: namaMap.get(e.anggotaId) ?? undefined,
      type: e.type,
      points: e.points,
      description: e.description,
      timestamp: e.timestamp.toISOString(),
    }));
  }

  /** Get recent point events across all members */
  async getGlobalRecentEvents(limit: number = 20): Promise<PointEvent[]> {
    const events = await this.prisma.gamificationEvent.findMany({
      orderBy: { timestamp: 'desc' },
      take: limit,
      include: {
        anggota: { select: { namaLengkap: true } },
      },
    });

    return events.map((e) => ({
      id: e.id,
      anggotaId: e.anggotaId,
      namaLengkap: e.anggota?.namaLengkap ?? undefined,
      type: e.type,
      points: e.points,
      description: e.description,
      timestamp: e.timestamp.toISOString(),
    }));
  }

  /** Get organization structure for filter dropdowns */
  async getOrgStructure(): Promise<Array<{ id: string; nama: string; wilayahs: Array<{ id: string; nama: string; rantings: Array<{ id: string; nama: string }> }> }>> {
    const distriks = await this.prisma.distrik.findMany({
      include: {
        wilayahs: {
          include: {
            rantings: { select: { id: true, nama: true } },
          },
        },
      },
      orderBy: { nama: 'asc' },
    });

    return distriks.map((d) => ({
      id: d.id,
      nama: d.nama,
      wilayahs: d.wilayahs.map((w) => ({
        id: w.id,
        nama: w.nama,
        rantings: w.rantings.map((r) => ({ id: r.id, nama: r.nama })),
      })),
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
