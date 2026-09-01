import { Controller, Get, Post, Patch, Put, Delete, Body, Param, Query, Req, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiBody, ApiOkResponse } from '@nestjs/swagger';
import { PenandatanganService, DOKUMEN_SIGNER_TYPES } from './penandatangan.service';
import { CreatePenandatanganDto, UpdatePenandatanganDto } from './dto/penandatangan.dto';
import { CrudAuth } from '../../common/decorators/crud-auth.decorator';
import { ScopedRequest } from '../../common/interfaces/user-scope.interface';
import { resolveWriteDistrikId, resolveReadDistrikId } from '../../common/utils/distrik-scope';

@ApiTags('Penandatangan')
@Controller('penandatangan')
@ApiBearerAuth()
export class PenandatanganController {
  constructor(private readonly service: PenandatanganService) {}

  @Get()
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', {
    summary: 'Daftar penandatangan (termasuk cakupan distrik masing-masing)',
  })
  findAll(@Req() req: ScopedRequest) {
    return this.service.findAll({
      role: req?.user?.role,
      distrikId: req?.scope?.distrikId,
    });
  }

  @Get('active')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', {
    summary: 'Penandatangan aktif — rantai: distrik pemanggil → global',
  })
  findActive(@Req() req: ScopedRequest, @Query('distrikId') distrikId?: string) {
    return this.service.findActive(resolveReadDistrikId(req, distrikId) ?? undefined);
  }

  @Post()
  @CrudAuth('superadmin', 'admin_distrik', { summary: 'Tambah penandatangan baru (scope distrik opsional)' })
  create(@Req() req: ScopedRequest, @Body() dto: CreatePenandatanganDto) {
    dto.distrikId = resolveWriteDistrikId(req, dto.distrikId ?? null) ?? undefined;
    return this.service.create(dto);
  }

  @Patch(':id')
  @CrudAuth('superadmin', 'admin_distrik', { summary: 'Update penandatangan' })
  update(@Req() req: ScopedRequest, @Param('id') id: string, @Body() dto: UpdatePenandatanganDto) {
    return this.service.update(id, dto, { role: req?.user?.role, distrikId: req?.scope?.distrikId });
  }

  // ── Penugasan per tipe dokumen (1-3 penandatangan, per scope distrik) ──

  @Get('dokumen')
  @CrudAuth('superadmin', 'admin_distrik', {
    summary: 'Penugasan penandatangan per tipe dokumen pada scope (query: distrikId, default global)',
  })
  getDocSigners(@Req() req: ScopedRequest, @Query('distrikId') distrikId?: string) {
    return this.service.getDocSignerAssignments(resolveReadDistrikId(req, distrikId) ?? undefined);
  }

  @Put('dokumen/:type')
  @CrudAuth('superadmin', 'admin_distrik', {
    summary: 'Set penandatangan untuk satu tipe dokumen pada scope (1-3 orang)',
  })
  @ApiBody({ description: '{ penandatanganIds: string[], distrikId?: string } — urutan = posisi tanda tangan' })
  @ApiOkResponse({ description: 'Penugasan tersimpan' })
  setDocSigners(
    @Req() req: ScopedRequest,
    @Param('type') type: string,
    @Body() body: { penandatanganIds?: string[]; distrikId?: string | null },
  ) {
    if (!DOKUMEN_SIGNER_TYPES.some((t) => t.type === type)) {
      throw new BadRequestException('Tipe dokumen tidak dikenal');
    }
    return this.service.setDocSigners(
      type,
      body.penandatanganIds || [],
      resolveWriteDistrikId(req, body.distrikId ?? null),
    );
  }

  @Delete(':id')
  @CrudAuth('superadmin', { summary: 'Hapus penandatangan' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
