import { Controller, Get, Post, Patch, Delete, Body, Param, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JabatanService } from './jabatan.service';
import { CrudAuth } from '../../common/decorators/crud-auth.decorator';
import { ScopedRequest } from '../../common/interfaces/user-scope.interface';

/**
 * Preset jabatan per distrik.
 * - Baca: semua admin (kepengurusan & JabatanSelect butuh daftar jabatan);
 *   service membatasi hasil ke distrik pemanggil + global.
 * - Tulis: superadmin (global + semua distrik) & admin_distrik (distriknya sendiri).
 */
@ApiTags('Jabatan')
@Controller('jabatan')
@ApiBearerAuth()
export class JabatanController {
  constructor(private readonly service: JabatanService) {}

  @Get()
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', 'penguji', 'anggota', {
    summary: 'Daftar jabatan (superadmin: semua; lainnya: distriknya + global)',
  })
  findAll(@Req() req: ScopedRequest) {
    return this.service.findAll({ role: req?.user?.role, distrikId: req?.scope?.distrikId });
  }

  @Get(':id')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', 'penguji', 'anggota', {
    summary: 'Detail jabatan',
  })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @CrudAuth('superadmin', 'admin_distrik', { summary: 'Tambah jabatan (superadmin: global/distrik; admin_distrik: distriknya)' })
  create(@Req() req: ScopedRequest, @Body() body: { nama: string; kode?: string; urutan?: number; distrikId?: string | null }) {
    return this.service.create(req, body);
  }

  @Patch(':id')
  @CrudAuth('superadmin', 'admin_distrik', { summary: 'Update jabatan (admin hanya milik distriknya)' })
  update(@Req() req: ScopedRequest, @Param('id') id: string, @Body() body: { nama?: string; kode?: string; urutan?: number }) {
    return this.service.update(req, id, body);
  }

  @Delete(':id')
  @CrudAuth('superadmin', 'admin_distrik', { summary: 'Hapus jabatan (admin hanya milik distriknya)' })
  remove(@Req() req: ScopedRequest, @Param('id') id: string) {
    return this.service.remove(req, id);
  }
}
