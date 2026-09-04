import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { KepengurusanService } from './kepengurusan.service';
import { CrudAuth } from '../../common/decorators/crud-auth.decorator';
import { ScopedRequest } from '../../common/interfaces/user-scope.interface';

@ApiTags('Kepengurusan')
@Controller('kepengurusan')
@ApiBearerAuth()
export class KepengurusanController {
  constructor(private readonly service: KepengurusanService) {}

  @Get()
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Daftar kepengurusan (filter by level, unit, periode)' })
  @ApiQuery({ name: 'level', required: false })
  @ApiQuery({ name: 'unitId', required: false })
  @ApiQuery({ name: 'periodeId', required: false })
  findAll(
    @Query('level') level?: string,
    @Query('unitId') unitId?: string,
    @Query('periodeId') periodeId?: string,
    @Query('status') status?: string,
    @Req() req?: ScopedRequest,
  ) {
    const scope = req?.scope;
    return this.service.findAll({ level, unitId, periodeId, status, scope });
  }

  @Get(':id')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Detail kepengurusan' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Tambah kepengurusan baru' })
  create(@Body() body: {
    userId?: string;
    anggotaId?: string;
    jabatanId: string;
    periodeId: string;
    nasionalId?: string;
    distrikId?: string;
    wilayahId?: string;
    rantingId?: string;
    parentId?: string;
    startDate?: string;
    endDate?: string;
  }, @Req() req?: ScopedRequest) {
    return this.service.create(body, req?.scope);
  }

  @Patch(':id')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Update kepengurusan' })
  update(@Param('id') id: string, @Body() body: {
    userId?: string;
    anggotaId?: string;
    jabatanId?: string;
    parentId?: string | null;
    startDate?: string | null;
    endDate?: string | null;
  }) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Hapus kepengurusan (memerlukan persetujuan)' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Get('export')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Export kepengurusan ke CSV' })
  @ApiQuery({ name: 'level', required: false })
  @ApiQuery({ name: 'unitId', required: false })
  @ApiQuery({ name: 'periodeId', required: false })
  exportCsv(
    @Query('level') level?: string,
    @Query('unitId') unitId?: string,
    @Query('periodeId') periodeId?: string,
    @Req() req?: ScopedRequest,
  ) {
    return this.service.exportCsv({ level, unitId, periodeId, scope: req?.scope });
  }

  @Post('import')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Import kepengurusan dari CSV' })
  importCsv(@Body() body: { rows: Array<Record<string, string>> }, @Req() req?: ScopedRequest) {
    return this.service.importCsv(body.rows, req?.scope);
  }

  @Patch(':id/reparent')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Pindahkan parent kepengurusan (drag-drop)' })
  reparent(@Param('id') id: string, @Body() body: { parentId: string | null }) {
    return this.service.reparent(id, body.parentId);
  }

  // ── Approval workflow ──

  @Get('pending')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Daftar kepengurusan menunggu persetujuan' })
  findPending(@Req() req?: ScopedRequest) {
    return this.service.findAll({ status: 'pending', scope: req?.scope });
  }

  @Patch(':id/approve')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Setujui perubahan kepengurusan' })
  approve(@Param('id') id: string, @Req() req?: ScopedRequest) {
    return this.service.approve(id, req?.user?.id || 'system');
  }

  @Patch(':id/reject')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Tolak perubahan kepengurusan' })
  reject(@Param('id') id: string, @Body() body: { reason?: string }) {
    return this.service.reject(id, body.reason || '');
  }

  @Post('bulk-approve')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Setujui beberapa perubahan sekaligus' })
  bulkApprove(@Body() body: { ids: string[] }, @Req() req?: ScopedRequest) {
    return this.service.bulkApprove(body.ids || [], req?.user?.id || 'system');
  }

  @Post('bulk-reject')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Tolak beberapa perubahan sekaligus' })
  bulkReject(@Body() body: { ids: string[]; reason?: string }) {
    return this.service.bulkReject(body.ids || [], body.reason || '');
  }
}
