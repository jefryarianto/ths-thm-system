import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { MembersService } from './members.service';
import { CreateMemberDto, UpdateMemberDto, MemberFilterDto } from './dto/member.dto';
import { RequireScope } from '../../common/decorators/scope.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ScopedRequest } from '../../common/interfaces/user-scope.interface';

@ApiTags('Members')
@Controller('members')
@ApiBearerAuth()
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', 'penguji', 'anggota')
  @RequireScope('branch')
  findAll(@Query() filter: MemberFilterDto, @Req() req: ScopedRequest) {
    return this.membersService.findAll(filter, req.scope);
  }

  @Get(':id')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', 'penguji', 'anggota')
  @RequireScope('branch')
  findOne(@Param('id') id: string, @Req() req: ScopedRequest) {
    return this.membersService.findOne(id, req.scope);
  }

  @Post()
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  create(@Body() dto: CreateMemberDto, @Req() req: ScopedRequest) {
    return this.membersService.create(dto, req.scope);
  }

  @Patch(':id')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  update(@Param('id') id: string, @Body() dto: UpdateMemberDto, @Req() req: ScopedRequest) {
    return this.membersService.update(id, dto, req.scope);
  }

  @Delete(':id')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  remove(@Param('id') id: string, @Req() req: ScopedRequest) {
    return this.membersService.remove(id, req.scope);
  }

  @Post('import')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  importCsv(@Body() data: any[], @Req() req: ScopedRequest) {
    return this.membersService.importCsv(data, req.scope);
  }

  @Get('export/csv')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  exportCsv(@Query() filter: MemberFilterDto, @Req() req: ScopedRequest) {
    return this.membersService.exportCsv(filter, req.scope);
  }

  @Post(':id/validate')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  validate(@Param('id') id: string) {
    return this.membersService.validate(id);
  }

  @Post(':id/approve')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  approve(@Param('id') id: string) {
    return this.membersService.approve(id);
  }

  @Patch(':id/suspend')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  suspend(@Param('id') id: string) {
    return this.membersService.suspend(id);
  }

  @Patch(':id/reactivate')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  reactivate(@Param('id') id: string) {
    return this.membersService.reactivate(id);
  }

  @Get(':id/documents')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'anggota')
  @RequireScope('branch')
  getDocuments(@Param('id') id: string) {
    return this.membersService.getDocuments(id);
  }

  @Get(':id/dues')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'anggota')
  @RequireScope('branch')
  getDues(@Param('id') id: string) {
    return this.membersService.getDues(id);
  }
}
