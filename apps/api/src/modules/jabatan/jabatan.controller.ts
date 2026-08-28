import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JabatanService } from './jabatan.service';
import { CrudAuth } from '../../common/decorators/crud-auth.decorator';

@ApiTags('Jabatan')
@Controller('jabatan')
@ApiBearerAuth()
export class JabatanController {
  constructor(private readonly service: JabatanService) {}

  @Get()
  @CrudAuth('superadmin', { summary: 'Daftar semua jabatan' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @CrudAuth('superadmin', { summary: 'Detail jabatan' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @CrudAuth('superadmin', { summary: 'Tambah jabatan baru' })
  create(@Body() body: { nama: string; kode?: string; urutan?: number }) {
    return this.service.create(body);
  }

  @Patch(':id')
  @CrudAuth('superadmin', { summary: 'Update jabatan' })
  update(@Param('id') id: string, @Body() body: { nama?: string; kode?: string; urutan?: number }) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  @CrudAuth('superadmin', { summary: 'Hapus jabatan' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
