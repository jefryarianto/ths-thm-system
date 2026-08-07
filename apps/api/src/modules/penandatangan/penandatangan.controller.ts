import { Controller, Get, Post, Patch, Put, Delete, Body, Param, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiBody, ApiOkResponse } from '@nestjs/swagger';
import { PenandatanganService, DOKUMEN_SIGNER_TYPES } from './penandatangan.service';
import { CreatePenandatanganDto, UpdatePenandatanganDto } from './dto/penandatangan.dto';
import { CrudAuth } from '../../common/decorators/crud-auth.decorator';

@ApiTags('Penandatangan')
@Controller('penandatangan')
@ApiBearerAuth()
export class PenandatanganController {
  constructor(private readonly service: PenandatanganService) {}

  @Get()
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Daftar penandatangan' })
  findAll() {
    return this.service.findAll();
  }

  @Get('active')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Penandatangan aktif' })
  findActive() {
    return this.service.findActive();
  }

  @Post()
  @CrudAuth('superadmin', 'admin_distrik', { summary: 'Tambah penandatangan baru' })
  create(@Body() dto: CreatePenandatanganDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @CrudAuth('superadmin', 'admin_distrik', { summary: 'Update penandatangan' })
  update(@Param('id') id: string, @Body() dto: UpdatePenandatanganDto) {
    return this.service.update(id, dto);
  }

  // ── Penugasan per tipe dokumen (1-3 penandatangan) ──

  @Get('dokumen')
  @CrudAuth('superadmin', 'admin_distrik', { summary: 'Penugasan penandatangan per tipe dokumen' })
  getDocSigners() {
    return this.service.getDocSignerAssignments();
  }

  @Put('dokumen/:type')
  @CrudAuth('superadmin', { summary: 'Set penandatangan untuk satu tipe dokumen (1-3 orang)' })
  @ApiBody({ description: '{ penandatanganIds: string[] } — urutan = posisi tanda tangan' })
  @ApiOkResponse({ description: 'Penugasan tersimpan' })
  setDocSigners(@Param('type') type: string, @Body() body: { penandatanganIds?: string[] }) {
    if (!DOKUMEN_SIGNER_TYPES.some((t) => t.type === type)) {
      throw new BadRequestException('Tipe dokumen tidak dikenal');
    }
    return this.service.setDocSigners(type, body.penandatanganIds || []);
  }

  @Delete(':id')
  @CrudAuth('superadmin', { summary: 'Hapus penandatangan' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
