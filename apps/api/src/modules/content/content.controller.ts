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
  Req,
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
import type { ScopedRequest } from '../../common/interfaces/user-scope.interface';
import { SubmitBeritaDto } from './dto/submit-berita.dto';

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
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', {
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
    @Req() req: ScopedRequest,
  ) {
    return this.contentService.createBerita({
      ...body,
      submittedBy: req.user?.id,
    });
  }

  // ── Pengajuan berita oleh anggota ──
  @Post('berita/submit')
  @CrudAuth(
    'superadmin',
    'admin_distrik',
    'admin_wilayah',
    'admin_ranting',
    'admin_kegiatan',
    'penguji',
    'anggota',
    {
      scope: 'self',
      summary: 'Submit berita untuk persetujuan admin',
    },
  )
  async submitBerita(@Body() dto: SubmitBeritaDto, @Req() req: ScopedRequest) {
    if (!req.user?.id) {
      throw new BadRequestException('User tidak ditemukan');
    }
    // Berita dari anggota selalu disimpan sebagai draft (isVisible=false)
    return this.contentService.createBerita({
      ...dto,
      isVisible: false,
      submittedBy: req.user.id,
    });
  }

  // ── Riwayat pengajuan berita milik anggota ──
  @Get('berita/mine')
  @CrudAuth(
    'superadmin',
    'admin_distrik',
    'admin_wilayah',
    'admin_ranting',
    'admin_kegiatan',
    'penguji',
    'anggota',
    {
      scope: 'self',
      summary: 'Riwayat pengajuan berita milik user (dengan status persetujuan)',
    },
  )
  async getMyBeritaSubmissions(@Req() req: ScopedRequest) {
    if (!req.user?.id) {
      throw new BadRequestException('User tidak ditemukan');
    }
    return this.contentService.getMyBeritaSubmissions(req.user.id);
  }
  @Patch('berita/:id')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', {
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
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', {
    scope: 'national',
    summary: 'Hapus berita',
  })
  async deleteBerita(@Param('id', ParseUUIDPipe) id: string) {
    return this.contentService.deleteBerita(id);
  }

  @Post('berita/:id/image')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', {
    scope: 'national',
    summary: 'Upload gambar berita',
  })
  @UseInterceptors(FileInterceptor('image', buildImageUploadOptions('berita')))
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
      throw new BadRequestException('File tidak valid: format gambar tidak dikenali');
    }

    return this.contentService.updateBerita(id, {
      gambar: file.filename,
    });
  }
}
