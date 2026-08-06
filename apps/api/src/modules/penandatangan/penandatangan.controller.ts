import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PenandatanganService } from './penandatangan.service';
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

  @Delete(':id')
  @CrudAuth('superadmin', { summary: 'Hapus penandatangan' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
