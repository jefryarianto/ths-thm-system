import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TingkatanService } from './tingkatan.service';
import { CreateTingkatanDto, UpdateTingkatanDto } from './dto/tingkatan.dto';
import { CrudAuth } from '../../common/decorators/crud-auth.decorator';

@ApiTags('Tingkatan')
@Controller('tingkatan')
@ApiBearerAuth()
export class TingkatanController {
  constructor(private readonly service: TingkatanService) {}

  @Get()
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', 'penguji', 'anggota', { summary: 'Daftar tingkatan (pengaturan strip kartu)' })
  findAll() {
    return this.service.findAll();
  }

  @Get('visuals')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', 'penguji', 'anggota', { summary: 'Mapping tingkat → visual strip untuk kartu' })
  getVisuals() {
    return this.service.getAllLevelVisuals();
  }

  @Post()
  @CrudAuth('superadmin', 'admin_distrik', { summary: 'Tambah tingkatan' })
  create(@Body() dto: CreateTingkatanDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @CrudAuth('superadmin', 'admin_distrik', { summary: 'Update tingkatan' })
  update(@Param('id') id: string, @Body() dto: UpdateTingkatanDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @CrudAuth('superadmin', 'admin_distrik', { summary: 'Hapus tingkatan' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
