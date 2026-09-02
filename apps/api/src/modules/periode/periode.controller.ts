import { Controller, Get, Post, Patch, Delete, Body, Param, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PeriodeService, PeriodeLevel } from './periode.service';
import { CrudAuth } from '../../common/decorators/crud-auth.decorator';

@ApiTags('Periode')
@Controller('periode')
@ApiBearerAuth()
export class PeriodeController {
  constructor(private readonly service: PeriodeService) {}

  @Get()
  @CrudAuth('superadmin', { summary: 'Daftar semua periode' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @CrudAuth('superadmin', { summary: 'Detail periode' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @CrudAuth('superadmin', { summary: 'Tambah periode baru' })
  create(@Body() body: { nama: string; tglMulai: string; tglSelesai: string; isActive?: boolean }) {
    return this.service.create(body);
  }

  @Patch(':id')
  @CrudAuth('superadmin', { summary: 'Update periode' })
  update(@Param('id') id: string, @Body() body: { nama?: string; tglMulai?: string; tglSelesai?: string; isActive?: boolean }) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  @CrudAuth('superadmin', { summary: 'Hapus periode' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Post(':id/activate-unit')
  @CrudAuth('superadmin', { summary: 'Tetapkan periode aktif untuk unit spesifik' })
  activateUnit(
    @Param('id') id: string,
    @Body() body: { level: PeriodeLevel; unitId: string },
  ) {
    if (!body.level) {
      throw new BadRequestException('level wajib diisi');
    }
    return this.service.activateUnit(id, body.level, body.unitId || undefined);
  }

  @Delete('active-unit/:level/:unitId')
  @CrudAuth('superadmin', { summary: 'Hapus periode aktif untuk unit' })
  deactivateUnit(@Param('level') level: PeriodeLevel, @Param('unitId') unitId: string) {
    return this.service.deactivateUnit(level, unitId);
  }

  @Get(':id/active-units')
  @CrudAuth('superadmin', { summary: 'Daftar unit yang memakai periode ini' })
  findUnitsByPeriode(@Param('id') id: string) {
    return this.service.findUnitsByPeriode(id);
  }
}
