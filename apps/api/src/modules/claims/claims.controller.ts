import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ClaimsService } from './claims.service';
import { CreateClaimDto, UpdateClaimDto, ClaimFilterDto, RejectClaimDto } from './dto/claim.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequireScope } from '../../common/decorators/scope.decorator';
import { ScopedRequest } from '../../common/interfaces/user-scope.interface';

@ApiTags('Claims')
@Controller('claims')
@ApiBearerAuth()
export class ClaimsController {
  constructor(private readonly service: ClaimsService) {}

  @Get()
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  findAll(@Query() q: ClaimFilterDto, @Req() req: ScopedRequest) { return this.service.findAll(q, req.scope); }

  @Get(':id')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  findOne(@Param('id') id: string, @Req() req: ScopedRequest) { return this.service.findOne(id, req.scope); }

  @Post()
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'anggota')
  @RequireScope('branch')
  create(@Body() dto: CreateClaimDto) { return this.service.create(dto); }

  @Patch(':id')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  update(@Param('id') id: string, @Body() dto: UpdateClaimDto, @Req() req: ScopedRequest) { return this.service.update(id, dto, req.scope); }

  @Delete(':id')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah')
  @RequireScope('branch')
  remove(@Param('id') id: string, @Req() req: ScopedRequest) { return this.service.remove(id, req.scope); }

  @Post(':id/approve')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  approve(@Param('id') id: string, @Req() req: ScopedRequest) { return this.service.approve(id, req.scope); }

  @Post(':id/reject')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  reject(@Param('id') id: string, @Body() b: RejectClaimDto, @Req() req: ScopedRequest) { return this.service.reject(id, b?.reason, req.scope); }

  @Post(':id/process')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  process(@Param('id') id: string, @Req() req: ScopedRequest) { return this.service.process(id, req.scope); }
}
