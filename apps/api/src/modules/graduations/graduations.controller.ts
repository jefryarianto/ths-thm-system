import { Controller, Get, Post, Delete, Body, Param, Query, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { GraduationsService } from './graduations.service';
import { CreateGraduationDto, GraduationFilterDto, RegisterParticipantDto, GraduateDto } from './dto/graduation.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequireScope } from '../../common/decorators/scope.decorator';
import { ScopedRequest } from '../../common/interfaces/user-scope.interface';

@ApiTags('Graduations')
@Controller('graduations')
@ApiBearerAuth()
export class GraduationsController {
  constructor(private readonly service: GraduationsService) {}

  @Get()
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan')
  @RequireScope('branch')
  findAll(@Query() query: GraduationFilterDto, @Req() req: ScopedRequest) { return this.service.findAll(query, req.scope); }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: ScopedRequest) { return this.service.findOne(id, req.scope); }

  @Post()
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan')
  @RequireScope('branch')
  create(@Body() dto: CreateGraduationDto, @Req() req: ScopedRequest) { return this.service.create(dto, req.scope); }

  @Post(':id/register')
  register(@Param('id') id: string, @Body() dto: RegisterParticipantDto) { return this.service.registerParticipant(id, dto); }

  @Post(':id/unregister')
  unregister(@Param('id') id: string, @Body() dto: RegisterParticipantDto) { return this.service.unregisterParticipant(id, dto); }

  @Get(':id/participants')
  getParticipants(@Param('id') id: string) { return this.service.getParticipants(id); }

  @Post(':id/participants/import')
  importParticipants(@Param('id') id: string, @Body() importDto: { data: Array<{ candidateId?: string; id?: string }> }) { return this.service.importParticipants(id, importDto.data); }

  @Post(':id/graduate')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  graduate(@Param('id') id: string, @Body() dto: GraduateDto, @Req() req: ScopedRequest) { return this.service.graduate(id, dto, req.scope); }

  @Post(':id/generate-docs')
  generateDocs(@Param('id') id: string) { return this.service.generateDocuments(id); }
}
