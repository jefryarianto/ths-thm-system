import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ExaminersService } from './examiners.service';
import { CreateExaminerDto, UpdateExaminerDto, ExaminerFilterDto, AssignExaminerDto } from './dto/examiner.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequireScope } from '../../common/decorators/scope.decorator';
import { ScopedRequest } from '../../common/interfaces/user-scope.interface';

@ApiTags('Examiners')
@Controller('examiners')
@ApiBearerAuth()
export class ExaminersController {
  constructor(private readonly service: ExaminersService) {}
  @Get()
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan')
  @RequireScope('branch')
  findAll(@Query() q: ExaminerFilterDto) { return this.service.findAll(q); }
  @Get(':id')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan')
  @RequireScope('branch')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }
  @Post()
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  create(@Body() dto: CreateExaminerDto) { return this.service.create(dto); }
  @Patch(':id')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  update(@Param('id') id: string, @Body() dto: UpdateExaminerDto) { return this.service.update(id, dto); }
  @Delete(':id')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah')
  @RequireScope('branch')
  remove(@Param('id') id: string) { return this.service.remove(id); }
  @Post('import')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  importCsv(@Body() importDto: { data: Record<string, unknown>[] }) { return this.service.importCsv(importDto.data); }
  @Post(':id/assign')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan')
  @RequireScope('branch')
  assign(@Param('id') id: string, @Body() dto: AssignExaminerDto, @Req() req: ScopedRequest) { return this.service.assign(id, dto, req.scope); }
  @Get(':id/assignments')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan')
  @RequireScope('branch')
  getAssignments(@Param('id') id: string) { return this.service.getAssignments(id); }
  @Get(':id/schedules')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan')
  @RequireScope('branch')
  getSchedules(@Param('id') id: string) { return this.service.getSchedules(id); }
}
