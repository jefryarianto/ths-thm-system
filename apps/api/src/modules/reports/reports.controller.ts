import { Controller, Get, Query, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Reports')
@Controller('reports')
@ApiBearerAuth()
export class ReportsController {
  constructor(private readonly service: ReportsService) {}
  @Get('members') membersReport() { return this.service.membersReport(); }
  @Get('assessments') assessmentsReport(@Query() q: any) { return this.service.assessmentsReport(q); }
  @Get('dashboard') dashboard() { return this.service.dashboardStats(); }
  @Get('scan-stats')
  @Roles('superadmin', 'admin_distrik')
  scanStats() { return this.service.scanStats(); }
  @Get('export/:type') export(@Param('type') type: string, @Query() q: any) { return this.service.exportReport(type, q); }
}