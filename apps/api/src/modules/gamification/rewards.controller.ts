import { Controller, Get, Post, Patch, Delete, Param, Body, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CrudAuth } from '../../common/decorators/crud-auth.decorator';
import { ScopedRequest } from '../../common/interfaces/user-scope.interface';
import { RewardsService } from './rewards.service';

@ApiTags('Gamification')
@ApiBearerAuth()
@Controller('gamification')
export class RewardsController {
  constructor(private readonly rewardsService: RewardsService) {}

  @Get('rewards')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'anggota', { scope: 'self', summary: 'Get all available rewards' })
  async getRewards() {
    return this.rewardsService.getRewards();
  }

  @Post('rewards')
  @CrudAuth('superadmin', 'admin_distrik', { summary: 'Create a new reward (admin)' })
  async createReward(
    @Body()
    body: {
      name: string;
      description?: string;
      icon?: string;
      pointCost: number;
      stock?: number;
    },
  ) {
    return this.rewardsService.createReward(body);
  }

  @Patch('rewards/:id')
  @CrudAuth('superadmin', 'admin_distrik', { summary: 'Update a reward (admin)' })
  async updateReward(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      description?: string;
      icon?: string;
      pointCost?: number;
      stock?: number;
      isActive?: boolean;
    },
  ) {
    return this.rewardsService.updateReward(id, body);
  }

  @Delete('rewards/:id')
  @CrudAuth('superadmin', 'admin_distrik', { summary: 'Delete a reward (admin)' })
  async deleteReward(@Param('id') id: string) {
    await this.rewardsService.deleteReward(id);
  }

  @Post('rewards/:rewardId/redeem')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'anggota', { scope: 'self', summary: 'Redeem a reward with points' })
  async redeemReward(
    @Param('rewardId') rewardId: string,
    @Body() body: { anggotaId: string },
    @Req() req: ScopedRequest,
  ) {
    const result = await this.rewardsService.redeemReward(body.anggotaId, rewardId, req.user);
    return { data: result, message: 'Reward berhasil diredeem' };
  }

  @Get('redemptions/:anggotaId')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'anggota', { scope: 'self', summary: 'Get member redemptions' })
  async getMemberRedemptions(@Param('anggotaId') anggotaId: string, @Req() req: ScopedRequest) {
    return this.rewardsService.getMemberRedemptions(anggotaId, req.user);
  }

  @Get('redemptions')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Get all redemptions (admin)' })
  async getAllRedemptions() {
    return this.rewardsService.getAllRedemptions();
  }

  @Patch('redemptions/:id/status')
  @CrudAuth('superadmin', 'admin_distrik', { summary: 'Update redemption status (admin)' })
  async updateRedemptionStatus(
    @Param('id') id: string,
    @Body() body: { status: string; notes?: string },
  ) {
    return this.rewardsService.updateRedemptionStatus(id, body.status, body.notes);
  }
}
