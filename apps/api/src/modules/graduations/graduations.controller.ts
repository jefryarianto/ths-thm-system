import { Controller, Get, Post, Patch, Body, Param, Query, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { GraduationsService } from './graduations.service';
import {
  CreateGraduationDto,
  UpdateGraduationDto,
  GraduationFilterDto,
  RegisterParticipantDto,
  GraduateDto,
} from './dto/graduation.dto';
import { CrudAuth } from '../../common/decorators/crud-auth.decorator';
import { ScopedRequest } from '../../common/interfaces/user-scope.interface';

@ApiTags('Graduations')
@Controller('graduations')
@ApiBearerAuth()
export class GraduationsController {
  constructor(private readonly service: GraduationsService) {}

  // ── CRUD endpoints ──

  @Get()
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', { summary: 'Ambil semua wisuda' })
  findAll(@Query() query: GraduationFilterDto, @Req() req: ScopedRequest) {
    return this.service.findAll(query, req.scope);
  }

  @Get(':id')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', { summary: 'Ambil detail wisuda' })
  findOne(@Param('id') id: string, @Req() req: ScopedRequest) {
    return this.service.findOne(id, req.scope);
  }

  @Patch(':id')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', { summary: 'Perbarui pendadaran' })
  update(@Param('id') id: string, @Body() dto: UpdateGraduationDto) {
    return this.service.update(id, dto);
  }

  @Post()
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', { summary: 'Tambah wisuda baru' })
  create(@Body() dto: CreateGraduationDto, @Req() req: ScopedRequest) {
    return this.service.create(dto, req.scope, req.user?.id);
  }

  // ── Participant endpoints ──

  @Post(':id/register')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', { summary: 'Daftarkan peserta wisuda' })
  register(@Param('id') id: string, @Body() dto: RegisterParticipantDto) {
    return this.service.registerParticipant(id, dto);
  }

  @Post(':id/unregister')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', { summary: 'Batalkan pendaftaran wisuda' })
  unregister(@Param('id') id: string, @Body() dto: RegisterParticipantDto) {
    return this.service.unregisterParticipant(id, dto);
  }

  @Get(':id/participants')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', { summary: 'Ambil peserta wisuda' })
  getParticipants(@Param('id') id: string) {
    return this.service.getParticipants(id);
  }

  @Post(':id/participants/import')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', { summary: 'Impor peserta wisuda' })
  importParticipants(
    @Param('id') id: string,
    @Body() importDto: { data: Array<{ candidateId?: string; id?: string }> },
  ) {
    return this.service.importParticipants(id, importDto.data);
  }

  // ── Graduate & Documents ──

  @Post(':id/graduate')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Wisuda peserta' })
  graduate(@Param('id') id: string, @Body() dto: GraduateDto, @Req() req: ScopedRequest) {
    return this.service.graduate(id, dto, req.scope);
  }

  @Post(':id/generate-docs')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Generate dokumen wisuda' })
  generateDocs(@Param('id') id: string) {
    return this.service.generateDocuments(id);
  }
}
