import { Injectable } from '@nestjs/common';

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
 * Member gamification profile.
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

/** Maximum events to keep in memory */
const MAX_EVENTS = 10_000;

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
 * In-memory gamification service.
 *
 * Tracks points, badges, and streaks for members.
 * Points are earned through training attendance, on-time dues payments, and achievements.
 *
 * No external dependencies — can be replaced with database-backed storage later.
 */
@Injectable()
export class GamificationService {
  private profiles = new Map<string, GamificationProfile>();
  private events: PointEvent[] = [];

  /** Get or create a member's gamification profile */
  private getOrCreate(anggotaId: string): GamificationProfile {
    if (!this.profiles.has(anggotaId)) {
      this.profiles.set(anggotaId, {
        anggotaId,
        points: 0,
        badges: [],
        streaks: { latihan: 0, iuran: 0 },
        lastActivity: new Date().toISOString(),
      });
    }
    return this.profiles.get(anggotaId)!;
  }

  /** Add points to a member and check for new badges */
  addPoints(anggotaId: string, type: string, points: number, description: string): {
    profile: GamificationProfile;
    newBadges: Badge[];
  } {
    const profile = this.getOrCreate(anggotaId);
    const oldBadges = [...profile.badges];

    // Add points
    profile.points += points;
    profile.lastActivity = new Date().toISOString();

    // Record event
    const event: PointEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      anggotaId,
      type,
      points,
      description,
      timestamp: new Date().toISOString(),
    };
    this.events.push(event);
    if (this.events.length > MAX_EVENTS) {
      this.events = this.events.slice(-MAX_EVENTS);
    }

    // Check for new badges
    const newBadges: Badge[] = [];
    for (const badge of BADGES) {
      if (profile.badges.includes(badge.id)) continue;

      let earned = false;
      if (badge.category === 'keaktifan' && profile.points >= badge.threshold) {
        earned = true;
      }
      // Other badge categories are checked via explicit awarding

      if (earned) {
        profile.badges.push(badge.id);
        newBadges.push(badge);
      }
    }

    return { profile, newBadges };
  }

  /** Award a training attendance point */
  recordTraining(anggotaId: string): { profile: GamificationProfile; newBadges: Badge[] } {
    const profile = this.getOrCreate(anggotaId);
    profile.streaks.latihan += 1;

    const result = this.addPoints(anggotaId, 'training', 10, 'Latihan rutin');

    // Check training streak badges
    for (const badge of BADGES) {
      if (badge.category !== 'latihan' || profile.badges.includes(badge.id)) continue;
      if (profile.streaks.latihan >= badge.threshold) {
        profile.badges.push(badge.id);
        result.newBadges.push(badge);
      }
    }

    return result;
  }

  /** Record an on-time dues payment */
  recordDuesPayment(anggotaId: string, onTime: boolean): { profile: GamificationProfile; newBadges: Badge[] } {
    const profile = this.getOrCreate(anggotaId);

    if (onTime) {
      profile.streaks.iuran += 1;
    } else {
      profile.streaks.iuran = 0;
    }

    const points = onTime ? 20 : 5;
    const result = this.addPoints(anggotaId, 'dues', points, onTime ? 'Iuran tepat waktu' : 'Iuran terlambat');

    // Check iuran streak badges
    for (const badge of BADGES) {
      if (badge.category !== 'iuran' || profile.badges.includes(badge.id)) continue;
      if (profile.streaks.iuran >= badge.threshold) {
        profile.badges.push(badge.id);
        result.newBadges.push(badge);
      }
    }

    return result;
  }

  /** Get a member's gamification profile */
  getProfile(anggotaId: string): GamificationProfile {
    return this.getOrCreate(anggotaId);
  }

  /** Get all badges a member has earned with full details */
  getBadges(anggotaId: string): Badge[] {
    const profile = this.getOrCreate(anggotaId);
    return BADGES.filter((b) => profile.badges.includes(b.id));
  }

  /** Get all available badges */
  getAllBadges(): Badge[] {
    return [...BADGES];
  }

  /** Get leaderboard — top members by points */
  getLeaderboard(limit: number = 10): GamificationProfile[] {
    return Array.from(this.profiles.values())
      .sort((a, b) => b.points - a.points)
      .slice(0, limit);
  }

  /** Get recent point events for a member */
  getRecentEvents(anggotaId: string, limit: number = 20): PointEvent[] {
    return this.events
      .filter((e) => e.anggotaId === anggotaId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  /** Get gamification stats */
  getStats(): { totalMembers: number; totalEvents: number; totalPointsAwarded: number; badgesAwarded: number } {
    let totalPointsAwarded = 0;
    let badgesAwarded = 0;

    for (const profile of this.profiles.values()) {
      totalPointsAwarded += profile.points;
      badgesAwarded += profile.badges.length;
    }

    return {
      totalMembers: this.profiles.size,
      totalEvents: this.events.length,
      totalPointsAwarded,
      badgesAwarded,
    };
  }
}
