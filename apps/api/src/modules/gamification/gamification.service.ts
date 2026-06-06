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
  level: { name: string; icon: string; color: string };
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

/** Member level definitions based on total points */
const LEVELS = [
  { name: 'Bronze', minPoints: 0, icon: '🥉', color: '#cd7f32' },
  { name: 'Silver', minPoints: 100, icon: '🥈', color: '#c0c0c0' },
  { name: 'Gold', minPoints: 300, icon: '🥇', color: '#ffd700' },
  { name: 'Platinum', minPoints: 500, icon: '💎', color: '#e5e4e2' },
  { name: 'Diamond', minPoints: 1000, icon: '🔥', color: '#b9f2ff' },
];

function getLevel(points: number): { name: string; icon: string; color: string } {
  let level = LEVELS[0];
  for (const l of LEVELS) {
    if (points >= l.minPoints) level = l;
  }
  return level;
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

    // Calculate old level for level-up detection
    const oldLevel = getLevel(profile.points);

    // Add points
    const updatedProfile = await this.prisma.gamificationProfile.update({
      where: { id: profile.id },
      data: {
        points: profile.points + points,
        lastActivity: new Date(),
      },
    });

    // Send level-up notification if level changed
    const newLevel = getLevel(updatedProfile.points);
    if (newLevel.name !== oldLevel.name) {
      await this.sendLevelUpNotification(anggotaId, oldLevel, newLevel);
    }

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
        level: getLevel(updatedProfile.points),
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
      level: getLevel(profile.points),
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

  /** Send level-up notification when a member reaches a new tier */
  private async sendLevelUpNotification(
    anggotaId: string,
    oldLevel: { name: string; icon: string },
    newLevel: { name: string; icon: string },
  ): Promise<void> {
    try {
      const anggota = await this.prisma.anggota.findUnique({
        where: { id: anggotaId },
        select: { namaLengkap: true, rantingId: true },
      });
      if (!anggota) return;

      const users = await this.prisma.user.findMany({
        where: { rantingId: anggota.rantingId, isActive: true },
        select: { id: true },
      });

      for (const user of users) {
        await this.notificationsService.send(user.id, {
          userId: user.id,
          judul: `${newLevel.icon} Level Up! ${anggota.namaLengkap} naik ke ${newLevel.name}`,
          isi: `${anggota.namaLengkap} naik level dari ${oldLevel.icon} ${oldLevel.name} ke ${newLevel.icon} ${newLevel.name}!`,
          tipe: 'badge_earned',
          data: { anggotaId, oldLevel: oldLevel.name, newLevel: newLevel.name, type: 'level_up' },
        });
      }
    } catch (error) {
      console.warn('Failed to send level-up notification:', (error as Error).message);
    }
  }

  /** Send badge earned notifications to users in the same ranting */
  private async sendBadgeNotifications(
    anggotaId: string,
    badges: Array<{ name: string; description: string; icon: string }>,
  ): Promise<void> {
    try {
      // Get the anggota's rantingId and email
      const anggota = await this.prisma.anggota.findUnique({
        where: { id: anggotaId },
        select: { namaLengkap: true, rantingId: true, email: true },
      });
      if (!anggota) return;

      // Find users in the same ranting
      const users = await this.prisma.user.findMany({
        where: { rantingId: anggota.rantingId, isActive: true },
        select: { id: true },
      });

      // Send notification to each user in the ranting
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

      // Also send personal notification to the member who earned the badge
      if (anggota.email) {
        const memberUser = await this.prisma.user.findFirst({
          where: { email: anggota.email, isActive: true },
          select: { id: true },
        });
        if (memberUser) {
          for (const badge of badges) {
            await this.notificationsService.send(memberUser.id, {
              userId: memberUser.id,
              judul: `${badge.icon} Badge Baru Diraih!`,
              isi: `Selamat! Anda mendapatkan badge "${badge.name}" — ${badge.description}`,
              tipe: 'badge_earned',
              data: { anggotaId, badge: badge.name, type: 'badge_earned_personal' },
            });
          }
        }
      }
    } catch (error) {
      console.warn('Failed to send badge notification:', (error as Error).message);
    }
  }

  /** Get leaderboard — top members by points */
  async getLeaderboard(limit: number = 10, scope?: { rantingId?: string; wilayahId?: string; distrikId?: string }, search?: string, skip?: number): Promise<GamificationProfile[]> {
    const where: Record<string, unknown> = {};

    if (scope?.rantingId) {
      where.anggota = { rantingId: scope.rantingId };
    } else if (scope?.wilayahId) {
      where.anggota = { ranting: { wilayahId: scope.wilayahId } };
    } else if (scope?.distrikId) {
      where.anggota = { ranting: { wilayah: { distrikId: scope.distrikId } } };
    }

    // Add search filter for member name
    if (search?.trim()) {
      const anggotaFilter: Record<string, unknown> = { namaLengkap: { contains: search.trim(), mode: 'insensitive' } };
      if (where.anggota) {
        // Merge with existing scope filter
        where.anggota = { ...(where.anggota as Record<string, unknown>), ...anggotaFilter };
      } else {
        where.anggota = anggotaFilter;
      }
    }

    const profiles = await this.prisma.gamificationProfile.findMany({
      where,
      orderBy: { points: 'desc' },
      skip: skip || 0,
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
      level: getLevel(p.points),
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

  /** Get points history aggregated by month for a member */
  async getPointsHistory(anggotaId: string): Promise<Array<{ month: string; points: number; cumulative: number; count: number }>> {
    const profile = await this.prisma.gamificationProfile.findUnique({
      where: { anggotaId },
    });
    if (!profile) return [];

    const events = await this.prisma.gamificationEvent.findMany({
      where: { profileId: profile.id },
      orderBy: { timestamp: 'asc' },
      select: { points: true, timestamp: true },
    });

    // Aggregate by month
    const monthlyMap = new Map<string, { points: number; count: number }>();
    for (const event of events) {
      const key = event.timestamp.toISOString().slice(0, 7); // YYYY-MM
      const existing = monthlyMap.get(key) || { points: 0, count: 0 };
      existing.points += event.points;
      existing.count += 1;
      monthlyMap.set(key, existing);
    }

    // Build cumulative points over time
    let cumulative = 0;
    const result: Array<{ month: string; points: number; cumulative: number; count: number }> = [];
    const sortedKeys = [...monthlyMap.keys()].sort();
    for (const key of sortedKeys) {
      const data = monthlyMap.get(key)!;
      cumulative += data.points;
      result.push({ month: key, points: data.points, cumulative, count: data.count });
    }

    return result;
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

  /** Get points report — top earners for a period with CSV-friendly format */
  async getPointsReport(period: 'weekly' | 'monthly' = 'monthly', limit: number = 20): Promise<Array<{ rank: number; namaLengkap: string; points: number; level: string; events: number; lastActive: string }>> {
    const now = new Date();
    let since: Date;
    if (period === 'weekly') {
      since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else {
      since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get events in period grouped by anggotaId
    const events = await this.prisma.gamificationEvent.findMany({
      where: { timestamp: { gte: since } },
      select: { anggotaId: true, points: true },
    });

    // Aggregate points per member
    const memberMap = new Map<string, { points: number; events: number }>();
    for (const e of events) {
      const existing = memberMap.get(e.anggotaId) || { points: 0, events: 0 };
      existing.points += e.points;
      existing.events += 1;
      memberMap.set(e.anggotaId, existing);
    }

    // Get member names and profiles
    const anggotaIds = [...memberMap.keys()];
    const anggotas = await this.prisma.anggota.findMany({
      where: { id: { in: anggotaIds } },
      select: { id: true, namaLengkap: true },
    });
    const namaMap = new Map(anggotas.map((a) => [a.id, a.namaLengkap]));

    const profiles = await this.prisma.gamificationProfile.findMany({
      where: { anggotaId: { in: anggotaIds } },
      select: { anggotaId: true, points: true, lastActivity: true },
    });
    const profileMap = new Map(profiles.map((p) => [p.anggotaId, p]));

    // Build result sorted by points earned in period
    const result = [...memberMap.entries()]
      .map(([anggotaId, data]) => {
        const profile = profileMap.get(anggotaId);
        return {
          rank: 0,
          namaLengkap: namaMap.get(anggotaId) || anggotaId,
          points: data.points,
          level: getLevel(profile?.points ?? 0).name,
          events: data.events,
          lastActive: profile?.lastActivity?.toISOString() ?? '',
        };
      })
      .sort((a, b) => b.points - a.points)
      .slice(0, limit)
      .map((item, i) => ({ ...item, rank: i + 1 }));

    return result;
  }

  /** Get points distribution — how many members are at each level */
  async getPointsDistribution(): Promise<Array<{ level: string; icon: string; color: string; count: number }>> {
    const profiles = await this.prisma.gamificationProfile.findMany({
      select: { points: true },
    });

    const distribution = new Map<string, { icon: string; color: string; count: number }>();
    for (const l of LEVELS) {
      distribution.set(l.name, { icon: l.icon, color: l.color, count: 0 });
    }

    for (const p of profiles) {
      const level = getLevel(p.points);
      const entry = distribution.get(level.name);
      if (entry) entry.count++;
    }

    return LEVELS.map((l) => ({
      level: l.name,
      icon: l.icon,
      color: l.color,
      count: distribution.get(l.name)?.count ?? 0,
    }));
  }

  /** Get top reward redemptions with member info */
  async getTopRedemptions(limit: number = 10): Promise<Array<{ id: string; rewardName: string; rewardIcon: string; namaLengkap: string; pointsSpent: number; status: string; createdAt: string }>> {
    const redemptions = await this.prisma.gamificationRedemption.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        reward: { select: { name: true, icon: true } },
        anggota: { select: { namaLengkap: true } },
      },
    });

    return redemptions.map((r) => ({
      id: r.id,
      rewardName: r.reward.name,
      rewardIcon: r.reward.icon,
      namaLengkap: r.anggota.namaLengkap,
      pointsSpent: r.pointsSpent,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  /** Get gamification configuration settings */
  async getConfig(): Promise<Record<string, unknown>> {
    const settings = await this.prisma.setting.findMany({
      where: { key: { startsWith: 'gamification_' } },
    });
    const config: Record<string, unknown> = {};
    for (const s of settings) {
      config[s.key.replace('gamification_', '')] = s.value;
    }
    return config;
  }

  /** Get sync config — returns config + timestamp for mobile auto-sync */
  async getSyncConfig(): Promise<{ config: Record<string, unknown>; syncTimestamp: string }> {
    const config = await this.getConfig();
    return { config, syncTimestamp: new Date().toISOString() };
  }

  /** Update gamification configuration settings */
  async updateConfig(data: Record<string, unknown>): Promise<void> {
    for (const [key, value] of Object.entries(data)) {
      await this.prisma.setting.upsert({
        where: { key: `gamification_${key}` },
        update: { value: value as never },
        create: { key: `gamification_${key}`, value: value as never },
      });
    }

    // Auto-sync: send notification to admin users about config change
    try {
      const adminUsers = await this.prisma.user.findMany({
        where: {
          isActive: true,
          role: { in: ['superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting'] },
        },
        select: { id: true, namaLengkap: true },
      });

      for (const user of adminUsers) {
        await this.notificationsService.send(user.id, {
          userId: user.id,
          judul: 'Konfigurasi Gamifikasi Diperbarui',
          isi: `${Object.keys(data).length} pengaturan gamifikasi telah diperbarui oleh admin.`,
          tipe: 'umum',
          data: { type: 'config_updated', updatedKeys: Object.keys(data) },
        });
      }
    } catch (error) {
      console.warn('Failed to send config update notification:', (error as Error).message);
    }
  }

  /** Get weekly summary for a member */
  async getWeeklySummary(anggotaId: string): Promise<{
    pointsEarned: number;
    events: number;
    badgesEarned: number;
    level: string;
    currentPoints: number;
    periodStart: string;
    periodEnd: string;
  }> {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const profile = await this.prisma.gamificationProfile.findUnique({
      where: { anggotaId },
    });

    const events = await this.prisma.gamificationEvent.findMany({
      where: {
        anggotaId,
        timestamp: { gte: weekAgo },
      },
      select: { points: true },
    });

    const pointsEarned = events.reduce((sum, e) => sum + e.points, 0);

    const badges = await this.prisma.gamificationBadge.findMany({
      where: {
        profileId: profile?.id ?? '',
        earnedAt: { gte: weekAgo },
      },
    });

    return {
      pointsEarned,
      events: events.length,
      badgesEarned: badges.length,
      level: getLevel(profile?.points ?? 0).name,
      currentPoints: profile?.points ?? 0,
      periodStart: weekAgo.toISOString(),
      periodEnd: now.toISOString(),
    };
  }

  /** Send weekly summary notification to a member via email matching */
  async sendWeeklySummaryNotification(anggotaId: string): Promise<{ sent: boolean; summary: unknown }> {
    const summary = await this.getWeeklySummary(anggotaId);
    let sent = false;

    try {
      const anggota = await this.prisma.anggota.findUnique({
        where: { id: anggotaId },
        select: { email: true, namaLengkap: true },
      });

      if (anggota?.email) {
        const user = await this.prisma.user.findFirst({
          where: { email: anggota.email, isActive: true },
          select: { id: true },
        });

        if (user) {
          await this.notificationsService.send(user.id, {
            userId: user.id,
            judul: `📊 Ringkasan Mingguan Gamifikasi`,
            isi: `Minggu ini: +${summary.pointsEarned} poin dari ${summary.events} aktivitas, ${summary.badgesEarned} badge baru. Level ${summary.level} (${summary.currentPoints} total poin)`,
            tipe: 'badge_earned' as never,
            data: { anggotaId, type: 'weekly_summary', ...summary },
          });
          sent = true;
        }
      }
    } catch (error) {
      console.warn('Failed to send weekly summary notification:', (error as Error).message);
    }

    return { sent, summary };
  }

  /** Get scoreboard breakdown — real points aggregated by event type per period */
  async getScoreboardBreakdown(period: 'all' | 'weekly' | 'monthly' = 'all'): Promise<Array<{ module: string; label: string; points: number; percentage: number; color: string }>> {
    const now = new Date();
    let since: Date | undefined;
    if (period === 'weekly') since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    else if (period === 'monthly') since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const where: Record<string, unknown> = {};
    if (since) where.timestamp = { gte: since };

    const events = await this.prisma.gamificationEvent.findMany({
      where,
      select: { type: true, points: true },
    });

    const moduleMap = new Map<string, number>();
    for (const e of events) {
      moduleMap.set(e.type, (moduleMap.get(e.type) || 0) + e.points);
    }

    const moduleConfig: Record<string, { label: string; color: string }> = {
      training: { label: 'Latihan', color: '#3b82f6' },
      dues: { label: 'Iuran', color: '#22c55e' },
      badge: { label: 'Badge', color: '#a855f7' },
      achievement: { label: 'Prestasi', color: '#f59e0b' },
    };

    const totalPoints = events.reduce((sum, e) => sum + e.points, 0);
    const result: Array<{ module: string; label: string; points: number; percentage: number; color: string }> = [];

    for (const [type, config] of Object.entries(moduleConfig)) {
      const points = moduleMap.get(type) || 0;
      result.push({
        module: type,
        label: config.label,
        points,
        percentage: totalPoints > 0 ? Math.round((points / totalPoints) * 100) : 0,
        color: config.color,
      });
    }

    return result.sort((a, b) => b.points - a.points);
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
