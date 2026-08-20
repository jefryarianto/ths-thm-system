import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
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
import { CrudAuth } from '../../common/decorators/crud-auth.decorator';
import { ScopedRequest } from '../../common/interfaces/user-scope.interface';

@ApiTags('Trainings')
@Controller('trainings')
@ApiBearerAuth()
export class TrainingsController {
  constructor(private readonly service: TrainingsService) {}

  @Get()
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', 'penguji', 'anggota', { summary: 'Ambil semua pelatihan' })
  findAll(@Query() query: TrainingFilterDto, @Req() req: ScopedRequest) {
    return this.service.findAll(query, req.scope);
  }

  @Get(':id')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', 'penguji', 'anggota', { summary: 'Ambil detail pelatihan' })
  findOne(@Param('id') id: string, @Req() req: ScopedRequest) {
    return this.service.findOne(id, req.scope);
  }

  @Post()
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', { summary: 'Tambah pelatihan baru' })
  create(@Body() dto: CreateTrainingDto, @Req() req: ScopedRequest) {
    return this.service.create(dto, req.scope, req.user.id);
  }

  @Patch(':id')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', { summary: 'Perbarui pelatihan' })
  update(@Param('id') id: string, @Body() dto: UpdateTrainingDto, @Req() req: ScopedRequest) {
    return this.service.update(id, dto, req.scope, req.user?.id);
  }

  @Delete(':id')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Hapus pelatihan' })
  remove(@Param('id') id: string, @Req() req: ScopedRequest) {
    return this.service.remove(id, req.scope);
  }

  @Get(':id/attendances')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', 'penguji', { summary: 'Ambil absensi pelatihan' })
  getAttendances(@Param('id') id: string) {
    return this.service.getAttendances(id);
  }

  @Post(':id/attendances')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', { summary: 'Catat absensi pelatihan' })
  recordAttendance(@Param('id') id: string, @Body() dto: RecordAttendanceDto) {
    return this.service.recordAttendance(id, dto);
  }

  @Post(':id/attendances/import')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', { summary: 'Impor absensi pelatihan' })
  importAttendance(@Param('id') id: string, @Body() importDto: ImportAttendanceDto) {
    return this.service.importAttendance(id, importDto.data);
  }

  @Get(':id/evaluations')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', 'penguji', { summary: 'Ambil evaluasi pelatihan' })
  getEvaluations(@Param('id') id: string) {
    return this.service.getEvaluations(id);
  }

  @Post(':id/evaluations')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', 'penguji', { summary: 'Tambah evaluasi pelatihan' })
  createEvaluation(@Param('id') id: string, @Body() dto: CreateEvaluationDto) {
    return this.service.createEvaluation(id, dto);
  }

  @Patch(':id/evaluations/:eid')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', 'penguji', { summary: 'Perbarui evaluasi pelatihan' })
  updateEvaluation(
    @Param('id') id: string,
    @Param('eid') eid: string,
    @Body() dto: UpdateEvaluationDto,
  ) {
    return this.service.updateEvaluation(id, eid, dto);
  }

  @Delete(':id/evaluations/:eid')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', { summary: 'Hapus evaluasi pelatihan' })
  removeEvaluation(@Param('id') id: string, @Param('eid') eid: string) {
    return this.service.removeEvaluation(id, eid);
  }
}
