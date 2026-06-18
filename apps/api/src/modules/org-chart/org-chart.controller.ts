import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { OrgChartService } from './org-chart.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequireScope } from '../../common/decorators/scope.decorator';

@ApiTags('Organization Chart')
@Controller('org-chart')
@ApiBearerAuth()
export class OrgChartController {
  constructor(private readonly service: OrgChartService) {}

  @Get()
  @ApiOperation({ summary: 'Peta organisasi lengkap (Nasional → Distrik → Wilayah → Ranting)' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'anggota')
  @RequireScope('branch')
  getOrgChart() {
    return this.service.getOrgChart();
  }
}