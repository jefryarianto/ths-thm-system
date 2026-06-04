import { Controller, Get, Post, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { GraduationsService } from './graduations.service';
import { CreateGraduationDto, GraduationFilterDto, RegisterParticipantDto, GraduateDto } from './dto/graduation.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequireScope } from '../../common/decorators/scope.decorator';

@ApiTags('Graduations')
@Controller('graduations')
@ApiBearerAuth()
export class GraduationsController {
  constructor(private readonly service: GraduationsService) {}

  @Get()
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan')
  @RequireScope('branch')
  findAll(@Query() query: GraduationFilterDto) { return this.service.findAll(query); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan')
  @RequireScope('branch')
  create(@Body() dto: CreateGraduationDto) { return this.service.create(dto); }

  @Post(':id/register')
  register(@Param('id') id: string, @Body() dto: RegisterParticipantDto) { return this.service.registerParticipant(id, dto); }

  @Post(':id/unregister')
  unregister(@Param('id') id: string, @Body() dto: RegisterParticipantDto) { return this.service.unregisterParticipant(id, dto); }

  @Get(':id/participants')
  getParticipants(@Param('id') id: string) { return this.service.getParticipants(id); }

  @Post(':id/participants/import')
  importParticipants(@Param('id') id: string, @Body() importDto: { data: Array<{ candidateId?: string; id?: string }> }) { return this.service.importParticipants(id, importDto.data); }

  @Post(':id/graduate')
  graduate(@Param('id') id: string, @Body() dto: GraduateDto) { return this.service.graduate(id, dto); }

  @Post(':id/generate-docs')
  generateDocs(@Param('id') id: string) { return this.service.generateDocuments(id); }
}