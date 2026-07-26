import { Controller, Get, Post, Patch, Body, Param, Query, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { GraduationsService } from './graduations.service';
import {
  CreateGraduationDto,
  UpdateGraduationDto,
  GraduationFilterDto,
  RegisterParticipantDto,
  GraduateDto,
} from './dto/graduation.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequireScope } from '../../common/decorators/scope.decorator';
import { ScopedRequest } from '../../common/interfaces/user-scope.interface';

@ApiTags('Graduations')
@Controller('graduations')
@ApiBearerAuth()
export class GraduationsController {
  constructor(private readonly service: GraduationsService) {}

  @Get()
  @ApiOperation({ summary: 'Ambil semua wisuda' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan')
  @RequireScope('branch')
  findAll(@Query() query: GraduationFilterDto, @Req() req: ScopedRequest) {
    return this.service.findAll(query, req.scope);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Ambil detail wisuda' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan')
  @RequireScope('branch')
  findOne(@Param('id') id: string, @Req() req: ScopedRequest) {
    return this.service.findOne(id, req.scope);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Perbarui pendadaran' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan')
  @RequireScope('branch')
  update(@Param('id') id: string, @Body() dto: UpdateGraduationDto) {
    return this.service.update(id, dto);
  }

  @Post()
  @ApiOperation({ summary: 'Tambah wisuda baru' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan')
  @RequireScope('branch')
  create(@Body() dto: CreateGraduationDto, @Req() req: ScopedRequest) {
    return this.service.create(dto, req.scope);
  }

  @Post(':id/register')
  @ApiOperation({ summary: 'Daftarkan peserta wisuda' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan')
  @RequireScope('branch')
  register(@Param('id') id: string, @Body() dto: RegisterParticipantDto) {
    return this.service.registerParticipant(id, dto);
  }

  @Post(':id/unregister')
  @ApiOperation({ summary: 'Batalkan pendaftaran wisuda' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan')
  @RequireScope('branch')
  unregister(@Param('id') id: string, @Body() dto: RegisterParticipantDto) {
    return this.service.unregisterParticipant(id, dto);
  }

  @Get(':id/participants')
  @ApiOperation({ summary: 'Ambil peserta wisuda' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan')
  @RequireScope('branch')
  getParticipants(@Param('id') id: string) {
    return this.service.getParticipants(id);
  }

  @Post(':id/participants/import')
  @ApiOperation({ summary: 'Impor peserta wisuda' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan')
  @RequireScope('branch')
  importParticipants(
    @Param('id') id: string,
    @Body() importDto: { data: Array<{ candidateId?: string; id?: string }> },
  ) {
    return this.service.importParticipants(id, importDto.data);
  }

  @Post(':id/graduate')
  @ApiOperation({ summary: 'Wisuda peserta' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  graduate(@Param('id') id: string, @Body() dto: GraduateDto, @Req() req: ScopedRequest) {
    return this.service.graduate(id, dto, req.scope);
  }

  @Post(':id/generate-docs')
  @ApiOperation({ summary: 'Generate dokumen wisuda' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  generateDocs(@Param('id') id: string) {
    return this.service.generateDocuments(id);
  }
}
