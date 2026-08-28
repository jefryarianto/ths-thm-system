import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PeriodeService } from './periode.service';
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
}
