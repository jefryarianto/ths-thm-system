import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { CardTemplatesService } from './card-templates.service';
import { buildImageUploadOptions } from '../../common/utils/image-upload.util';
import { CrudAuth } from '../../common/decorators/crud-auth.decorator';
import { ScopedRequest } from '../../common/interfaces/user-scope.interface';
import { resolveWriteDistrikId, resolveReadDistrikId } from '../../common/utils/distrik-scope';

/**
 * Template kartu anggota (per distrik). Desain = gambar upload sisi depan + belakang;
 * data anggota & QR dirender sebagai overlay oleh web/mobile/PDF.
 * admin_distrik mengelola template distriknya sendiri; template global = superadmin.
 */
@ApiTags('Card Templates')
@Controller('card-templates')
@ApiBearerAuth()
export class CardTemplatesController {
  constructor(private readonly service: CardTemplatesService) {}

  // Catatan: rute 'active' dideklarasikan sebelum ':id' agar tidak tertelan parameter.

  @Get('active')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'penguji', 'anggota', {
    summary: 'Template kartu aktif untuk scope (distrik → global) — null = desain bawaan',
  })
  async getActive(@Req() req: ScopedRequest, @Query('distrikId') distrikId?: string) {
    // TransformInterceptor membungkus otomatis — kembalikan template mentah (null = bawaan)
    return this.service.resolveActive(resolveReadDistrikId(req, distrikId) ?? undefined);
  }

  @Get()
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', {
    summary: 'Daftar template kartu (superadmin: semua; lainnya: distriknya + global)',
  })
  findAll(@Req() req: ScopedRequest) {
    return this.service.findAll({
      role: req?.user?.role,
      distrikId: req?.scope?.distrikId,
    });
  }

  @Get(':id')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', {
    summary: 'Detail template kartu',
  })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @CrudAuth('superadmin', 'admin_distrik', {
    summary: 'Buat template kartu + upload desain depan/belakang (PNG/JPG rasio 856:540)',
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('front', buildImageUploadOptions('card-front')),
    FileInterceptor('back', buildImageUploadOptions('card-back')),
  )
  create(
    @Req() req: ScopedRequest,
    @Body() body: { name?: string; label?: string; overlayConfig?: string; distrikId?: string | null },
    @UploadedFile() front?: Express.Multer.File,
    @UploadedFile() back?: Express.Multer.File,
  ) {
    return this.service.create(
      { name: body.name, label: body.label, overlayConfig: body.overlayConfig },
      { front, back },
      // superadmin bebas menentukan scope; admin_distrik terkunci ke distriknya.
      resolveWriteDistrikId(req, body.distrikId ?? null),
    );
  }

  @Patch(':id')
  @CrudAuth('superadmin', 'admin_distrik', {
    summary: 'Update label/overlayConfig/gambar template (admin hanya milik distriknya)',
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('front', buildImageUploadOptions('card-front')),
    FileInterceptor('back', buildImageUploadOptions('card-back')),
  )
  update(
    @Req() req: ScopedRequest,
    @Param('id') id: string,
    @Body() body: { label?: string; overlayConfig?: string },
    @UploadedFile() front?: Express.Multer.File,
    @UploadedFile() back?: Express.Multer.File,
  ) {
    return this.service.update(
      id,
      { label: body.label, overlayConfig: body.overlayConfig },
      { front, back },
      { role: req?.user?.role, distrikId: req?.scope?.distrikId },
    );
  }

  @Patch(':id/activate')
  @CrudAuth('superadmin', 'admin_distrik', {
    summary: 'Set template aktif pada scope-nya (menonaktifkan template lain scope yg sama)',
  })
  activate(@Req() req: ScopedRequest, @Param('id') id: string) {
    return this.service.activate(id, { role: req?.user?.role, distrikId: req?.scope?.distrikId });
  }

  @Delete(':id')
  @CrudAuth('superadmin', 'admin_distrik', {
    summary: 'Hapus template non-aktif (admin hanya milik distriknya)',
  })
  remove(@Req() req: ScopedRequest, @Param('id') id: string) {
    return this.service.remove(id, { role: req?.user?.role, distrikId: req?.scope?.distrikId });
  }
}