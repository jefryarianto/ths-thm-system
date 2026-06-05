import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { DuesService } from './dues.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateDueDto, UpdateDueDto, DueFilterDto, BatchPaymentDto } from './dto/dues.dto';
import { RequireScope } from '../../common/decorators/scope.decorator';
import { ScopedRequest } from '../../common/interfaces/user-scope.interface';

@ApiTags('Dues')
@Controller('dues')
@ApiBearerAuth()
export class DuesController {
  constructor(private readonly service: DuesService) {}

  @Get()
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  findAll(@Query() query: DueFilterDto, @Req() req: ScopedRequest) { return this.service.findAll(query, req.scope); }

  @Post()
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  create(@Body() dto: CreateDueDto) { return this.service.create(dto); }

  @Patch(':id')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  update(@Param('id') id: string, @Body() dto: UpdateDueDto, @Req() req: ScopedRequest) { return this.service.update(id, dto, req.scope); }

  @Delete(':id')
  @Roles('superadmin', 'admin_distrik')
  @RequireScope('branch')
  remove(@Param('id') id: string, @Req() req: ScopedRequest) { return this.service.remove(id, req.scope); }

  @Get('members/:memberId')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'anggota')
  getMemberDues(@Param('memberId') memberId: string) { return this.service.getMemberDues(memberId); }

  @Get('arrears')
  @Roles('superadmin', 'admin_distrik')
  @RequireScope('district')
  getArrears() { return this.service.getArrears({}); }

  @Get('report')
  @Roles('superadmin', 'admin_distrik')
  @RequireScope('district')
  getReport() { return this.service.getReport({}); }

  @Get('report/export')
  @Roles('superadmin', 'admin_distrik')
  exportReport() { return this.service.exportReport({}); }

  @Post('import')
  @Roles('superadmin', 'admin_distrik')
  importDues(@Body() importDto: { data: Record<string, unknown>[] }) { return this.service.importDues(importDto.data); }

  @Patch('batch')
  @Roles('superadmin', 'admin_distrik')
  batchPayment(@Body() dto: BatchPaymentDto) { return this.service.batchPayment(dto); }

  @Get('dashboard/stats')
  @Roles('superadmin', 'admin_distrik')
  getDashboardStats() {
    return this.service.getDashboardStats();
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: ScopedRequest) { return this.service.findOne(id, req.scope); }
}
