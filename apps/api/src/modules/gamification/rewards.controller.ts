import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequireScope } from '../../common/decorators/scope.decorator';
import { RewardsService } from './rewards.service';

@ApiTags('Gamification')
@ApiBearerAuth()
@Controller('gamification')
export class RewardsController {
  constructor(private readonly rewardsService: RewardsService) {}

  @Get('rewards')
  @ApiOperation({ summary: 'Get all available rewards' })
  async getRewards() {
    return { success: true, data: await this.rewardsService.getRewards() };
  }

  @Post('rewards')
  @Roles('superadmin', 'admin_distrik')
  @RequireScope('branch')
  @ApiOperation({ summary: 'Create a new reward (admin)' })
  async createReward(@Body() body: { name: string; description?: string; icon?: string; pointCost: number; stock?: number }) {
    return { success: true, data: await this.rewardsService.createReward(body) };
  }

  @Patch('rewards/:id')
  @Roles('superadmin', 'admin_distrik')
  @RequireScope('branch')
  @ApiOperation({ summary: 'Update a reward (admin)' })
  async updateReward(
    @Param('id') id: string,
    @Body() body: { name?: string; description?: string; icon?: string; pointCost?: number; stock?: number; isActive?: boolean },
  ) {
    return { success: true, data: await this.rewardsService.updateReward(id, body) };
  }

  @Delete('rewards/:id')
  @Roles('superadmin', 'admin_distrik')
  @RequireScope('branch')
  @ApiOperation({ summary: 'Delete a reward (admin)' })
  async deleteReward(@Param('id') id: string) {
    await this.rewardsService.deleteReward(id);
    return { success: true, message: 'Reward berhasil dihapus' };
  }

  @Post('rewards/:rewardId/redeem')
  @ApiOperation({ summary: 'Redeem a reward with points' })
  async redeemReward(
    @Param('rewardId') rewardId: string,
    @Body() body: { anggotaId: string },
  ) {
    const result = await this.rewardsService.redeemReward(body.anggotaId, rewardId);
    return { success: true, data: result, message: 'Reward berhasil diredeem' };
  }

  @Get('redemptions/:anggotaId')
  @ApiOperation({ summary: 'Get member redemptions' })
  async getMemberRedemptions(@Param('anggotaId') anggotaId: string) {
    return { success: true, data: await this.rewardsService.getMemberRedemptions(anggotaId) };
  }

  @Get('redemptions')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  @ApiOperation({ summary: 'Get all redemptions (admin)' })
  async getAllRedemptions() {
    return { success: true, data: await this.rewardsService.getAllRedemptions() };
  }

  @Patch('redemptions/:id/status')
  @Roles('superadmin', 'admin_distrik')
  @RequireScope('branch')
  @ApiOperation({ summary: 'Update redemption status (admin)' })
  async updateRedemptionStatus(
    @Param('id') id: string,
    @Body() body: { status: string; notes?: string },
  ) {
    return { success: true, data: await this.rewardsService.updateRedemptionStatus(id, body.status, body.notes) };
  }
}
