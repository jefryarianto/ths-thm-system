import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { DuesService } from './dues.service';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Dues')
@Controller('dues')
@ApiBearerAuth()
export class DuesController {
  constructor(private readonly service: DuesService) {}

  @Get()
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  findAll(@Query() query: any) { return this.service.findAll(query); }

  @Post()
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  create(@Body() dto: any) { return this.service.create(dto); }

  @Patch(':id')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  update(@Param('id') id: string, @Body() dto: any) { return this.service.update(id, dto); }

  @Delete(':id')
  @Roles('superadmin', 'admin_distrik')
  remove(@Param('id') id: string) { return this.service.remove(id); }

  @Get('members/:memberId')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'anggota')
  getMemberDues(@Param('memberId') memberId: string) { return this.service.getMemberDues(memberId); }

  @Get('arrears')
  @Roles('superadmin', 'admin_distrik')
  getArrears(@Query() query: any) { return this.service.getArrears(query); }

  @Get('report')
  @Roles('superadmin', 'admin_distrik')
  getReport(@Query() query: any) { return this.service.getReport(query); }

  @Get('report/export')
  @Roles('superadmin', 'admin_distrik')
  exportReport(@Query() query: any) { return this.service.exportReport(query); }

  @Post('import')
  @Roles('superadmin', 'admin_distrik')
  importDues(@Body() data: any[]) { return this.service.importDues(data); }

  @Patch('batch')
  @Roles('superadmin', 'admin_distrik')
  batchPayment(@Body() dto: any) { return this.service.batchPayment(dto); }

  @Get('dashboard/stats')
  @Roles('superadmin', 'admin_distrik')
  getDashboardStats() {
    return this.service.getDashboardStats();
  }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }
}