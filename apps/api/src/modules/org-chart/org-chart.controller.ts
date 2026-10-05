import { Controller, Get, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { OrgChartService } from './org-chart.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequireScope } from '../../common/decorators/scope.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { ScopedRequest } from '../../common/interfaces/user-scope.interface';

@ApiTags('Organization Chart')
@Controller('org-chart')
export class OrgChartController {
  constructor(private readonly service: OrgChartService) {}

  @Public()
  @Get('public')
  @ApiOperation({ summary: 'Peta organisasi publik' })
  getPublicOrgChart() {
    return this.service.getOrgChart(true);
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Peta organisasi lengkap (Nasional → Distrik → Wilayah → Ranting)' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'anggota')
  @RequireScope('branch')
  getOrgChart(@Req() req: ScopedRequest) {
    return this.service.getOrgChart(false, req.scope);
  }
}
