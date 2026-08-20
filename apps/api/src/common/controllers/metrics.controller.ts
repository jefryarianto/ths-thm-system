import { Controller, Get, Header } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../decorators/public.decorator';
import { Roles } from '../decorators/roles.decorator';
import { MetricsService } from '../services/metrics.service';

@ApiTags('Admin')
@Controller()
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  /**
   * Format teks Prometheus untuk scraper (public — tanpa data sensitif).
   */
  @Get('metrics')
  @Public()
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  @ApiOperation({ summary: 'Metrik dalam format Prometheus' })
  prometheus(): string {
    return this.metrics.prometheus();
  }

  /**
   * Snapshot JSON lengkap untuk dashboard operasional (admin).
   */
  @Get('admin/metrics')
  @Roles('superadmin', 'admin_distrik')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Snapshot metrik JSON (dashboard admin)' })
  snapshot() {
    return { success: true, data: this.metrics.snapshot() };
  }
}