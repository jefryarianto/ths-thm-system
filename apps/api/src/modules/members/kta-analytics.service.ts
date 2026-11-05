import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, KtaAppStatus, KtaAppLevel, KtaAppAction } from '@prisma/client';

export interface FunnelStage {
  stage: string;
  count: number;
  rate: string;
}

export interface ProcessingTime {
  level: string;
  avgDays: number;
  medianDays: number;
  minDays: number;
  maxDays: number;
  count: number;
}

export interface MonthlyTrend {
  month: string;
  submitted: number;
  approved: number;
  generated: number;
  rejected: number;
}

export interface Bottleneck {
  level: string;
  status: KtaAppStatus;
  avgHoursStuck: number;
  count: number;
  slaHours: number;
  breachRate: number;
}

const POST_RANTING: KtaAppStatus[] = [
  'WILAYAH_REVIEW',
  'DISTRIK_REVIEW',
  'NASIONAL_REVIEW',
  'APPROVED',
  'PAYMENT_SETUP',
  'PAYMENT_PENDING',
  'PAYMENT_VERIFIED',
  'CARD_GENERATING',
  'CARD_GENERATED',
];
const POST_WILAYAH: KtaAppStatus[] = [
  'DISTRIK_REVIEW',
  'NASIONAL_REVIEW',
  'APPROVED',
  'PAYMENT_SETUP',
  'PAYMENT_PENDING',
  'PAYMENT_VERIFIED',
  'CARD_GENERATING',
  'CARD_GENERATED',
];
const POST_DISTRIK: KtaAppStatus[] = [
  'NASIONAL_REVIEW',
  'APPROVED',
  'PAYMENT_SETUP',
  'PAYMENT_PENDING',
  'PAYMENT_VERIFIED',
  'CARD_GENERATING',
  'CARD_GENERATED',
];
const POST_NASIONAL: KtaAppStatus[] = [
  'APPROVED',
  'PAYMENT_SETUP',
  'PAYMENT_PENDING',
  'PAYMENT_VERIFIED',
  'CARD_GENERATING',
  'CARD_GENERATED',
];

const SLA_HOURS: Record<KtaAppStatus, number> = {
  SUBMITTED: 0,
  RANTING_REVIEW: Number(process.env.KTA_SLA_RANTING_HOURS) || 48,
  WILAYAH_REVIEW: Number(process.env.KTA_SLA_WILAYAH_HOURS) || 48,
  DISTRIK_REVIEW: Number(process.env.KTA_SLA_DISTRIK_HOURS) || 72,
  NASIONAL_REVIEW: Number(process.env.KTA_SLA_NASIONAL_HOURS) || 24,
  APPROVED: 0,
  PAYMENT_SETUP: Number(process.env.KTA_SLA_PAYMENT_SETUP_HOURS) || 72,
  PAYMENT_PENDING: Number(process.env.KTA_SLA_PAYMENT_PENDING_HOURS) || 168,
  PAYMENT_VERIFIED: 0,
  CARD_GENERATING: 0,
  CARD_GENERATED: 0,
  REJECTED: 0,
  CANCELLED: 0,
};

@Injectable()
export class KtaAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getFunnel(scope?: any) {
    const scopeFilter = this.buildScopeFilter(scope);

    const totalSubmitted = await this.prisma.ktaApplication.count({ where: { ...scopeFilter } });
    const rantingApproved = await this.prisma.ktaApplication.count({
      where: { ...scopeFilter, status: { in: POST_RANTING } },
    });
    const wilayahApproved = await this.prisma.ktaApplication.count({
      where: { ...scopeFilter, status: { in: POST_WILAYAH } },
    });
    const distrikReviewed = await this.prisma.ktaApplication.count({
      where: { ...scopeFilter, status: { in: POST_DISTRIK } },
    });
    const nasionalApproved = await this.prisma.ktaApplication.count({
      where: { ...scopeFilter, status: { in: POST_NASIONAL } },
    });
    const cardGenerated = await this.prisma.ktaApplication.count({
      where: { ...scopeFilter, status: 'CARD_GENERATED' },
    });

    const rate = (num: number, denom: number) => (denom ? ((num / denom) * 100).toFixed(1) : '0.0');

    const stages: FunnelStage[] = [
      { stage: 'Submitted', count: totalSubmitted, rate: '100.0' },
      { stage: 'Ranting Approved', count: rantingApproved, rate: rate(rantingApproved, totalSubmitted) },
      { stage: 'Wilayah Approved', count: wilayahApproved, rate: rate(wilayahApproved, rantingApproved) },
      { stage: 'Distrik Reviewed', count: distrikReviewed, rate: rate(distrikReviewed, wilayahApproved) },
      { stage: 'Nasional Approved', count: nasionalApproved, rate: rate(nasionalApproved, distrikReviewed) },
      { stage: 'Card Generated', count: cardGenerated, rate: rate(cardGenerated, nasionalApproved) },
    ];

    return { stages, totalSubmitted };
  }

  async getAvgProcessingTime(scope?: any): Promise<ProcessingTime[]> {
    const scopeFilter = this.buildScopeFilter(scope);

    const histories = await this.prisma.ktaAppHistory.findMany({
      where: {
        ktaApplication: scopeFilter as any,
        action: { in: ['APPROVED', 'REJECTED', 'PAYMENT_VERIFIED', 'CARD_GENERATED'] },
      },
      orderBy: { createdAt: 'asc' },
      select: { ktaApplicationId: true, level: true, action: true, createdAt: true },
    });

    // Map each application's level start (SUBMITTED/SKIPPED) -> decision end
    const allHistories = await this.prisma.ktaAppHistory.findMany({
      where: { ktaApplication: scopeFilter as any },
      orderBy: { createdAt: 'asc' },
      select: { ktaApplicationId: true, level: true, action: true, createdAt: true },
    });

    const starts: Record<string, Partial<Record<KtaAppLevel, number>>> = {};
    const ends: Record<string, Partial<Record<KtaAppLevel, number>>> = {};

    for (const h of allHistories) {
      if (!starts[h.ktaApplicationId]) starts[h.ktaApplicationId] = {};
      if (!ends[h.ktaApplicationId]) ends[h.ktaApplicationId] = {};

      if (['SUBMITTED', 'SKIPPED'].includes(h.action) && !starts[h.ktaApplicationId][h.level]) {
        starts[h.ktaApplicationId][h.level] = h.createdAt.getTime();
      }
      if (['APPROVED', 'REJECTED', 'PAYMENT_VERIFIED', 'CARD_GENERATED'].includes(h.action) && !ends[h.ktaApplicationId][h.level]) {
        ends[h.ktaApplicationId][h.level] = h.createdAt.getTime();
      }
    }

    const levelTimes: Record<KtaAppLevel, number[]> = {
      RANTING: [],
      WILAYAH: [],
      DISTRIK: [],
      NASIONAL: [],
      MEMBER: [],
    };

    for (const [appId, levelStarts] of Object.entries(starts)) {
      const levelEnds = ends[appId] || {};
      for (const level of ['RANTING', 'WILAYAH', 'DISTRIK', 'NASIONAL'] as KtaAppLevel[]) {
        if (levelStarts[level] && levelEnds[level]) {
          levelTimes[level].push((levelEnds[level]! - levelStarts[level]!) / (1000 * 60 * 60));
        }
      }
    }

    const stats = (hours: number[]): Omit<ProcessingTime, 'level'> => {
      if (hours.length === 0) return { avgDays: 0, medianDays: 0, minDays: 0, maxDays: 0, count: 0 };
      const sorted = [...hours].sort((a, b) => a - b);
      const avg = hours.reduce((a, b) => a + b, 0) / hours.length;
      const toDays = (v: number) => Math.round((v / 24) * 10) / 10;
      return {
        avgDays: toDays(avg),
        medianDays: toDays(sorted[Math.floor(sorted.length / 2)]),
        minDays: toDays(sorted[0]),
        maxDays: toDays(sorted[sorted.length - 1]),
        count: hours.length,
      };
    };

    const results: ProcessingTime[] = [];
    for (const level of ['RANTING', 'WILAYAH', 'DISTRIK', 'NASIONAL'] as KtaAppLevel[]) {
      results.push({ ...stats(levelTimes[level]), level });
    }

    // Payment processing time: PAYMENT_SETUP -> PAYMENT_VERIFIED
    const setupTimes = allHistories
      .filter((h) => h.action === 'PAYMENT_SETUP')
      .map((h) => ({ id: h.ktaApplicationId, t: h.createdAt.getTime() }));
    const verifiedTimes = allHistories
      .filter((h) => h.action === 'PAYMENT_VERIFIED')
      .map((h) => ({ id: h.ktaApplicationId, t: h.createdAt.getTime() }));

    const verifiedMap = new Map(verifiedTimes.map((v) => [v.id, v.t]));
    const durations = setupTimes.filter((s) => verifiedMap.has(s.id)).map((s) => (verifiedMap.get(s.id)! - s.t) / (1000 * 60 * 60));
    results.push({ level: 'PAYMENT', ...stats(durations) });

    return results;
  }

  async getTrend(months: number = 6, scope?: any): Promise<MonthlyTrend[]> {
    const scopeFilter = this.buildScopeFilter(scope);
    const results: MonthlyTrend[] = [];

    for (let i = months - 1; i >= 0; i--) {
      const start = new Date();
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      start.setMonth(start.getMonth() - i);
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);

      const [submitted, approved, generated, rejected] = await Promise.all([
        this.prisma.ktaApplication.count({ where: { ...scopeFilter, createdAt: { gte: start, lt: end } } }),
        this.prisma.ktaApplication.count({
          where: { ...scopeFilter, status: { in: POST_NASIONAL }, updatedAt: { gte: start, lt: end } },
        }),
        this.prisma.ktaApplication.count({ where: { ...scopeFilter, status: 'CARD_GENERATED', updatedAt: { gte: start, lt: end } } }),
        this.prisma.ktaApplication.count({ where: { ...scopeFilter, status: 'REJECTED', updatedAt: { gte: start, lt: end } } }),
      ]);

      results.push({
        month: start.toISOString().slice(0, 7),
        submitted,
        approved,
        generated,
        rejected,
      });
    }

    return results;
  }

  async getBottlenecks(scope?: any): Promise<Bottleneck[]> {
    const scopeFilter = this.buildScopeFilter(scope);
    const bottlenecks: Bottleneck[] = [];
    const now = Date.now();

    for (const [status, sla] of Object.entries(SLA_HOURS) as [KtaAppStatus, number][]) {
      if (sla === 0) continue;
      const apps = await this.prisma.ktaApplication.findMany({
        where: { ...scopeFilter, status },
        select: { updatedAt: true },
      });
      const hoursStuck = apps.map((a) => (now - new Date(a.updatedAt).getTime()) / (1000 * 60 * 60));
      const breached = hoursStuck.filter((h) => h > sla).length;
      bottlenecks.push({
        level: this.getLevelFromStatus(status),
        status,
        avgHoursStuck: apps.length ? Math.round((hoursStuck.reduce((a, b) => a + b, 0) / apps.length) * 10) / 10 : 0,
        count: apps.length,
        slaHours: sla,
        breachRate: apps.length ? Math.round((breached / apps.length) * 100) : 0,
      });
    }

    return bottlenecks.sort((a, b) => b.avgHoursStuck - a.avgHoursStuck);
  }

  private getLevelFromStatus(status: KtaAppStatus): string {
    const map: Record<KtaAppStatus, string> = {
      SUBMITTED: 'MEMBER',
      RANTING_REVIEW: 'RANTING',
      WILAYAH_REVIEW: 'WILAYAH',
      DISTRIK_REVIEW: 'DISTRIK',
      NASIONAL_REVIEW: 'NASIONAL',
      APPROVED: 'NASIONAL',
      PAYMENT_SETUP: 'DISTRIK',
      PAYMENT_PENDING: 'DISTRIK',
      PAYMENT_VERIFIED: 'DISTRIK',
      CARD_GENERATING: 'DISTRIK',
      CARD_GENERATED: 'DISTRIK',
      REJECTED: 'REJECTED',
      CANCELLED: 'CANCELLED',
    };
    return map[status] || 'MEMBER';
  }

  private buildScopeFilter(scope?: any): Prisma.KtaApplicationWhereInput {
    if (!scope) return {};
    if (scope.rantingId) return { anggota: { rantingId: scope.rantingId } };
    if (scope.wilayahId) return { anggota: { ranting: { wilayahId: scope.wilayahId } } };
    if (scope.distrikId) return { anggota: { ranting: { wilayah: { distrikId: scope.distrikId } } } };
    return {};
  }
}
