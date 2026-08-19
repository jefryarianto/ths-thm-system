import { Controller, Get, Post, Body, Param, Query, Req, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { MutationsService } from './mutations.service';
import { CrudAuth } from '../../common/decorators/crud-auth.decorator';
import { ScopedRequest } from '../../common/interfaces/user-scope.interface';
import { CreateMutationDto, MutationActionDto } from './dto/mutation.dto';

@ApiTags('Mutations')
@Controller('mutations')
@ApiBearerAuth()
export class MutationsController {
  constructor(private readonly service: MutationsService) {}

  @Post()
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Ajukan mutasi anggota' })
  create(@Body() dto: CreateMutationDto, @Req() req: ScopedRequest) {
    return this.service.create(dto, req.user.id, req.user.role, req.scope);
  }

  @Get('member/:anggotaId')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Riwayat mutasi per anggota' })
  listForMember(@Param('anggotaId', ParseUUIDPipe) anggotaId: string, @Req() req: ScopedRequest) {
    return this.service.listForMember(anggotaId, req.scope);
  }

  @Get()
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Daftar permintaan mutasi' })
  findAll(@Query('status') status: string | undefined, @Req() req: ScopedRequest) {
    return this.service.findAll(status, req.scope, req.user.id, req.user.role);
  }

  @Get(':id')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Detail permintaan mutasi' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: ScopedRequest) {
    return this.service.findOne(id, req.scope, req.user.id, req.user.role);
  }

  @Post(':id/approve')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Setujui tahap mutasi' })
  approve(@Param('id', ParseUUIDPipe) id: string, @Body() dto: MutationActionDto, @Req() req: ScopedRequest) {
    return this.service.approve(id, req.user.id, dto.note, req.user.role, req.scope);
  }

  @Post(':id/reject')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Tolak permintaan mutasi' })
  reject(@Param('id', ParseUUIDPipe) id: string, @Body() dto: MutationActionDto, @Req() req: ScopedRequest) {
    return this.service.reject(id, req.user.id, dto.note, req.user.role, req.scope);
  }
}