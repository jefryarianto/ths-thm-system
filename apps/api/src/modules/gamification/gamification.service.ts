import { Injectable, Inject, forwardRef, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../mail/mail.service';
import { badgeEarnedEmail, levelUpEmail } from '../../mail/email-templates';
import { NotificationsService } from '../notifications/notifications.service';
import { CacheService } from '../../common/services/cache.service';
import {
  assertSelfMember,
  SelfScopeUser,
} from '../../common/utils/self-scope.helper';

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  threshold: number;
  category: 'latihan' | 'iuran' | 'prestasi' | 'keaktifan';
}

export interface GamificationProfile {
  anggotaId: string;
  namaLengkap?: string;
  points: number;
  level: { name: string; icon: string; color: string };
  badges: string[];
  streaks: { latihan: number; iuran: number };
  lastActivity: string;
}

export interface PointEvent {
  id: string;
  anggotaId: string;
  namaLengkap?: string;
  type: string;
  points: number;
  description: string;
  timestamp: string;
}

const DEFAULT_LEVELS = [
  { name: 'Bronze', minPoints: 0, icon: '🥉', color: '#cd7f32' },
  { name: 'Silver', minPoints: 100, icon: '🥈', color: '#c0c0c0' },
  { name: 'Gold', minPoints: 300, icon: '🥇', color: '#ffd700' },
  { name: 'Platinum', minPoints: 500, icon: '💎', color: '#e5e4e2' },
  { name: 'Diamond', minPoints: 1000, icon: '🔥', color: '#b9f2ff' },
];

type LevelDef = { name: string; minPoints: number; icon: string; color: string };

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

@Injectable()
export class GamificationService {
  private readonly logger = new Logger(GamificationService.name);
  private readonly configCache = new Map<string, { value: number; expiresAt: number }>();
  private readonly CONFIG_CACHE_TTL_MS = 60_000;
  private cachedLevels: LevelDef[] | null = null;
  private levelsLoadedAt = 0;
  private readonly LEVELS_CACHE_TTL_MS = 60_000;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
    private readonly mailService: MailService,
    private readonly cache: CacheService,
  ) {}

  // ═══════════════════════════════════════════════
  //  CONFIG HELPERS
  // ═══════════════════════════════════════════════

  private async getNumericConfig(key: string, defaultVal: number): Promise<number> {
    const cacheKey = `gamification_${key}`;
    const cached = this.configCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    try {
      const setting = await this.prisma.setting.findUnique({ where: { key: cacheKey } });
      if (setting && setting.value !== null && setting.value !== undefined) {
        const parsed = Number(setting.value);
        if (!isNaN(parsed)) {
          this.configCache.set(cacheKey, { value: parsed, expiresAt: Date.now() + this.CONFIG_CACHE_TTL_MS });
          return parsed;
        }
      }
    } catch {
      // fall back to default
    }
    this.configCache.set(cacheKey, { value: defaultVal, expiresAt: Date.now() + this.CONFIG_CACHE_TTL_MS });
    return defaultVal;
  }

  private async getLevels(): Promise<LevelDef[]> {
    if (this.cachedLevels && Date.now() - this.levelsLoadedAt < this.LEVELS_CACHE_TTL_MS) return this.cachedLevels;
    try {
      const settings = await this.prisma.setting.findMany({ where: { key: { startsWith: 'gamification_level_' } } });
      if (settings.length > 0) {
        const configMap = new Map(settings.map((s) => [s.key, s.value as string]));
        this.cachedLevels = DEFAULT_LEVELS.map((l) => {
          const configKey = `gamification_level_${l.name.toLowerCase()}_min`;
          const configVal = configMap.get(configKey);
          return configVal && !isNaN(Number(configVal)) ? { ...l, minPoints: Number(configVal) } : l;
        });
      } else {
        this.cachedLevels = DEFAULT_LEVELS;
      }
    } catch {
      this.cachedLevels = DEFAULT_LEVELS;
    }
    this.levelsLoadedAt = Date.now();
    return this.cachedLevels;
  }

  private async getLevel(points: number): Promise<{ name: string; icon: string; color: string }> {
    const levels = await this.getLevels();
    let level = levels[0];
    for (const l of levels) {
      if (points >= l.minPoints) level = l;
    }
    return level;
  }

  // ═══════════════════════════════════════════════
  //  PROFILE
  // ═══════════════════════════════════════════════

  private async getOrCreate(anggotaId: string) {
    let profile = await this.prisma.gamificationProfile.findUnique({ where: { anggotaId } });
    if (!profile) {
      profile = await this.prisma.gamificationProfile.create({
        data: { anggotaId, points: 0, latihanStreak: 0, iuranStreak: 0 },
      });
    }
    return profile;
  }

  async addPoints(anggotaId: string, type: string, points: number, description: string): Promise<{ profile: GamificationProfile; newBadges: Badge[] }> {
    const profile = await this.getOrCreate(anggotaId);
    const existingBadges = await this.prisma.gamificationBadge.findMany({
      where: { profileId: profile.id }, select: { badgeId: true },
    });
    const existingBadgeIds = new Set(existingBadges.map((b) => b.badgeId));
    const oldLevel = await this.getLevel(profile.points);

    const updatedProfile = await this.prisma.gamificationProfile.update({
      where: { id: profile.id },
      data: { points: profile.points + points, lastActivity: new Date() },
    });

    const newLevel = await this.getLevel(updatedProfile.points);
    if (newLevel.name !== oldLevel.name) {
      await this.sendLevelUpNotification(anggotaId, oldLevel, newLevel);
    }

    await this.prisma.gamificationEvent.create({
      data: { profileId: profile.id, anggotaId, type, points, description },
    });

    const newBadges: Badge[] = [];
    const badgesToAward: Array<{ badgeId: string; name: string; description: string; icon: string; category: string }> = [];

    for (const badge of BADGES) {
      if (existingBadgeIds.has(badge.id)) continue;
      if (badge.category === 'keaktifan' && updatedProfile.points >= badge.threshold) {
        newBadges.push(badge);
        badgesToAward.push({ badgeId: badge.id, name: badge.name, description: badge.description, icon: badge.icon, category: badge.category });
      }
    }

    if (badgesToAward.length > 0) {
      await this.prisma.gamificationBadge.createMany({
        data: badgesToAward.map((b) => ({ profileId: profile.id, badgeId: b.badgeId, name: b.name, description: b.description, icon: b.icon, category: b.category })),
      });
      await this.sendBadgeNotifications(anggotaId, badgesToAward);
    }

    const fullBadges = await this.prisma.gamificationBadge.findMany({
      where: { profileId: profile.id }, select: { badgeId: true },
    });

    this.cache.invalidatePrefix('gamification:');

    return {
      profile: {
        anggotaId,
        points: updatedProfile.points,
        level: await this.getLevel(updatedProfile.points),
        badges: fullBadges.map((b) => b.badgeId),
        streaks: { latihan: updatedProfile.latihanStreak, iuran: updatedProfile.iuranStreak },
        lastActivity: updatedProfile.lastActivity.toISOString(),
      },
      newBadges,
    };
  }

  // ═══════════════════════════════════════════════
  //  RECORD ACTIVITIES
  // ═══════════════════════════════════════════════

  async recordTraining(anggotaId: string): Promise<{ profile: GamificationProfile; newBadges: Badge[] }> {
    const profile = await this.getOrCreate(anggotaId);
    const updatedProfile = await this.prisma.gamificationProfile.update({
      where: { id: profile.id },
      data: { latihanStreak: profile.latihanStreak + 1 },
    });

    const trainingPoints = await this.getNumericConfig('points_training', 10);
    const result = await this.addPoints(anggotaId, 'training', trainingPoints, 'Latihan rutin');
    const existingBadgeIds = new Set(result.profile.badges);
    const newStreakBadges: Badge[] = [];
    const badgesToAward: Array<{ badgeId: string; name: string; description: string; icon: string; category: string }> = [];

    for (const badge of BADGES) {
      if (badge.category !== 'latihan' || existingBadgeIds.has(badge.id)) continue;
      if (updatedProfile.latihanStreak >= badge.threshold) {
        newStreakBadges.push(badge);
        badgesToAward.push({ badgeId: badge.id, name: badge.name, description: badge.description, icon: badge.icon, category: badge.category });
      }
    }

    if (badgesToAward.length > 0) {
      await this.prisma.gamificationBadge.createMany({
        data: badgesToAward.map((b) => ({ profileId: profile.id, badgeId: b.badgeId, name: b.name, description: b.description, icon: b.icon, category: b.category })),
      });
    }

    const allBadges = await this.prisma.gamificationBadge.findMany({
      where: { profileId: profile.id }, select: { badgeId: true },
    });

    return {
      ...result,
      newBadges: [...result.newBadges, ...newStreakBadges],
      profile: {
        ...result.profile,
        badges: allBadges.map((b) => b.badgeId),
        streaks: { latihan: updatedProfile.latihanStreak, iuran: result.profile.streaks.iuran },
      },
    };
  }

  async recordDuesPayment(anggotaId: string, onTime: boolean): Promise<{ profile: GamificationProfile; newBadges: Badge[] }> {
    const profile = await this.getOrCreate(anggotaId);

    if (onTime) {
      await this.prisma.gamificationProfile.update({
        where: { id: profile.id }, data: { iuranStreak: profile.iuranStreak + 1 },
      });
    } else {
      await this.prisma.gamificationProfile.update({
        where: { id: profile.id }, data: { iuranStreak: 0 },
      });
    }

    const [onTimePoints, latePoints] = await Promise.all([
      this.getNumericConfig('points_dues_on_time', 20),
      this.getNumericConfig('points_dues_late', 5),
    ]);
    const points = onTime ? onTimePoints : latePoints;
    const result = await this.addPoints(anggotaId, 'dues', points, onTime ? 'Iuran tepat waktu' : 'Iuran terlambat');
    const existingBadgeIds = new Set(result.profile.badges);
    const newStreakBadges: Badge[] = [];
    const badgesToAward: Array<{ badgeId: string; name: string; description: string; icon: string; category: string }> = [];

    const updatedProfile = await this.prisma.gamificationProfile.findUnique({ where: { anggotaId } });

    for (const badge of BADGES) {
      if (badge.category !== 'iuran' || existingBadgeIds.has(badge.id)) continue;
      if (updatedProfile && updatedProfile.iuranStreak >= badge.threshold) {
        newStreakBadges.push(badge);
        badgesToAward.push({ badgeId: badge.id, name: badge.name, description: badge.description, icon: badge.icon, category: badge.category });
      }
    }

    if (badgesToAward.length > 0) {
      await this.prisma.gamificationBadge.createMany({
        data: badgesToAward.map((b) => ({ profileId: profile.id, badgeId: b.badgeId, name: b.name, description: b.description, icon: b.icon, category: b.category })),
      });
    }

    const allBadges = await this.prisma.gamificationBadge.findMany({
      where: { profileId: profile.id }, select: { badgeId: true },
    });

    return {
      ...result,
      newBadges: [...result.newBadges, ...newStreakBadges],
      profile: {
        ...result.profile,
        badges: allBadges.map((b) => b.badgeId),
        streaks: { latihan: result.profile.streaks.latihan, iuran: updatedProfile?.iuranStreak ?? 0 },
      },
    };
  }

  // ═══════════════════════════════════════════════
  //  GETTERS
  // ═══════════════════════════════════════════════

  /**
   * Enforce self-scope pada data profil poin (anggota/penguji hanya data sendiri).
   */
  async assertSelfMember(user?: SelfScopeUser, anggotaId?: string): Promise<void> {
    await assertSelfMember(this.prisma as any, user, anggotaId);
  }

  async getProfile(anggotaId: string): Promise<GamificationProfile> {
    const profile = await this.getOrCreate(anggotaId);
    const badges = await this.prisma.gamificationBadge.findMany({
      where: { profileId: profile.id }, select: { badgeId: true },
    });
    const anggota = await this.prisma.anggota.findUnique({
      where: { id: anggotaId }, select: { namaLengkap: true },
    });

    return {
      anggotaId,
      namaLengkap: anggota?.namaLengkap ?? undefined,
      points: profile.points,
      level: await this.getLevel(profile.points),
      badges: badges.map((b) => b.badgeId),
      streaks: { latihan: profile.latihanStreak, iuran: profile.iuranStreak },
      lastActivity: profile.lastActivity.toISOString(),
    };
  }

  async getBadges(anggotaId: string): Promise<Badge[]> {
    const profile = await this.getOrCreate(anggotaId);
    const earned = await this.prisma.gamificationBadge.findMany({
      where: { profileId: profile.id }, select: { badgeId: true },
    });
    const earnedIds = new Set(earned.map((b) => b.badgeId));
    return BADGES.filter((b) => earnedIds.has(b.id));
  }

  getAllBadges(): Badge[] {
    return [...BADGES];
  }

  // ═══════════════════════════════════════════════
  //  NOTIFICATIONS
  // ═══════════════════════════════════════════════

  private async sendLevelUpNotification(anggotaId: string, oldLevel: { name: string; icon: string }, newLevel: { name: string; icon: string }): Promise<void> {
    try {
      const anggota = await this.prisma.anggota.findUnique({
        where: { id: anggotaId }, select: { namaLengkap: true, rantingId: true, email: true },
      });
      if (!anggota) return;

      const users = await this.prisma.user.findMany({
        where: { rantingId: anggota.rantingId, isActive: true }, select: { id: true },
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

      if (anggota.email) {
        const profile = await this.prisma.gamificationProfile.findUnique({ where: { anggotaId } });
        const tpl = await this.mailService.renderWithOverride(
          'levelUpEmail',
          () => levelUpEmail(anggota.namaLengkap, oldLevel.name, newLevel.name, profile?.points ?? 0),
          { nama: anggota.namaLengkap, oldLevel: oldLevel.name, newLevel: newLevel.name, points: String(profile?.points ?? 0) },
        );
        await this.mailService.sendMail({
          to: anggota.email, subject: tpl.subject, html: tpl.html,
          metadata: { module: 'gamification', template: 'levelUpEmail' },
        });
      }
    } catch (error) {
      this.logger.warn('Failed to send level-up notification:', (error as Error).message);
    }
  }

  private async sendBadgeNotifications(anggotaId: string, badges: Array<{ name: string; description: string; icon: string }>): Promise<void> {
    try {
      const anggota = await this.prisma.anggota.findUnique({
        where: { id: anggotaId }, select: { namaLengkap: true, rantingId: true, email: true },
      });
      if (!anggota) return;

      const users = await this.prisma.user.findMany({
        where: { rantingId: anggota.rantingId, isActive: true }, select: { id: true },
      });

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

      if (anggota.email) {
        const memberUser = await this.prisma.user.findFirst({
          where: { email: anggota.email, isActive: true }, select: { id: true },
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

        for (const badge of badges) {
          const tpl = await this.mailService.renderWithOverride(
            'badgeEarnedEmail',
            () => badgeEarnedEmail(anggota.namaLengkap, badge.name, badge.icon, badge.description),
            { nama: anggota.namaLengkap, badgeName: badge.name, badgeIcon: badge.icon, description: badge.description },
          );
          await this.mailService.sendMail({
            to: anggota.email, subject: tpl.subject, html: tpl.html,
            metadata: { module: 'gamification', template: 'badgeEarnedEmail' },
          });
        }
      }
    } catch (error) {
      this.logger.warn('Failed to send badge notification:', (error as Error).message);
    }
  }

  // ═══════════════════════════════════════════════
  //  LEADERBOARD & REPORTS
  // ═══════════════════════════════════════════════

  async getLeaderboard(limit: number = 10, scope?: { rantingId?: string; wilayahId?: string; distrikId?: string }, search?: string, skip?: number): Promise<GamificationProfile[]> {
    const where: Record<string, unknown> = {};
    if (scope?.rantingId) where.anggota = { rantingId: scope.rantingId };
    else if (scope?.wilayahId) where.anggota = { ranting: { wilayahId: scope.wilayahId } };
    else if (scope?.distrikId) where.anggota = { ranting: { wilayah: { distrikId: scope.distrikId } } };

    if (search?.trim()) {
      const anggotaFilter: Record<string, unknown> = { namaLengkap: { contains: search.trim(), mode: 'insensitive' } };
      where.anggota = where.anggota ? { ...(where.anggota as Record<string, unknown>), ...anggotaFilter } : anggotaFilter;
    }

    const profiles = await this.prisma.gamificationProfile.findMany({
      where, orderBy: { points: 'desc' }, skip: skip || 0, take: limit,
      include: { badges: { select: { badgeId: true } }, anggota: { select: { namaLengkap: true, rantingId: true } } },
    });

    const result: GamificationProfile[] = [];
    for (const p of profiles) {
      result.push({
        anggotaId: p.anggotaId,
        namaLengkap: p.anggota?.namaLengkap ?? undefined,
        points: p.points,
        level: await this.getLevel(p.points),
        badges: p.badges.map((b) => b.badgeId),
        streaks: { latihan: p.latihanStreak, iuran: p.iuranStreak },
        lastActivity: p.lastActivity.toISOString(),
      });
    }
    return result;
  }

  async getRecentEvents(anggotaId: string, limit: number = 20): Promise<PointEvent[]> {
    const profile = await this.prisma.gamificationProfile.findUnique({ where: { anggotaId } });
    if (!profile) return [];

    const events = await this.prisma.gamificationEvent.findMany({
      where: { profileId: profile.id }, orderBy: { timestamp: 'desc' }, take: limit,
    });

    const anggotaIds = [...new Set(events.map((e) => e.anggotaId))];
    const anggotas = await this.prisma.anggota.findMany({
      where: { id: { in: anggotaIds } }, select: { id: true, namaLengkap: true },
    });
    const namaMap = new Map(anggotas.map((a) => [a.id, a.namaLengkap]));

    return events.map((e) => ({
      id: e.id, anggotaId: e.anggotaId, namaLengkap: namaMap.get(e.anggotaId) ?? undefined,
      type: e.type, points: e.points, description: e.description, timestamp: e.timestamp.toISOString(),
    }));
  }

  async getGlobalRecentEvents(limit: number = 20): Promise<PointEvent[]> {
    const events = await this.prisma.gamificationEvent.findMany({
      orderBy: { timestamp: 'desc' }, take: limit,
      include: { anggota: { select: { namaLengkap: true } } },
    });

    return events.map((e) => ({
      id: e.id, anggotaId: e.anggotaId, namaLengkap: e.anggota?.namaLengkap ?? undefined,
      type: e.type, points: e.points, description: e.description, timestamp: e.timestamp.toISOString(),
    }));
  }

  async getPointsHistory(anggotaId: string): Promise<Array<{ month: string; points: number; cumulative: number; count: number }>> {
    const profile = await this.prisma.gamificationProfile.findUnique({ where: { anggotaId } });
    if (!profile) return [];

    const events = await this.prisma.gamificationEvent.findMany({
      where: { profileId: profile.id }, orderBy: { timestamp: 'asc' }, select: { points: true, timestamp: true },
    });

    const monthlyMap = new Map<string, { points: number; count: number }>();
    for (const event of events) {
      const key = event.timestamp.toISOString().slice(0, 7);
      const existing = monthlyMap.get(key) || { points: 0, count: 0 };
      existing.points += event.points;
      existing.count += 1;
      monthlyMap.set(key, existing);
    }

    let cumulative = 0;
    const result: Array<{ month: string; points: number; cumulative: number; count: number }> = [];
    for (const key of [...monthlyMap.keys()].sort()) {
      const data = monthlyMap.get(key)!;
      cumulative += data.points;
      result.push({ month: key, points: data.points, cumulative, count: data.count });
    }
    return result;
  }

  async getOrgStructure(): Promise<Array<{ id: string; nama: string; wilayahs: Array<{ id: string; nama: string; rantings: Array<{ id: string; nama: string }> }> }>> {
    const distriks = await this.prisma.distrik.findMany({
      include: { wilayahs: { include: { rantings: { select: { id: true, nama: true } } } } },
      orderBy: { nama: 'asc' },
    });

    return distriks.map((d) => ({
      id: d.id, nama: d.nama,
      wilayahs: d.wilayahs.map((w) => ({ id: w.id, nama: w.nama, rantings: w.rantings.map((r) => ({ id: r.id, nama: r.nama })) })),
    }));
  }

  async getPointsReport(period: 'weekly' | 'monthly' = 'monthly', limit: number = 20): Promise<Array<{ rank: number; namaLengkap: string; points: number; level: string; events: number; lastActive: string }>> {
    const now = new Date();
    const since = new Date(now.getTime() - (period === 'weekly' ? 7 : 30) * 24 * 60 * 60 * 1000);

    const events = await this.prisma.gamificationEvent.findMany({
      where: { timestamp: { gte: since } }, select: { anggotaId: true, points: true },
    });

    const memberMap = new Map<string, { points: number; events: number }>();
    for (const e of events) {
      const existing = memberMap.get(e.anggotaId) || { points: 0, events: 0 };
      existing.points += e.points;
      existing.events += 1;
      memberMap.set(e.anggotaId, existing);
    }

    const anggotaIds = [...memberMap.keys()];
    const anggotas = await this.prisma.anggota.findMany({
      where: { id: { in: anggotaIds } }, select: { id: true, namaLengkap: true },
    });
    const namaMap = new Map(anggotas.map((a) => [a.id, a.namaLengkap]));

    const profiles = await this.prisma.gamificationProfile.findMany({
      where: { anggotaId: { in: anggotaIds } }, select: { anggotaId: true, points: true, lastActivity: true },
    });
    const profileMap = new Map(profiles.map((p) => [p.anggotaId, p]));

    const result = [...memberMap.entries()]
      .map(([anggotaId, data]) => {
        const profile = profileMap.get(anggotaId);
        return { rank: 0, namaLengkap: namaMap.get(anggotaId) || anggotaId, points: data.points, totalPts: profile ? profile.points : 0, events: data.events, lastActive: profile?.lastActivity?.toISOString() ?? '' };
      })
      .sort((a, b) => b.points - a.points)
      .slice(0, limit);

    const resolved: Array<{ rank: number; namaLengkap: string; points: number; level: string; events: number; lastActive: string }> = [];
    for (const item of result) {
      const level = await this.getLevel(item.totalPts);
      resolved.push({ ...item, rank: resolved.length + 1, level: level.name });
    }
    return resolved;
  }

  // ═══════════════════════════════════════════════
  //  GAMIFICATION CONFIG
  // ═══════════════════════════════════════════════

  async getPointsDistribution(): Promise<Array<{ level: string; icon: string; color: string; count: number }>> {
    const [profiles, levels] = await Promise.all([
      this.prisma.gamificationProfile.findMany({ select: { points: true } }),
      this.getLevels(),
    ]);

    const distribution = new Map<string, { icon: string; color: string; count: number }>();
    for (const l of levels) distribution.set(l.name, { icon: l.icon, color: l.color, count: 0 });

    for (const p of profiles) {
      const level = await this.getLevel(p.points);
      const entry = distribution.get(level.name);
      if (entry) entry.count++;
    }

    return levels.map((l) => ({ level: l.name, icon: l.icon, color: l.color, count: distribution.get(l.name)?.count ?? 0 }));
  }

  async getTopRedemptions(limit: number = 10): Promise<Array<{ id: string; rewardName: string; rewardIcon: string; namaLengkap: string; pointsSpent: number; status: string; createdAt: string }>> {
    const redemptions = await this.prisma.gamificationRedemption.findMany({
      orderBy: { createdAt: 'desc' }, take: limit,
      include: { reward: { select: { name: true, icon: true } }, anggota: { select: { namaLengkap: true } } },
    });

    return redemptions.map((r) => ({
      id: r.id, rewardName: r.reward.name, rewardIcon: r.reward.icon, namaLengkap: r.anggota.namaLengkap,
      pointsSpent: r.pointsSpent, status: r.status, createdAt: r.createdAt.toISOString(),
    }));
  }

  async getConfig(): Promise<Record<string, unknown>> {
    const settings = await this.prisma.setting.findMany({ where: { key: { startsWith: 'gamification_' } } });
    const config: Record<string, unknown> = {};
    for (const s of settings) config[s.key.replace('gamification_', '')] = s.value;
    return config;
  }

  async getSyncConfig(): Promise<{ config: Record<string, unknown>; syncTimestamp: string }> {
    const config = await this.getConfig();
    return { config, syncTimestamp: new Date().toISOString() };
  }

  async updateConfig(data: Record<string, unknown>): Promise<void> {
    for (const [key, value] of Object.entries(data)) {
      await this.prisma.setting.upsert({
        where: { key: `gamification_${key}` },
        update: { value: value as never },
        create: { key: `gamification_${key}`, value: value as never },
      });
    }

    this.configCache.clear();
    this.cachedLevels = null;
    this.cache.invalidatePrefix('gamification:');

    try {
      const adminUsers = await this.prisma.user.findMany({
        where: { isActive: true, role: { in: ['superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting'] } },
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
      this.logger.warn('Failed to send config update notification:', (error as Error).message);
    }
  }

  // ═══════════════════════════════════════════════
  //  WEEKLY SUMMARY & STATS
  // ═══════════════════════════════════════════════

  async getWeeklySummary(anggotaId: string): Promise<{ pointsEarned: number; events: number; badgesEarned: number; level: string; currentPoints: number; periodStart: string; periodEnd: string }> {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const profile = await this.prisma.gamificationProfile.findUnique({ where: { anggotaId } });

    const events = await this.prisma.gamificationEvent.findMany({
      where: { anggotaId, timestamp: { gte: weekAgo } }, select: { points: true },
    });
    const pointsEarned = events.reduce((sum, e) => sum + e.points, 0);

    const badges = await this.prisma.gamificationBadge.findMany({
      where: { profileId: profile?.id ?? '', earnedAt: { gte: weekAgo } },
    });

    const level = await this.getLevel(profile?.points ?? 0);

    return { pointsEarned, events: events.length, badgesEarned: badges.length, level: level.name, currentPoints: profile?.points ?? 0, periodStart: weekAgo.toISOString(), periodEnd: now.toISOString() };
  }

  async sendWeeklySummaryNotification(anggotaId: string): Promise<{ sent: boolean; summary: unknown }> {
    const summary = await this.getWeeklySummary(anggotaId);
    let sent = false;

    try {
      const anggota = await this.prisma.anggota.findUnique({
        where: { id: anggotaId }, select: { email: true, namaLengkap: true },
      });

      if (anggota?.email) {
        const user = await this.prisma.user.findFirst({
          where: { email: anggota.email, isActive: true }, select: { id: true },
        });

        if (user) {
          await this.notificationsService.send(user.id, {
            userId: user.id,
            judul: `📊 Ringkasan Mingguan Gamifikasi`,
            isi: `Minggu ini: +${summary.pointsEarned} poin dari ${summary.events} aktivitas, ${summary.badgesEarned} badge baru. Level ${summary.level} (${summary.currentPoints} total poin)`,
            tipe: 'badge_earned',
            data: { anggotaId, type: 'weekly_summary', ...summary },
          });
          sent = true;
        }
      }
    } catch (error) {
      this.logger.warn('Failed to send weekly summary notification:', (error as Error).message);
    }

    return { sent, summary };
  }

  async getScoreboardBreakdown(period: 'all' | 'weekly' | 'monthly' = 'all'): Promise<Array<{ module: string; label: string; points: number; percentage: number; color: string }>> {
    const now = new Date();
    let since: Date | undefined;
    if (period === 'weekly') since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    else if (period === 'monthly') since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const where: Record<string, unknown> = {};
    if (since) where.timestamp = { gte: since };

    const events = await this.prisma.gamificationEvent.findMany({ where, select: { type: true, points: true } });

    const moduleMap = new Map<string, number>();
    for (const e of events) moduleMap.set(e.type, (moduleMap.get(e.type) || 0) + e.points);

    const moduleConfig: Record<string, { label: string; color: string }> = {
      training: { label: 'Latihan', color: '#3b82f6' },
      dues: { label: 'Iuran', color: '#22c55e' },
      badge: { label: 'Badge', color: '#a855f7' },
      achievement: { label: 'Prestasi', color: '#f59e0b' },
    };

    const totalPoints = events.reduce((sum, e) => sum + e.points, 0);
    return Object.entries(moduleConfig).map(([type, config]) => ({
      module: type, label: config.label, points: moduleMap.get(type) || 0,
      percentage: totalPoints > 0 ? Math.round(((moduleMap.get(type) || 0) / totalPoints) * 100) : 0,
      color: config.color,
    })).sort((a, b) => b.points - a.points);
  }

  async getStats(): Promise<{ totalMembers: number; totalEvents: number; totalPointsAwarded: number; badgesAwarded: number }> {
    const [totalMembers, totalEvents, pointsAgg, badgesCount] = await Promise.all([
      this.prisma.gamificationProfile.count(),
      this.prisma.gamificationEvent.count(),
      this.prisma.gamificationProfile.aggregate({ _sum: { points: true } }),
      this.prisma.gamificationBadge.count(),
    ]);

    return { totalMembers, totalEvents, totalPointsAwarded: pointsAgg._sum.points ?? 0, badgesAwarded: badgesCount };
  }
}
