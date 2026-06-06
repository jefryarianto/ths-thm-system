import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CandidatesService } from './candidates.service';
import { CreateCandidateDto, UpdateCandidateDto, CandidateFilterDto } from './dto/candidate.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequireScope } from '../../common/decorators/scope.decorator';
import { ScopedRequest } from '../../common/interfaces/user-scope.interface';

@ApiTags('Candidates')
@Controller('candidates')
@ApiBearerAuth()
export class CandidatesController {
  constructor(private readonly candidatesService: CandidatesService) {}

  @Get()
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  findAll(@Query() filter: CandidateFilterDto, @Req() req: ScopedRequest) {
    return this.candidatesService.findAll(filter, req.scope);
  }

  @Get(':id')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  findOne(@Param('id') id: string, @Req() req: ScopedRequest) {
    return this.candidatesService.findOne(id, req.scope);
  }

  @Post()
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  create(@Body() dto: CreateCandidateDto, @Req() req: ScopedRequest) {
    return this.candidatesService.create(dto, req.scope);
  }

  @Patch(':id')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  update(@Param('id') id: string, @Body() dto: UpdateCandidateDto, @Req() req: ScopedRequest) {
    return this.candidatesService.update(id, dto, req.scope);
  }

  @Delete(':id')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  remove(@Param('id') id: string, @Req() req: ScopedRequest) {
    return this.candidatesService.remove(id, req.scope);
  }

  @Post('import')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  importCsv(@Body() data: any[]) {
    return this.candidatesService.importCsv(data);
  }

  @Post(':id/validate')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  validate(@Param('id') id: string) {
    return this.candidatesService.validate(id);
  }

  @Post(':id/approve')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  approve(@Param('id') id: string) {
    return this.candidatesService.approve(id);
  }

  @Post(':id/reject')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  reject(@Param('id') id: string, @Body() body: { reason?: string }) {
    return this.candidatesService.reject(id, body.reason);
  }

  @Get('export/csv')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  exportCsv(@Query() filter: CandidateFilterDto) {
    return this.candidatesService.exportCsv(filter);
  }
}
