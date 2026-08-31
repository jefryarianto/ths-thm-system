import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { CardTemplatesService } from './card-templates.service';
import { buildImageUploadOptions } from '../../common/utils/image-upload.util';
import { CrudAuth } from '../../common/decorators/crud-auth.decorator';

/**
 * Template kartu anggota (global). Desain = gambar upload sisi depan + belakang;
 * data anggota & QR dirender sebagai overlay oleh web/mobile/PDF.
 */
@ApiTags('Card Templates')
@Controller('card-templates')
@ApiBearerAuth()
export class CardTemplatesController {
  constructor(private readonly service: CardTemplatesService) {}

  // Catatan: rute 'active' dideklarasikan sebelum ':id' agar tidak tertelan parameter.

  @Get('active')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'penguji', 'anggota', {
    summary: 'Template kartu aktif (dipakai renderer web/mobile) — null = desain bawaan',
  })
  async getActive() {
    // TransformInterceptor membungkus otomatis — kembalikan template mentah (null = bawaan)
    return this.service.resolveActive();
  }

  @Get()
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', {
    scope: 'national',
    summary: 'Daftar template kartu',
  })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', {
    scope: 'national',
    summary: 'Detail template kartu',
  })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @CrudAuth('superadmin', 'admin_distrik', {
    scope: 'national',
    summary: 'Buat template kartu + upload desain depan/belakang (PNG/JPG rasio 856:540)',
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('front', buildImageUploadOptions('card-front')),
    FileInterceptor('back', buildImageUploadOptions('card-back')),
  )
  create(
    @Body() body: { name?: string; label?: string; overlayConfig?: string },
    @UploadedFile() front?: Express.Multer.File,
    @UploadedFile() back?: Express.Multer.File,
  ) {
    return this.service.create(
      { name: body.name, label: body.label, overlayConfig: body.overlayConfig },
      { front, back },
    );
  }

  @Patch(':id')
  @CrudAuth('superadmin', 'admin_distrik', {
    scope: 'national',
    summary: 'Update label/overlayConfig/gambar template',
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('front', buildImageUploadOptions('card-front')),
    FileInterceptor('back', buildImageUploadOptions('card-back')),
  )
  update(
    @Param('id') id: string,
    @Body() body: { label?: string; overlayConfig?: string },
    @UploadedFile() front?: Express.Multer.File,
    @UploadedFile() back?: Express.Multer.File,
  ) {
    return this.service.update(id, { label: body.label, overlayConfig: body.overlayConfig }, { front, back });
  }

  @Patch(':id/activate')
  @CrudAuth('superadmin', 'admin_distrik', {
    scope: 'national',
    summary: 'Set template sebagai aktif (menonaktifkan lainnya)',
  })
  activate(@Param('id') id: string) {
    return this.service.activate(id);
  }

  @Delete(':id')
  @CrudAuth('superadmin', 'admin_distrik', {
    scope: 'national',
    summary: 'Hapus template non-aktif',
  })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}