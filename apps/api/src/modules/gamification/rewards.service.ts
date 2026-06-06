import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface Reward {
  id: string;
  name: string;
  description?: string;
  icon: string;
  pointCost: number;
  stock: number;
  isActive: boolean;
  createdAt: string;
}

export interface Redemption {
  id: string;
  rewardId: string;
  rewardName?: string;
  rewardIcon?: string;
  anggotaId: string;
  namaLengkap?: string;
  pointsSpent: number;
  status: string;
  notes?: string;
  createdAt: string;
}

@Injectable()
export class RewardsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Get all active rewards */
  async getRewards(): Promise<Reward[]> {
    const rewards = await this.prisma.gamificationReward.findMany({
      orderBy: { pointCost: 'asc' },
    });
    return rewards.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description ?? undefined,
      icon: r.icon,
      pointCost: r.pointCost,
      stock: r.stock,
      isActive: r.isActive,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  /** Create a new reward (admin) */
  async createReward(data: {
    name: string;
    description?: string;
    icon?: string;
    pointCost: number;
    stock?: number;
  }): Promise<Reward> {
    const reward = await this.prisma.gamificationReward.create({
      data: {
        name: data.name,
        description: data.description,
        icon: data.icon || '🎁',
        pointCost: data.pointCost,
        stock: data.stock ?? 0,
      },
    });
    return {
      id: reward.id,
      name: reward.name,
      description: reward.description ?? undefined,
      icon: reward.icon,
      pointCost: reward.pointCost,
      stock: reward.stock,
      isActive: reward.isActive,
      createdAt: reward.createdAt.toISOString(),
    };
  }

  /** Update a reward (admin) */
  async updateReward(
    id: string,
    data: Partial<{ name: string; description: string; icon: string; pointCost: number; stock: number; isActive: boolean }>,
  ): Promise<Reward> {
    const existing = await this.prisma.gamificationReward.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Reward tidak ditemukan');

    const reward = await this.prisma.gamificationReward.update({
      where: { id },
      data,
    });
    return {
      id: reward.id,
      name: reward.name,
      description: reward.description ?? undefined,
      icon: reward.icon,
      pointCost: reward.pointCost,
      stock: reward.stock,
      isActive: reward.isActive,
      createdAt: reward.createdAt.toISOString(),
    };
  }

  /** Delete a reward (admin) */
  async deleteReward(id: string): Promise<void> {
    const existing = await this.prisma.gamificationReward.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Reward tidak ditemukan');
    await this.prisma.gamificationReward.delete({ where: { id } });
  }

  /** Redeem a reward with points */
  async redeemReward(
    anggotaId: string,
    rewardId: string,
  ): Promise<Redemption> {
    const reward = await this.prisma.gamificationReward.findUnique({ where: { id: rewardId } });
    if (!reward) throw new NotFoundException('Reward tidak ditemukan');
    if (!reward.isActive) throw new BadRequestException('Reward tidak aktif');
    if (reward.stock <= 0) throw new BadRequestException('Stok reward habis');

    const profile = await this.prisma.gamificationProfile.findUnique({ where: { anggotaId } });
    if (!profile) throw new NotFoundException('Profil gamifikasi tidak ditemukan');
    if (profile.points < reward.pointCost) {
      throw new BadRequestException(
        `Poin tidak mencukupi. Dibutuhkan ${reward.pointCost}, tersedia ${profile.points}`,
      );
    }

    // Deduct points and stock in transaction
    const [redemption] = await this.prisma.$transaction([
      this.prisma.gamificationRedemption.create({
        data: {
          rewardId: reward.id,
          anggotaId,
          pointsSpent: reward.pointCost,
          status: 'pending',
        },
      }),
      this.prisma.gamificationProfile.update({
        where: { id: profile.id },
        data: { points: profile.points - reward.pointCost },
      }),
      this.prisma.gamificationReward.update({
        where: { id: reward.id },
        data: { stock: reward.stock - 1 },
      }),
      // Record event
      this.prisma.gamificationEvent.create({
        data: {
          profileId: profile.id,
          anggotaId,
          type: 'redeem',
          points: -reward.pointCost,
          description: `Redeem: ${reward.name}`,
        },
      }),
    ]);

    const anggota = await this.prisma.anggota.findUnique({
      where: { id: anggotaId },
      select: { namaLengkap: true },
    });

    return {
      id: redemption.id,
      rewardId: redemption.rewardId,
      rewardName: reward.name,
      rewardIcon: reward.icon,
      anggotaId: redemption.anggotaId,
      namaLengkap: anggota?.namaLengkap ?? undefined,
      pointsSpent: redemption.pointsSpent,
      status: redemption.status,
      notes: redemption.notes ?? undefined,
      createdAt: redemption.createdAt.toISOString(),
    };
  }

  /** Get redemptions for a member */
  async getMemberRedemptions(anggotaId: string): Promise<Redemption[]> {
    const redemptions = await this.prisma.gamificationRedemption.findMany({
      where: { anggotaId },
      orderBy: { createdAt: 'desc' },
      include: { reward: { select: { name: true, icon: true } } },
    });

    return redemptions.map((r) => ({
      id: r.id,
      rewardId: r.rewardId,
      rewardName: r.reward.name,
      rewardIcon: r.reward.icon,
      anggotaId: r.anggotaId,
      pointsSpent: r.pointsSpent,
      status: r.status,
      notes: r.notes ?? undefined,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  /** Get all redemptions (admin) */
  async getAllRedemptions(): Promise<Redemption[]> {
    const redemptions = await this.prisma.gamificationRedemption.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        reward: { select: { name: true, icon: true } },
        anggota: { select: { namaLengkap: true } },
      },
    });

    return redemptions.map((r) => ({
      id: r.id,
      rewardId: r.rewardId,
      rewardName: r.reward.name,
      rewardIcon: r.reward.icon,
      anggotaId: r.anggotaId,
      namaLengkap: r.anggota.namaLengkap,
      pointsSpent: r.pointsSpent,
      status: r.status,
      notes: r.notes ?? undefined,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  /** Update redemption status (admin) */
  async updateRedemptionStatus(
    id: string,
    status: string,
    notes?: string,
  ): Promise<Redemption> {
    const existing = await this.prisma.gamificationRedemption.findUnique({
      where: { id },
      include: { reward: { select: { name: true, icon: true } } },
    });
    if (!existing) throw new NotFoundException('Redemption tidak ditemukan');

    const updated = await this.prisma.gamificationRedemption.update({
      where: { id },
      data: { status, notes },
      include: { reward: { select: { name: true, icon: true } } },
    });

    const anggota = await this.prisma.anggota.findUnique({
      where: { id: existing.anggotaId },
      select: { namaLengkap: true },
    });

    return {
      id: updated.id,
      rewardId: updated.rewardId,
      rewardName: updated.reward.name,
      rewardIcon: updated.reward.icon,
      anggotaId: updated.anggotaId,
      namaLengkap: anggota?.namaLengkap ?? undefined,
      pointsSpent: updated.pointsSpent,
      status: updated.status,
      notes: updated.notes ?? undefined,
      createdAt: updated.createdAt.toISOString(),
    };
  }
}
