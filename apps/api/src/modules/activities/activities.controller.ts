import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ActivitiesService } from './activities.service';
import { CreateActivityDto, UpdateActivityDto, ActivityFilterDto, AddParticipantDto, RecordPresenceDto, UploadActivityDocumentDto } from './dto/activity.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequireScope } from '../../common/decorators/scope.decorator';
import { ScopedRequest } from '../../common/interfaces/user-scope.interface';

@ApiTags('Activities')
@Controller('activities')
@ApiBearerAuth()
export class ActivitiesController {
  constructor(private readonly service: ActivitiesService) {}
  @Get()
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan')
  @RequireScope('branch')
  findAll(@Query() q: ActivityFilterDto, @Req() req: ScopedRequest) { return this.service.findAll(q, req.scope); }
  @Get(':id') findOne(@Param('id') id: string, @Req() req: ScopedRequest) { return this.service.findOne(id, req.scope); }
  @Post()
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan')
  @RequireScope('branch')
  create(@Body() dto: CreateActivityDto, @Req() req: ScopedRequest) { return this.service.create(dto, req.scope); }
  @Patch(':id')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan')
  @RequireScope('branch')
  update(@Param('id') id: string, @Body() dto: UpdateActivityDto, @Req() req: ScopedRequest) { return this.service.update(id, dto, req.scope); }
  @Delete(':id')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  remove(@Param('id') id: string, @Req() req: ScopedRequest) { return this.service.remove(id, req.scope); }
  @Post(':id/participants') addParticipant(@Param('id') id: string, @Body() dto: AddParticipantDto) { return this.service.addParticipant(id, dto); }
  @Delete(':id/participants/:pid') removeParticipant(@Param('id') id: string, @Param('pid') pid: string) { return this.service.removeParticipant(id, pid); }
  @Post(':id/participants/import') importParticipants(@Param('id') id: string, @Body() importDto: { data: Array<{ anggotaId?: string; memberId?: string }> }) { return this.service.importParticipants(id, importDto.data); }
  @Get(':id/presence') getPresence(@Param('id') id: string) { return this.service.getPresence(id); }
  @Post(':id/presence') recordPresence(@Param('id') id: string, @Body() dto: RecordPresenceDto) { return this.service.recordPresence(id, dto); }
  @Get(':id/documents') getDocuments(@Param('id') id: string) { return this.service.getDocuments(id); }
  @Post(':id/documents') uploadDocument(@Param('id') id: string, @Body() dto: UploadActivityDocumentDto) { return this.service.uploadDocument(id, dto); }
}
