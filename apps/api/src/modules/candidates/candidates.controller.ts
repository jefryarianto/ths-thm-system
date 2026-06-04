import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CandidatesService } from './candidates.service';
import { CreateCandidateDto, UpdateCandidateDto, CandidateFilterDto } from './dto/candidate.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequireScope } from '../../common/decorators/scope.decorator';

@ApiTags('Candidates')
@Controller('candidates')
@ApiBearerAuth()
export class CandidatesController {
  constructor(private readonly candidatesService: CandidatesService) {}

  @Get()
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  findAll(@Query() filter: CandidateFilterDto) {
    return this.candidatesService.findAll(filter);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.candidatesService.findOne(id);
  }

  @Post()
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  create(@Body() dto: CreateCandidateDto) {
    return this.candidatesService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCandidateDto) {
    return this.candidatesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.candidatesService.remove(id);
  }

  @Post('import')
  importCsv(@Body() data: any[]) {
    return this.candidatesService.importCsv(data);
  }

  @Post(':id/validate')
  validate(@Param('id') id: string) {
    return this.candidatesService.validate(id);
  }

  @Post(':id/approve')
  approve(@Param('id') id: string) {
    return this.candidatesService.approve(id);
  }

  @Post(':id/reject')
  reject(@Param('id') id: string, @Body() body: { reason?: string }) {
    return this.candidatesService.reject(id, body.reason);
  }

  @Get('export/csv')
  exportCsv(@Query() filter: CandidateFilterDto) {
    return this.candidatesService.exportCsv(filter);
  }
}