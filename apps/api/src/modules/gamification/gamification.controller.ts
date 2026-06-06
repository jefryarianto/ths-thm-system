import { Controller, Get, Post, Put, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequireScope } from '../../common/decorators/scope.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { GamificationService } from './gamification.service';

/**
 * Controller for gamification — points, badges, and leaderboard.
 *
 * Members can view their own profile and earn points through activities.
 * Admins can view leaderboards and manually award points.
 */
@ApiTags('Gamification')
@ApiBearerAuth()
@Controller('gamification')
export class GamificationController {
  constructor(private readonly gamificationService: GamificationService) {}

  /**
   * Get all available badges.
   */
  @Get('badges')
  @ApiOperation({ summary: 'Get all available badges' })
  getAllBadges() {
    return {
      success: true,
      data: this.gamificationService.getAllBadges(),
    };
  }

  /**
   * Get a member's gamification profile.
   */
  @Get('profile/:anggotaId')
  @ApiOperation({ summary: 'Get member gamification profile' })
  async getProfile(@Param('anggotaId') anggotaId: string) {
    const profile = await this.gamificationService.getProfile(anggotaId);
    const badges = await this.gamificationService.getBadges(anggotaId);
    return {
      success: true,
      data: { ...profile, badges },
    };
  }

  /**
   * Get a member's recent point events.
   */
  @Get('profile/:anggotaId/events')
  @ApiOperation({ summary: 'Get member recent point events' })
  async getRecentEvents(
    @Param('anggotaId') anggotaId: string,
    @Query('limit') limit?: string,
  ) {
    const events = await this.gamificationService.getRecentEvents(anggotaId, limit ? parseInt(limit) : 20);
    return {
      success: true,
      data: events,
    };
  }

  /**
   * Get recent point events across all members (activity feed).
   */
  @Get('events')
  @ApiOperation({ summary: 'Get global recent point events (activity feed)' })
  async getGlobalRecentEvents(@Query('limit') limit?: string) {
    const events = await this.gamificationService.getGlobalRecentEvents(limit ? parseInt(limit) : 20);
    return {
      success: true,
      data: events,
    };
  }

  /**
   * Get points history aggregated by month for a member.
   */
  @Get('profile/:anggotaId/points-history')
  @ApiOperation({ summary: 'Get member points history by month' })
  async getPointsHistory(@Param('anggotaId') anggotaId: string) {
    return {
      success: true,
      data: await this.gamificationService.getPointsHistory(anggotaId),
    };
  }

  /**
   * Get public leaderboard — no auth required.
   */
  @Get('public/leaderboard')
  @Public()
  @ApiOperation({ summary: 'Get public leaderboard (no auth required)' })
  async getPublicLeaderboard(@Query('limit') limit?: string, @Query('search') search?: string, @Query('skip') skip?: string) {
    const leaderboard = await this.gamificationService.getLeaderboard(limit ? parseInt(limit) : 20, undefined, search, skip ? parseInt(skip) : undefined);
    return {
      success: true,
      data: leaderboard.map((p, i) => ({
        rank: i + 1,
        namaLengkap: p.namaLengkap,
        points: p.points,
        badges: p.badges.length,
        streaks: p.streaks,
      })),
    };
  }

  /**
   * Get organization structure for filter dropdowns.
   */
  @Get('org-structure')
  @ApiOperation({ summary: 'Get org structure (distrik → wilayah → ranting) for filters' })
  async getOrgStructure() {
    const data = await this.gamificationService.getOrgStructure();
    return { success: true, data };
  }

  /**
   * Get the leaderboard — top members by points.
   * Filter by scope: rantingId, wilayahId, or distrikId.
   * Search by member name: search query param.
   */
  @Get('leaderboard')
  @ApiOperation({ summary: 'Get top members leaderboard (optional scope filter, search & pagination)' })
  async getLeaderboard(
    @Query('limit') limit?: string,
    @Query('rantingId') rantingId?: string,
    @Query('wilayahId') wilayahId?: string,
    @Query('distrikId') distrikId?: string,
    @Query('search') search?: string,
    @Query('skip') skip?: string,
  ) {
    const scope = rantingId ? { rantingId } : wilayahId ? { wilayahId } : distrikId ? { distrikId } : undefined;
    const leaderboard = await this.gamificationService.getLeaderboard(
      limit ? parseInt(limit) : 10,
      scope,
      search,
      skip ? parseInt(skip) : undefined,
    );
    return {
      success: true,
      data: leaderboard.map((p, i) => ({
        rank: i + 1,
        anggotaId: p.anggotaId,
        namaLengkap: p.namaLengkap,
        points: p.points,
        badges: p.badges.length,
        streaks: p.streaks,
      })),
    };
  }

  /**
   * Get scoreboard breakdown — points aggregated by event type for a period.
   */
  @Get('scoreboard/breakdown')
  @ApiOperation({ summary: 'Get real points breakdown per module for scoreboard' })
  async getScoreboardBreakdown(@Query('period') period?: string) {
    const data = await this.gamificationService.getScoreboardBreakdown(
      (period as 'all' | 'weekly' | 'monthly') || 'all',
    );
    return { success: true, data };
  }

  /**
   * Get gamification stats.
   */
  @Get('stats')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  @ApiOperation({ summary: 'Get gamification statistics' })
  async getStats() {
    return {
      success: true,
      data: await this.gamificationService.getStats(),
    };
  }

  /**
   * Get points distribution — how many members at each level.
   */
  @Get('admin/points-distribution')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @ApiOperation({ summary: 'Get points distribution by level' })
  async getPointsDistribution() {
    const data = await this.gamificationService.getPointsDistribution();
    return { success: true, data };
  }

  /**
   * Get top reward redemptions.
   */
  @Get('admin/top-redemptions')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @ApiOperation({ summary: 'Get top reward redemptions' })
  async getTopRedemptions(@Query('limit') limit?: string) {
    const data = await this.gamificationService.getTopRedemptions(limit ? parseInt(limit) : 10);
    return { success: true, data };
  }

  /**
   * Get points report for a period (weekly/monthly).
   */
  @Get('admin/points-report')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @ApiOperation({ summary: 'Get points report for a period' })
  async getPointsReport(
    @Query('period') period?: string,
    @Query('limit') limit?: string,
  ) {
    const data = await this.gamificationService.getPointsReport(
      (period as 'weekly' | 'monthly') || 'monthly',
      limit ? parseInt(limit) : 20,
    );
    return { success: true, data };
  }

  /**
   * Get sync config — config + timestamp for mobile clients.
   */
  @Get('sync-config')
  @Public()
  @ApiOperation({ summary: 'Get gamification config for sync (no auth required)' })
  async getSyncConfig() {
    const data = await this.gamificationService.getSyncConfig();
    return { success: true, data };
  }

  /**
   * Get gamification configuration settings.
   */
  @Get('admin/config')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @ApiOperation({ summary: 'Get gamification configuration' })
  async getConfig() {
    const data = await this.gamificationService.getConfig();
    return { success: true, data };
  }

  /**
   * Update gamification configuration settings.
   */
  @Put('admin/config')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @ApiOperation({ summary: 'Update gamification configuration' })
  async updateConfig(@Body() body: Record<string, unknown>) {
    await this.gamificationService.updateConfig(body);
    return { success: true, message: 'Konfigurasi berhasil diperbarui' };
  }

  /**
   * Get weekly summary for a member.
   */
  @Get('profile/:anggotaId/weekly-summary')
  @ApiOperation({ summary: 'Get weekly gamification summary for a member' })
  async getWeeklySummary(@Param('anggotaId') anggotaId: string) {
    const data = await this.gamificationService.getWeeklySummary(anggotaId);
    return { success: true, data };
  }

  /**
   * Send weekly summary notification to a member.
   */
  @Post('profile/:anggotaId/weekly-summary/send')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @ApiOperation({ summary: 'Send weekly gamification summary as FCM notification to member' })
  async sendWeeklySummaryNotification(@Param('anggotaId') anggotaId: string) {
    const result = await this.gamificationService.sendWeeklySummaryNotification(anggotaId);
    return {
      success: true,
      data: result,
      message: result.sent
        ? 'Ringkasan mingguan berhasil dikirim'
        : 'Ringkasan mingguan tidak dapat dikirim (user tidak ditemukan)',
    };
  }

  /**
   * Record a training attendance for a member.
   */
  @Post('profile/:anggotaId/training')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan')
  @RequireScope('branch')
  @ApiOperation({ summary: 'Record training attendance and award points' })
  async recordTraining(@Param('anggotaId') anggotaId: string) {
    const result = await this.gamificationService.recordTraining(anggotaId);
    return {
      success: true,
      data: {
        profile: result.profile,
        newBadges: result.newBadges,
      },
      message: result.newBadges.length > 0
        ? `Badge baru didapat: ${result.newBadges.map((b) => `${b.icon} ${b.name}`).join(', ')}`
        : `+10 poin untuk latihan (${result.profile.points} total)`,
    };
  }

  /**
   * Record a dues payment for a member.
   */
  @Post('profile/:anggotaId/dues')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  @ApiOperation({ summary: 'Record dues payment and award points' })
  async recordDuesPayment(
    @Param('anggotaId') anggotaId: string,
    @Body() body: { onTime?: boolean },
  ) {
    const result = await this.gamificationService.recordDuesPayment(anggotaId, body.onTime !== false);
    return {
      success: true,
      data: {
        profile: result.profile,
        newBadges: result.newBadges,
      },
      message: result.newBadges.length > 0
        ? `Badge baru didapat: ${result.newBadges.map((b) => `${b.icon} ${b.name}`).join(', ')}`
        : `+${body.onTime !== false ? 20 : 5} poin untuk iuran (${result.profile.points} total)`,
    };
  }
}
