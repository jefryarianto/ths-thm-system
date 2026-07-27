import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { BaseCrudController } from '../../common/utils/base-crud.controller';
import { ExaminersService } from './examiners.service';
import {
  CreateExaminerDto,
  UpdateExaminerDto,
  ExaminerFilterDto,
  AssignExaminerDto,
} from './dto/examiner.dto';
import { CrudAuth } from '../../common/decorators/crud-auth.decorator';
import { ScopedRequest } from '../../common/interfaces/user-scope.interface';

@ApiTags('Examiners')
@Controller('examiners')
@ApiBearerAuth()
export class ExaminersController extends BaseCrudController {
  constructor(service: ExaminersService) {
    super(service);
  }

  @Get()
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', { summary: 'Ambil semua penguji' })
  findAll(@Query() q: ExaminerFilterDto) {
    return super.findAll(q);
  }

  @Get(':id')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', { summary: 'Ambil detail penguji' })
  findOne(@Param('id') id: string) {
    return super.findOne(id);
  }

  @Post()
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Tambah penguji baru' })
  create(@Body() dto: CreateExaminerDto) {
    return super.create(dto);
  }

  @Patch(':id')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Perbarui penguji' })
  update(@Param('id') id: string, @Body() dto: UpdateExaminerDto) {
    return super.update(id, dto);
  }

  @Delete(':id')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', { summary: 'Hapus penguji' })
  remove(@Param('id') id: string) {
    return super.remove(id);
  }

  @Post('import')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Impor data penguji' })
  importCsv(@Body() importDto: { data: Record<string, unknown>[] }) {
    return this.service.importCsv(importDto.data);
  }

  @Post(':id/assign')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', { summary: 'Tugaskan penguji' })
  assign(@Param('id') id: string, @Body() dto: AssignExaminerDto, @Req() req: ScopedRequest) {
    return this.service.assign(id, dto, req.scope);
  }

  @Get(':id/assignments')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', { summary: 'Ambil penugasan penguji' })
  getAssignments(@Param('id') id: string) {
    return this.service.getAssignments(id);
  }

  @Get(':id/schedules')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', { summary: 'Ambil jadwal penguji' })
  getSchedules(@Param('id') id: string) {
    return this.service.getSchedules(id);
  }
}
