import { Controller, Get, Query, Param, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequireScope } from '../../common/decorators/scope.decorator';
import { ReportFilterDto } from './dto/report.dto';
import { ScopedRequest } from '../../common/interfaces/user-scope.interface';

@ApiTags('Reports')
@Controller('reports')
@ApiBearerAuth()
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('members')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  membersReport(@Req() req: ScopedRequest) { return this.service.membersReport(req.scope); }

  @Get('assessments')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  assessmentsReport(@Query() q: ReportFilterDto, @Req() req: ScopedRequest) { return this.service.assessmentsReport(q, req.scope); }

  @Get('dashboard')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  dashboard(@Req() req: ScopedRequest) { return this.service.dashboardStats(req.scope); }

  @Get('scan-stats')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  scanStats(@Req() req: ScopedRequest) { return this.service.scanStats(req.scope); }

  @Get('export/:type')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  export(@Param('type') type: string, @Query() q: ReportFilterDto, @Req() req: ScopedRequest) { return this.service.exportReport(type, q, req.scope); }
}
