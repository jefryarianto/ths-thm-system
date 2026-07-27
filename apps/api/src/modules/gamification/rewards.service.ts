import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ScopeHelper } from '../../common/utils/scope-helpers';
import { CacheService } from '../../common/services/cache.service';
import { BaseCrudService } from '../../common/utils/base-crud.service';
import { NotificationsService } from '../notifications/notifications.service';

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

export interface CreateRewardInput {
  name: string;
  description?: string;
  icon?: string;
  pointCost: number;
  stock?: number;
}

export interface UpdateRewardInput {
  name?: string;
  description?: string;
  icon?: string;
  pointCost?: number;
  stock?: number;
  isActive?: boolean;
}

@Injectable()
export class RewardsService extends BaseCrudService<CreateRewardInput, UpdateRewardInput> {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly scopeHelper: ScopeHelper,
    protected readonly cache: CacheService,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
  ) {
    super(prisma, scopeHelper, cache, {
      model: 'gamificationReward',
      prefix: 'rewards:',
      notFound: 'Reward tidak ditemukan',
    });
  }

  // ── Hook: transform DTO before create ──────────────

  protected async beforeCreate(
    dto: CreateRewardInput,
  ): Promise<Record<string, unknown>> {
    return {
      name: dto.name,
      description: dto.description ?? null,
      icon: dto.icon || '🎁',
      pointCost: dto.pointCost,
      stock: dto.stock ?? 0,
    };
  }

  // ── CRUD: Get all active rewards ───────────────────

  async getRewards(): Promise<Reward[]> {
    const rewards = await this.prismaDelegate.findMany({
      orderBy: { pointCost: 'asc' },
    });
    return rewards.map((r: any) => ({
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

  // ── CRUD: Create reward ────────────────────────────

  async createReward(data: CreateRewardInput): Promise<Reward> {
    const result = await this.baseCreate(data, undefined, undefined, 'Reward berhasil dibuat');
    return this.toRewardDto((result as any).data);
  }

  // ── CRUD: Update reward ────────────────────────────

  async updateReward(id: string, data: UpdateRewardInput): Promise<Reward> {
    const result = await this.baseUpdate(id, data, undefined, 'Reward berhasil diperbarui');
    return this.toRewardDto((result as any).data);
  }

  // ── CRUD: Delete reward ────────────────────────────

  async deleteReward(id: string): Promise<void> {
    await this.baseRemove(id, undefined, 'Reward berhasil dihapus');
  }

  // ── Domain: Redeem reward with points ──────────────

  async redeemReward(anggotaId: string, rewardId: string): Promise<Redemption> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reward = await (this.prisma as any).gamificationReward.findUnique({ where: { id: rewardId } });
    if (!reward) throw new NotFoundException('Reward tidak ditemukan');
    if (!reward.isActive) throw new BadRequestException('Reward tidak aktif');
    if (reward.stock <= 0) throw new BadRequestException('Stok reward habis');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profile = await (this.prisma as any).gamificationProfile.findUnique({ where: { anggotaId } });
    if (!profile) throw new NotFoundException('Profil gamifikasi tidak ditemukan');
    if (profile.points < reward.pointCost) {
      throw new BadRequestException(
        `Poin tidak mencukupi. Dibutuhkan ${reward.pointCost}, tersedia ${profile.points}`,
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [redemption] = await (this.prisma as any).$transaction([
      (this.prisma as any).gamificationRedemption.create({
        data: {
          rewardId: reward.id,
          anggotaId,
          pointsSpent: reward.pointCost,
          status: 'pending',
        },
      }),
      (this.prisma as any).gamificationProfile.update({
        where: { id: profile.id },
        data: { points: profile.points - reward.pointCost },
      }),
      (this.prisma as any).gamificationReward.update({
        where: { id: reward.id },
        data: { stock: reward.stock - 1 },
      }),
      (this.prisma as any).gamificationEvent.create({
        data: {
          profileId: profile.id,
          anggotaId,
          type: 'redeem',
          points: -reward.pointCost,
          description: `Redeem: ${reward.name}`,
        },
      }),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anggota = await (this.prisma as any).anggota.findUnique({
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

  // ── Domain: Get member's redemptions ───────────────

  async getMemberRedemptions(anggotaId: string): Promise<Redemption[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const redemptions = await (this.prisma as any).gamificationRedemption.findMany({
      where: { anggotaId },
      orderBy: { createdAt: 'desc' },
      include: { reward: { select: { name: true, icon: true } } },
    });

    return redemptions.map((r: any) => ({
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

  // ── Domain: Get all redemptions (admin) ────────────

  async getAllRedemptions(): Promise<Redemption[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const redemptions = await (this.prisma as any).gamificationRedemption.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        reward: { select: { name: true, icon: true } },
        anggota: { select: { namaLengkap: true } },
      },
    });

    return redemptions.map((r: any) => ({
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

  // ── Domain: Update redemption status ───────────────

  async updateRedemptionStatus(id: string, status: string, notes?: string): Promise<Redemption> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existing = await (this.prisma as any).gamificationRedemption.findUnique({
      where: { id },
      include: { reward: { select: { name: true, icon: true } } },
    });
    if (!existing) throw new NotFoundException('Redemption tidak ditemukan');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updated = await (this.prisma as any).gamificationRedemption.update({
      where: { id },
      data: { status, notes },
      include: { reward: { select: { name: true, icon: true } } },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anggota = await (this.prisma as any).anggota.findUnique({
      where: { id: existing.anggotaId },
      select: { namaLengkap: true },
    });

    // Send notification on status change
    if (status === 'approved' || status === 'rejected' || status === 'completed') {
      await this.sendRedemptionNotification(
        existing.anggotaId,
        updated.reward.name,
        updated.reward.icon,
        status,
        anggota?.namaLengkap,
        notes,
      );
    }

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

  // ── Private Helpers ─────────────────────────────────

  private toRewardDto(reward: any): Reward {
    return {
      id: reward.id,
      name: reward.name,
      description: reward.description ?? undefined,
      icon: reward.icon,
      pointCost: reward.pointCost,
      stock: reward.stock,
      isActive: reward.isActive,
      createdAt: reward.createdAt instanceof Date ? reward.createdAt.toISOString() : reward.createdAt,
    };
  }

  private async sendRedemptionNotification(
    anggotaId: string,
    rewardName: string,
    rewardIcon: string,
    status: string,
    namaLengkap?: string,
    notes?: string,
  ): Promise<void> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const anggota = await (this.prisma as any).anggota.findUnique({
        where: { id: anggotaId },
        select: { rantingId: true, namaLengkap: true, email: true },
      });
      if (!anggota) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const users = await (this.prisma as any).user.findMany({
        where: { rantingId: anggota.rantingId, isActive: true },
        select: { id: true },
      });

      const statusLabels: Record<string, string> = {
        approved: 'Disetujui ✅',
        rejected: 'Ditolak ❌',
        completed: 'Selesai 🎉',
      };
      const label = statusLabels[status] || status;

      for (const user of users) {
        await this.notificationsService.send(user.id, {
          userId: user.id,
          judul: `${rewardIcon} Redemption ${label}`,
          isi: `Redemption "${rewardName}" oleh ${namaLengkap || anggota.namaLengkap} telah ${label}`,
          tipe: 'umum',
          data: { anggotaId, rewardName, status, type: 'redemption_status' },
        });
      }

      if (anggota.email) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const memberUser = await (this.prisma as any).user.findFirst({
          where: { email: anggota.email, isActive: true },
          select: { id: true },
        });
        if (memberUser) {
          const memberLabels: Record<string, string> = {
            approved: 'Disetujui ✅',
            rejected: 'Ditolak ❌',
            completed: 'Selesai 🎉',
          };
          await this.notificationsService.send(memberUser.id, {
            userId: memberUser.id,
            judul: `${rewardIcon} Redemption ${memberLabels[status] || status}`,
            isi:
              `Redemption "${rewardName}" Anda telah ${memberLabels[status] || status}.` +
              (notes ? ` Catatan: ${notes}` : ''),
            tipe: 'umum',
            data: { anggotaId, rewardName, status, notes, type: 'redemption_personal' },
          });
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to send redemption notification: ${(error as Error).message}`);
    }
  }
}
