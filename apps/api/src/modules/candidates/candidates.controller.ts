import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'Ambil semua kandidat' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  findAll(@Query() filter: CandidateFilterDto, @Req() req: ScopedRequest) {
    return this.candidatesService.findAll(filter, req.scope);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Ambil detail kandidat' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  findOne(@Param('id') id: string, @Req() req: ScopedRequest) {
    return this.candidatesService.findOne(id, req.scope);
  }

  @Post()
  @ApiOperation({ summary: 'Tambah kandidat baru' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  create(@Body() dto: CreateCandidateDto, @Req() req: ScopedRequest) {
    return this.candidatesService.create(dto, req.scope, req.user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Perbarui kandidat' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  update(@Param('id') id: string, @Body() dto: UpdateCandidateDto, @Req() req: ScopedRequest) {
    return this.candidatesService.update(id, dto, req.scope);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Hapus kandidat' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  remove(@Param('id') id: string, @Req() req: ScopedRequest) {
    return this.candidatesService.remove(id, req.scope);
  }

  @Post('import')
  @ApiOperation({ summary: 'Impor data kandidat' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  importCsv(@Body() data: any[]) {
    return this.candidatesService.importCsv(data);
  }

  @Post(':id/validate')
  @ApiOperation({ summary: 'Validasi kandidat' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  validate(@Param('id') id: string) {
    return this.candidatesService.validate(id);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Setujui kandidat' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  approve(@Param('id') id: string) {
    return this.candidatesService.approve(id);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Tolak kandidat' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  reject(@Param('id') id: string, @Body() body: { reason?: string }) {
    return this.candidatesService.reject(id, body.reason);
  }

  @Get('export/csv')
  @ApiOperation({ summary: 'Ekspor data kandidat' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  exportCsv(@Query() filter: CandidateFilterDto) {
    return this.candidatesService.exportCsv(filter);
  }
}
