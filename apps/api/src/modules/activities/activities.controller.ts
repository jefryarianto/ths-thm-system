import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ActivitiesService } from './activities.service';
import {
  CreateActivityDto,
  UpdateActivityDto,
  ActivityFilterDto,
  AddParticipantDto,
  RecordPresenceDto,
  UploadActivityDocumentDto,
} from './dto/activity.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequireScope } from '../../common/decorators/scope.decorator';
import { ScopedRequest } from '../../common/interfaces/user-scope.interface';

@ApiTags('Activities')
@Controller('activities')
@ApiBearerAuth()
export class ActivitiesController {
  constructor(private readonly service: ActivitiesService) {}
  @Get()
  @ApiOperation({ summary: 'Ambil semua kegiatan' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan')
  @RequireScope('branch')
  findAll(@Query() q: ActivityFilterDto, @Req() req: ScopedRequest) {
    return this.service.findAll(q, req.scope);
  }
  @Get(':id')
  @ApiOperation({ summary: 'Ambil detail kegiatan' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan')
  @RequireScope('branch')
  findOne(@Param('id') id: string, @Req() req: ScopedRequest) {
    return this.service.findOne(id, req.scope);
  }
  @Post()
  @ApiOperation({ summary: 'Tambah kegiatan baru' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan')
  @RequireScope('branch')
  create(@Body() dto: CreateActivityDto, @Req() req: ScopedRequest) {
    return this.service.create(dto, req.scope, req.user.id);
  }
  @Patch(':id')
  @ApiOperation({ summary: 'Perbarui kegiatan' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan')
  @RequireScope('branch')
  update(@Param('id') id: string, @Body() dto: UpdateActivityDto, @Req() req: ScopedRequest) {
    return this.service.update(id, dto, req.scope);
  }
  @Delete(':id')
  @ApiOperation({ summary: 'Hapus kegiatan' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  remove(@Param('id') id: string, @Req() req: ScopedRequest) {
    return this.service.remove(id, req.scope);
  }
  @Post(':id/participants')
  @ApiOperation({ summary: 'Tambah peserta kegiatan' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan')
  @RequireScope('branch')
  addParticipant(@Param('id') id: string, @Body() dto: AddParticipantDto) {
    return this.service.addParticipant(id, dto);
  }
  @Delete(':id/participants/:pid')
  @ApiOperation({ summary: 'Hapus peserta kegiatan' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan')
  @RequireScope('branch')
  removeParticipant(@Param('id') id: string, @Param('pid') pid: string) {
    return this.service.removeParticipant(id, pid);
  }
  @Post(':id/participants/import')
  @ApiOperation({ summary: 'Impor peserta kegiatan' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan')
  @RequireScope('branch')
  importParticipants(
    @Param('id') id: string,
    @Body() importDto: { data: Array<{ anggotaId?: string; memberId?: string }> },
  ) {
    return this.service.importParticipants(id, importDto.data);
  }
  @Get(':id/presence')
  @ApiOperation({ summary: 'Ambil presensi kegiatan' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan')
  @RequireScope('branch')
  getPresence(@Param('id') id: string) {
    return this.service.getPresence(id);
  }
  @Post(':id/presence')
  @ApiOperation({ summary: 'Catat presensi kegiatan' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan')
  @RequireScope('branch')
  recordPresence(@Param('id') id: string, @Body() dto: RecordPresenceDto) {
    return this.service.recordPresence(id, dto);
  }
  @Get(':id/documents')
  @ApiOperation({ summary: 'Ambil dokumen kegiatan' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan')
  @RequireScope('branch')
  getDocuments(@Param('id') id: string) {
    return this.service.getDocuments(id);
  }
  @Post(':id/documents')
  @ApiOperation({ summary: 'Unggah dokumen kegiatan' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan')
  @RequireScope('branch')
  uploadDocument(@Param('id') id: string, @Body() dto: UploadActivityDocumentDto) {
    return this.service.uploadDocument(id, dto);
  }
}
