import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Roles } from '../decorators/roles.decorator';
import { RequireScope } from '../decorators/scope.decorator';
import { CacheService } from '../services/cache.service';
import { InvalidateCacheDto } from '../dto/cache-management.dto';

/**
 * Controller for cache management operations.
 *
 * Restricted to superadmin only (national scope).
 * Provides endpoints for viewing cache stats and manually
 * invalidating cache entries (useful for deployments or
 * emergency data refresh).
 */
@ApiTags('Cache Management')
@ApiBearerAuth()
@Controller('cache')
export class CacheManagementController {
  constructor(private readonly cache: CacheService) {}

  /**
   * Get current cache statistics.
   * Returns total number of entries and all cache keys.
   */
  @Get('stats')
  @Roles('superadmin')
  @RequireScope('national')
  @ApiOperation({ summary: 'Get cache statistics (superadmin only)' })
  getStats() {
    return this.cache.getStats();
  }

  /**
   * Invalidate cache entries.
   * If prefix is provided, only entries matching the prefix are removed.
   * If prefix is omitted, ALL cache entries are cleared.
   *
   * Use with caution — clearing all cache will temporarily increase
   * database load until entries are re-populated.
   */
  @Post('invalidate')
  @Roles('superadmin')
  @RequireScope('national')
  @ApiOperation({ summary: 'Invalidate cache entries (superadmin only)' })
  invalidate(@Body() dto: InvalidateCacheDto) {
    if (dto.prefix) {
      this.cache.invalidatePrefix(dto.prefix);
      return {
        success: true,
        message: `Cache entries with prefix "${dto.prefix}" invalidated`,
      };
    }

    this.cache.clear();
    return {
      success: true,
      message: 'All cache entries cleared',
    };
  }
}
