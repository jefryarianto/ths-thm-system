import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { ContentService } from './content.service';
import { CrudAuth } from '../../common/decorators/crud-auth.decorator';
import {
  buildImageUploadOptions,
  validateImageMagicBytes,
} from '../../common/utils/image-upload.util';
import { unlinkSync } from 'fs';

@ApiTags('Content')
@Controller('content')
@ApiBearerAuth()
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  // ── Berita CRUD ──

  @Get('berita')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', {
    scope: 'national',
    summary: 'Ambil semua berita',
  })
  async getAllBerita() {
    return this.contentService.getAllBerita();
  }

  @Get('berita/:id')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', {
    scope: 'national',
    summary: 'Ambil berita by ID',
  })
  async getBeritaById(@Param('id', ParseUUIDPipe) id: string) {
    return this.contentService.getBeritaById(id);
  }

  @Post('berita')
  @CrudAuth('superadmin', {
    scope: 'national',
    summary: 'Tambah berita baru',
  })
  async createBerita(
    @Body()
    body: {
      judul: string;
      ringkasan: string;
      konten: string;
      gambar?: string;
      slug: string;
      isVisible?: boolean;
    },
  ) {
    return this.contentService.createBerita(body);
  }

  @Patch('berita/:id')
  @CrudAuth('superadmin', {
    scope: 'national',
    summary: 'Perbarui berita',
  })
  async updateBerita(
    @Param('id', ParseUUIDPipe) id: string,
    @Body()
    body: {
      judul?: string;
      ringkasan?: string;
      konten?: string;
      gambar?: string;
      slug?: string;
      isVisible?: boolean;
    },
  ) {
    return this.contentService.updateBerita(id, body);
  }

  @Delete('berita/:id')
  @CrudAuth('superadmin', {
    scope: 'national',
    summary: 'Hapus berita',
  })
  async deleteBerita(@Param('id', ParseUUIDPipe) id: string) {
    return this.contentService.deleteBerita(id);
  }

  @Post('berita/:id/image')
  @CrudAuth('superadmin', {
    scope: 'national',
    summary: 'Upload gambar berita',
  })
  @UseInterceptors(
    FileInterceptor('image', buildImageUploadOptions('berita')),
  )
  async uploadBeritaImage(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('File gambar harus diupload');
    }
    if (!validateImageMagicBytes(file.path)) {
      try {
        unlinkSync(file.path);
      } catch {
        /* best-effort cleanup */
      }
      throw new BadRequestException(
        'File tidak valid: format gambar tidak dikenali',
      );
    }

    return this.contentService.updateBerita(id, {
      gambar: file.filename,
    });
  }
}
