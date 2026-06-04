import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { MembersService } from './members.service';
import { CreateMemberDto, UpdateMemberDto, MemberFilterDto } from './dto/member.dto';
import { RequireScope } from '../../common/decorators/scope.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Members')
@Controller('members')
@ApiBearerAuth()
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', 'penguji', 'anggota')
  @RequireScope('branch')
  findAll(@Query() filter: MemberFilterDto) {
    return this.membersService.findAll(filter);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.membersService.findOne(id);
  }

  @Post()
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  create(@Body() dto: CreateMemberDto) {
    return this.membersService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateMemberDto) {
    return this.membersService.update(id, dto);
  }

  @Delete(':id')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  remove(@Param('id') id: string) {
    return this.membersService.remove(id);
  }

  @Post('import')
  importCsv(@Body() data: any[]) {
    return this.membersService.importCsv(data);
  }

  @Get('export/csv')
  exportCsv(@Query() filter: MemberFilterDto) {
    return this.membersService.exportCsv(filter);
  }

  @Post(':id/validate')
  validate(@Param('id') id: string) {
    return this.membersService.validate(id);
  }

  @Post(':id/approve')
  approve(@Param('id') id: string) {
    return this.membersService.approve(id);
  }

  @Patch(':id/suspend')
  suspend(@Param('id') id: string) {
    return this.membersService.suspend(id);
  }

  @Patch(':id/reactivate')
  reactivate(@Param('id') id: string) {
    return this.membersService.reactivate(id);
  }

  @Get(':id/documents')
  getDocuments(@Param('id') id: string) {
    return this.membersService.getDocuments(id);
  }

  @Get(':id/dues')
  getDues(@Param('id') id: string) {
    return this.membersService.getDues(id);
  }
}