import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequireScope } from '../../common/decorators/scope.decorator';
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
  getProfile(@Param('anggotaId') anggotaId: string) {
    const profile = this.gamificationService.getProfile(anggotaId);
    const badges = this.gamificationService.getBadges(anggotaId);
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
  getRecentEvents(
    @Param('anggotaId') anggotaId: string,
    @Query('limit') limit?: string,
  ) {
    const events = this.gamificationService.getRecentEvents(anggotaId, limit ? parseInt(limit) : 20);
    return {
      success: true,
      data: events,
    };
  }

  /**
   * Get the leaderboard — top members by points.
   */
  @Get('leaderboard')
  @ApiOperation({ summary: 'Get top members leaderboard' })
  getLeaderboard(@Query('limit') limit?: string) {
    const leaderboard = this.gamificationService.getLeaderboard(limit ? parseInt(limit) : 10);
    return {
      success: true,
      data: leaderboard.map((p, i) => ({
        rank: i + 1,
        anggotaId: p.anggotaId,
        points: p.points,
        badges: p.badges.length,
        streaks: p.streaks,
      })),
    };
  }

  /**
   * Get gamification stats.
   */
  @Get('stats')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  @ApiOperation({ summary: 'Get gamification statistics' })
  getStats() {
    return {
      success: true,
      data: this.gamificationService.getStats(),
    };
  }

  /**
   * Record a training attendance for a member.
   */
  @Post('profile/:anggotaId/training')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan')
  @RequireScope('branch')
  @ApiOperation({ summary: 'Record training attendance and award points' })
  recordTraining(@Param('anggotaId') anggotaId: string) {
    const result = this.gamificationService.recordTraining(anggotaId);
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
  recordDuesPayment(
    @Param('anggotaId') anggotaId: string,
    @Body() body: { onTime?: boolean },
  ) {
    const result = this.gamificationService.recordDuesPayment(anggotaId, body.onTime !== false);
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
