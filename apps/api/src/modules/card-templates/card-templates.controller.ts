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
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
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
  @CrudAuth('superadmin', 'admin_nasional', {
    summary: 'Buat template kartu + upload desain depan/belakang (Tingkat Nasional)',
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'front', maxCount: 1 },
        { name: 'back', maxCount: 1 },
      ],
      buildImageUploadOptions('card-template'),
    ),
  )
  create(
    @Req() req: ScopedRequest,
    @Body()
    body: { name?: string; label?: string; overlayConfig?: string; distrikId?: string | null },
    @UploadedFiles() files?: { front?: Express.Multer.File[]; back?: Express.Multer.File[] },
  ) {
    return this.service.create(
      { name: body.name, label: body.label, overlayConfig: body.overlayConfig },
      { front: files?.front?.[0], back: files?.back?.[0] },
      // superadmin & admin_nasional bebas menentukan scope.
      resolveWriteDistrikId(req, body.distrikId ?? null),
    );
  }

  @Patch(':id')
  @CrudAuth('superadmin', 'admin_nasional', {
    summary: 'Update label/overlayConfig/gambar template (Tingkat Nasional)',
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'front', maxCount: 1 },
        { name: 'back', maxCount: 1 },
      ],
      buildImageUploadOptions('card-template'),
    ),
  )
  update(
    @Req() req: ScopedRequest,
    @Param('id') id: string,
    @Body() body: { label?: string; overlayConfig?: string },
    @UploadedFiles() files?: { front?: Express.Multer.File[]; back?: Express.Multer.File[] },
  ) {
    return this.service.update(
      id,
      { label: body.label, overlayConfig: body.overlayConfig },
      { front: files?.front?.[0], back: files?.back?.[0] },
      { role: req?.user?.role, distrikId: req?.scope?.distrikId },
    );
  }

  @Patch(':id/activate')
  @CrudAuth('superadmin', 'admin_nasional', {
    summary: 'Set template aktif pada scope-nya (Tingkat Nasional)',
  })
  activate(@Req() req: ScopedRequest, @Param('id') id: string) {
    return this.service.activate(id, { role: req?.user?.role, distrikId: req?.scope?.distrikId });
  }

  @Delete(':id')
  @CrudAuth('superadmin', 'admin_nasional', {
    summary: 'Hapus template non-aktif (Tingkat Nasional)',
  })
  remove(@Req() req: ScopedRequest, @Param('id') id: string) {
    return this.service.remove(id, { role: req?.user?.role, distrikId: req?.scope?.distrikId });
  }
}
