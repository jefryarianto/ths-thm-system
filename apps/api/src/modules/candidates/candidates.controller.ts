import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req, Res } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CandidatesService } from './candidates.service';
import { CreateCandidateDto, UpdateCandidateDto, CandidateFilterDto } from './dto/candidate.dto';
import { CrudAuth } from '../../common/decorators/crud-auth.decorator';
import { ScopedRequest } from '../../common/interfaces/user-scope.interface';
import { Response } from 'express';

@ApiTags('Candidates')
@Controller('candidates')
@ApiBearerAuth()
export class CandidatesController {
  constructor(private readonly candidatesService: CandidatesService) {}

  @Get()
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Ambil semua kandidat' })
  findAll(@Query() filter: CandidateFilterDto, @Req() req: ScopedRequest) {
    return this.candidatesService.findAll(filter, req.scope);
  }

  @Get(':id')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Ambil detail kandidat' })
  findOne(@Param('id') id: string, @Req() req: ScopedRequest) {
    return this.candidatesService.findOne(id, req.scope);
  }

  @Post()
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Tambah kandidat baru' })
  create(@Body() dto: CreateCandidateDto, @Req() req: ScopedRequest) {
    return this.candidatesService.create(dto, req.scope, req.user.id);
  }

  @Patch(':id')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Perbarui kandidat' })
  update(@Param('id') id: string, @Body() dto: UpdateCandidateDto, @Req() req: ScopedRequest) {
    return this.candidatesService.update(id, dto, req.scope);
  }

  @Delete(':id')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Hapus kandidat' })
  remove(@Param('id') id: string, @Req() req: ScopedRequest) {
    return this.candidatesService.remove(id, req.scope);
  }

  @Post('import')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Impor data kandidat' })
  importCsv(@Body() data: any[]) {
    return this.candidatesService.importCsv(data);
  }

  @Post(':id/validate')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Validasi kandidat' })
  validate(@Param('id') id: string) {
    return this.candidatesService.validate(id);
  }

  @Post(':id/approve')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Setujui kandidat (lulus pendadaran)' })
  approve(@Param('id') id: string, @Body() dto: { tempatDadar?: string; tahunDadar?: string; tingkat?: string }) {
    return this.candidatesService.approve(id, dto);
  }

  @Post(':id/reject')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Tolak kandidat' })
  reject(@Param('id') id: string, @Body() body: { reason?: string }) {
    return this.candidatesService.reject(id, body.reason);
  }

  @Get('export/csv')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Download data kandidat sebagai CSV' })
  async exportCsv(@Query() filter: CandidateFilterDto, @Req() req: ScopedRequest, @Res() res: Response) {
    const csv = await this.candidatesService.exportCsv(filter, req.scope);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="calon-anggota.csv"');
    res.send(csv);
  }
}
