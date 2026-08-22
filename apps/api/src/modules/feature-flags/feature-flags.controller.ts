import { Controller, Get, Param, Post, Body, UseGuards } from '@nestjs/common';
import { FeatureFlagsService } from './feature-flags.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
// Assuming you have an AuthGuard, adjust path if needed
import { JwtAuthGuard, RolesGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Feature Flags')
@Controller('feature-flags')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FeatureFlagsController {
  constructor(private readonly service: FeatureFlagsService) {}

  @Get()
  @Roles(Role.superadmin)
  @ApiOperation({ summary: 'Get all feature flags' })
  async getAll() {
    return this.service.getAllFlags();
  }

  @Get(':key')
  @ApiOperation({ summary: 'Check if a feature is enabled' })
  async isEnabled(@Param('key') key: string) {
    const isEnabled = await this.service.isEnabled(key);
    return { key, isEnabled };
  }

  @Post(':key')
  @Roles(Role.superadmin)
  @ApiOperation({ summary: 'Toggle feature flag' })
  async setFlag(@Param('key') key: string, @Body('isEnabled') isEnabled: boolean) {
    return this.service.setFlag(key, isEnabled);
  }
}