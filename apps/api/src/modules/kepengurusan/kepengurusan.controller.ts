import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { KepengurusanService } from './kepengurusan.service';
import { CrudAuth } from '../../common/decorators/crud-auth.decorator';

@ApiTags('Kepengurusan')
@Controller('kepengurusan')
@ApiBearerAuth()
export class KepengurusanController {
  constructor(private readonly service: KepengurusanService) {}

  @Get()
  @CrudAuth('superadmin', { summary: 'Daftar kepengurusan (filter by level, unit, periode)' })
  @ApiQuery({ name: 'level', required: false })
  @ApiQuery({ name: 'unitId', required: false })
  @ApiQuery({ name: 'periodeId', required: false })
  findAll(
    @Query('level') level?: string,
    @Query('unitId') unitId?: string,
    @Query('periodeId') periodeId?: string,
  ) {
    return this.service.findAll({ level, unitId, periodeId });
  }

  @Get(':id')
  @CrudAuth('superadmin', { summary: 'Detail kepengurusan' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @CrudAuth('superadmin', { summary: 'Tambah kepengurusan baru' })
  create(@Body() body: {
    userId: string;
    jabatanId: string;
    periodeId: string;
    nasionalId?: string;
    distrikId?: string;
    wilayahId?: string;
    rantingId?: string;
    parentId?: string;
  }) {
    return this.service.create(body);
  }

  @Patch(':id')
  @CrudAuth('superadmin', { summary: 'Update kepengurusan' })
  update(@Param('id') id: string, @Body() body: {
    userId?: string;
    jabatanId?: string;
    parentId?: string | null;
  }) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  @CrudAuth('superadmin', { summary: 'Hapus kepengurusan' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
