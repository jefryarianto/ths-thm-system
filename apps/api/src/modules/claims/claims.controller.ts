import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ClaimsService } from './claims.service';
import { CreateClaimDto, UpdateClaimDto, ClaimFilterDto, RejectClaimDto } from './dto/claim.dto';
import { CrudAuth } from '../../common/decorators/crud-auth.decorator';
import { ScopedRequest } from '../../common/interfaces/user-scope.interface';

@ApiTags('Claims')
@Controller('claims')
@ApiBearerAuth()
export class ClaimsController {
  constructor(private readonly service: ClaimsService) {}

  @Get()
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Ambil semua klaim' })
  findAll(@Query() q: ClaimFilterDto, @Req() req: ScopedRequest) {
    return this.service.findAll(q, req.scope);
  }

  @Get(':id')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Ambil detail klaim' })
  findOne(@Param('id') id: string, @Req() req: ScopedRequest) {
    return this.service.findOne(id, req.scope);
  }

  @Post()
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'anggota', { summary: 'Tambah klaim baru' })
  create(@Body() dto: CreateClaimDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Perbarui klaim' })
  update(@Param('id') id: string, @Body() dto: UpdateClaimDto, @Req() req: ScopedRequest) {
    return this.service.update(id, dto, req.scope);
  }

  @Delete(':id')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', { summary: 'Hapus klaim' })
  remove(@Param('id') id: string, @Req() req: ScopedRequest) {
    return this.service.remove(id, req.scope);
  }

  @Post(':id/approve')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Setujui klaim' })
  approve(@Param('id') id: string, @Req() req: ScopedRequest) {
    return this.service.approve(id, req.scope);
  }

  @Post(':id/reject')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Tolak klaim' })
  reject(@Param('id') id: string, @Body() b: RejectClaimDto, @Req() req: ScopedRequest) {
    return this.service.reject(id, b?.reason, req.scope);
  }

  @Post(':id/process')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Proses klaim' })
  process(@Param('id') id: string, @Req() req: ScopedRequest) {
    return this.service.process(id, req.scope);
  }
}
