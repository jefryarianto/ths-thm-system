import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TrainingsService } from './trainings.service';
import {
  CreateTrainingDto,
  UpdateTrainingDto,
  TrainingFilterDto,
  RecordAttendanceDto,
  CreateEvaluationDto,
  UpdateEvaluationDto,
  ImportAttendanceDto,
} from './dto/training.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequireScope } from '../../common/decorators/scope.decorator';
import { ScopedRequest } from '../../common/interfaces/user-scope.interface';

@ApiTags('Trainings')
@Controller('trainings')
@ApiBearerAuth()
export class TrainingsController {
  constructor(private readonly service: TrainingsService) {}

  @Get()
  @ApiOperation({ summary: 'Ambil semua pelatihan' })
  @Roles(
    'superadmin',
    'admin_distrik',
    'admin_wilayah',
    'admin_ranting',
    'admin_kegiatan',
    'penguji',
    'anggota',
  )
  @RequireScope('branch')
  findAll(@Query() query: TrainingFilterDto, @Req() req: ScopedRequest) {
    return this.service.findAll(query, req.scope);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Ambil detail pelatihan' })
  @Roles(
    'superadmin',
    'admin_distrik',
    'admin_wilayah',
    'admin_ranting',
    'admin_kegiatan',
    'penguji',
    'anggota',
  )
  @RequireScope('branch')
  findOne(@Param('id') id: string, @Req() req: ScopedRequest) {
    return this.service.findOne(id, req.scope);
  }

  @Post()
  @ApiOperation({ summary: 'Tambah pelatihan baru' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan')
  @RequireScope('branch')
  create(@Body() dto: CreateTrainingDto, @Req() req: ScopedRequest) {
    return this.service.create(dto, req.scope, req.user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Perbarui pelatihan' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan')
  @RequireScope('branch')
  update(@Param('id') id: string, @Body() dto: UpdateTrainingDto, @Req() req: ScopedRequest) {
    return this.service.update(id, dto, req.scope);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Hapus pelatihan' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  remove(@Param('id') id: string, @Req() req: ScopedRequest) {
    return this.service.remove(id, req.scope);
  }

  @Get(':id/attendances')
  @ApiOperation({ summary: 'Ambil absensi pelatihan' })
  @Roles(
    'superadmin',
    'admin_distrik',
    'admin_wilayah',
    'admin_ranting',
    'admin_kegiatan',
    'penguji',
  )
  @RequireScope('branch')
  getAttendances(@Param('id') id: string) {
    return this.service.getAttendances(id);
  }

  @Post(':id/attendances')
  @ApiOperation({ summary: 'Catat absensi pelatihan' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan')
  @RequireScope('branch')
  recordAttendance(@Param('id') id: string, @Body() dto: RecordAttendanceDto) {
    return this.service.recordAttendance(id, dto);
  }

  @Post(':id/attendances/import')
  @ApiOperation({ summary: 'Impor absensi pelatihan' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan')
  @RequireScope('branch')
  importAttendance(@Param('id') id: string, @Body() importDto: ImportAttendanceDto) {
    return this.service.importAttendance(id, importDto.data);
  }

  @Get(':id/evaluations')
  @ApiOperation({ summary: 'Ambil evaluasi pelatihan' })
  @Roles(
    'superadmin',
    'admin_distrik',
    'admin_wilayah',
    'admin_ranting',
    'admin_kegiatan',
    'penguji',
  )
  @RequireScope('branch')
  getEvaluations(@Param('id') id: string) {
    return this.service.getEvaluations(id);
  }

  @Post(':id/evaluations')
  @ApiOperation({ summary: 'Tambah evaluasi pelatihan' })
  @Roles(
    'superadmin',
    'admin_distrik',
    'admin_wilayah',
    'admin_ranting',
    'admin_kegiatan',
    'penguji',
  )
  @RequireScope('branch')
  createEvaluation(@Param('id') id: string, @Body() dto: CreateEvaluationDto) {
    return this.service.createEvaluation(id, dto);
  }

  @Patch(':id/evaluations/:eid')
  @ApiOperation({ summary: 'Perbarui evaluasi pelatihan' })
  @Roles(
    'superadmin',
    'admin_distrik',
    'admin_wilayah',
    'admin_ranting',
    'admin_kegiatan',
    'penguji',
  )
  @RequireScope('branch')
  updateEvaluation(
    @Param('id') id: string,
    @Param('eid') eid: string,
    @Body() dto: UpdateEvaluationDto,
  ) {
    return this.service.updateEvaluation(id, eid, dto);
  }

  @Delete(':id/evaluations/:eid')
  @ApiOperation({ summary: 'Hapus evaluasi pelatihan' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan')
  @RequireScope('branch')
  removeEvaluation(@Param('id') id: string, @Param('eid') eid: string) {
    return this.service.removeEvaluation(id, eid);
  }
}
