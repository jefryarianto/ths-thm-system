import { Controller, Get, Post, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { GraduationsService } from './graduations.service';

@ApiTags('Graduations')
@Controller('graduations')
@ApiBearerAuth()
export class GraduationsController {
  constructor(private readonly service: GraduationsService) {}

  @Get()
  findAll(@Query() query: any) { return this.service.findAll(query); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  create(@Body() dto: any) { return this.service.create(dto); }

  @Post(':id/register')
  register(@Param('id') id: string, @Body() dto: any) { return this.service.registerParticipant(id, dto); }

  @Post(':id/unregister')
  unregister(@Param('id') id: string, @Body() dto: any) { return this.service.unregisterParticipant(id, dto); }

  @Get(':id/participants')
  getParticipants(@Param('id') id: string) { return this.service.getParticipants(id); }

  @Post(':id/participants/import')
  importParticipants(@Param('id') id: string, @Body() data: any[]) { return this.service.importParticipants(id, data); }

  @Post(':id/graduate')
  graduate(@Param('id') id: string, @Body() dto: any) { return this.service.graduate(id, dto); }

  @Post(':id/generate-docs')
  generateDocs(@Param('id') id: string) { return this.service.generateDocuments(id); }
}