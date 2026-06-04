import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TrainingsService } from './trainings.service';
import { CreateTrainingDto, UpdateTrainingDto, TrainingFilterDto, RecordAttendanceDto, CreateEvaluationDto, UpdateEvaluationDto, ImportAttendanceDto } from './dto/training.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequireScope } from '../../common/decorators/scope.decorator';

@ApiTags('Trainings')
@Controller('trainings')
@ApiBearerAuth()
export class TrainingsController {
  constructor(private readonly service: TrainingsService) {}

  @Get()
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', 'penguji', 'anggota')
  @RequireScope('branch')
  findAll(@Query() query: TrainingFilterDto) { return this.service.findAll(query); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan')
  @RequireScope('branch')
  create(@Body() dto: CreateTrainingDto) { return this.service.create(dto); }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTrainingDto) { return this.service.update(id, dto); }

  @Delete(':id')
  remove(@Param('id') id: string) { return this.service.remove(id); }

  @Get(':id/attendances')
  getAttendances(@Param('id') id: string) { return this.service.getAttendances(id); }

  @Post(':id/attendances')
  recordAttendance(@Param('id') id: string, @Body() dto: RecordAttendanceDto) { return this.service.recordAttendance(id, dto); }

  @Post(':id/attendances/import')
  importAttendance(@Param('id') id: string, @Body() importDto: ImportAttendanceDto) { return this.service.importAttendance(id, importDto.data); }

  @Get(':id/evaluations')
  getEvaluations(@Param('id') id: string) { return this.service.getEvaluations(id); }

  @Post(':id/evaluations')
  createEvaluation(@Param('id') id: string, @Body() dto: CreateEvaluationDto) { return this.service.createEvaluation(id, dto); }

  @Patch(':id/evaluations/:eid')
  updateEvaluation(@Param('id') id: string, @Param('eid') eid: string, @Body() dto: UpdateEvaluationDto) { return this.service.updateEvaluation(id, eid, dto); }

  @Delete(':id/evaluations/:eid')
  removeEvaluation(@Param('id') id: string, @Param('eid') eid: string) { return this.service.removeEvaluation(id, eid); }
}