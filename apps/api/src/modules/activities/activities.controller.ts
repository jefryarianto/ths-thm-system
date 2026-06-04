import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ActivitiesService } from './activities.service';
import { CreateActivityDto, UpdateActivityDto, ActivityFilterDto, AddParticipantDto, RecordPresenceDto, UploadActivityDocumentDto } from './dto/activity.dto';

@ApiTags('Activities')
@Controller('activities')
@ApiBearerAuth()
export class ActivitiesController {
  constructor(private readonly service: ActivitiesService) {}
  @Get() findAll(@Query() q: ActivityFilterDto) { return this.service.findAll(q); }
  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(id); }
  @Post() create(@Body() dto: CreateActivityDto) { return this.service.create(dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateActivityDto) { return this.service.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.service.remove(id); }
  @Post(':id/participants') addParticipant(@Param('id') id: string, @Body() dto: AddParticipantDto) { return this.service.addParticipant(id, dto); }
  @Delete(':id/participants/:pid') removeParticipant(@Param('id') id: string, @Param('pid') pid: string) { return this.service.removeParticipant(id, pid); }
  @Post(':id/participants/import') importParticipants(@Param('id') id: string, @Body() importDto: { data: Array<{ anggotaId?: string; memberId?: string }> }) { return this.service.importParticipants(id, importDto.data); }
  @Get(':id/presence') getPresence(@Param('id') id: string) { return this.service.getPresence(id); }
  @Post(':id/presence') recordPresence(@Param('id') id: string, @Body() dto: RecordPresenceDto) { return this.service.recordPresence(id, dto); }
  @Get(':id/documents') getDocuments(@Param('id') id: string) { return this.service.getDocuments(id); }
  @Post(':id/documents') uploadDocument(@Param('id') id: string, @Body() dto: UploadActivityDocumentDto) { return this.service.uploadDocument(id, dto); }
}
