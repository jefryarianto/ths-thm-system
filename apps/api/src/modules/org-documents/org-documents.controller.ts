import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Res,
  NotFoundException,
  BadRequestException,
  UploadedFile,
  UseInterceptors,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { resolve as resolvePath } from 'path';
import { createReadStream, existsSync } from 'fs';
import { BaseCrudController } from '../../common/utils/base-crud.controller';
import { OrgDocumentsService } from './org-documents.service';
import {
  CreateOrgDocumentDto,
  UpdateOrgDocumentDto,
  OrgDocumentFilterDto,
  CreateCategoryDto,
  UpdateCategoryDto,
} from './dto/org-document.dto';
import { CrudAuth } from '../../common/decorators/crud-auth.decorator';
import { ScopedRequest } from '../../common/interfaces/user-scope.interface';
import { buildDocumentUploadOptions } from '../../common/utils/document-upload.util';

@ApiTags('Org-Documents')
@Controller('org-documents')
@ApiBearerAuth()
export class OrgDocumentsController extends BaseCrudController {
  constructor(service: OrgDocumentsService) {
    super(service);
  }

  // ── CRUD overrides ──
  // Before: @Roles(...) + @RequireScope('branch') + @ApiOperation(...) = 3 lines
  // After:  @CrudAuth(...) = 1 line

  @Get()
  @CrudAuth(
    'superadmin',
    'admin_distrik',
    'admin_wilayah',
    'admin_ranting',
    'admin_kegiatan',
    'anggota',
    {
      summary: 'Ambil semua dokumen organisasi',
    },
  )
  findAll(@Query() q: OrgDocumentFilterDto) {
    return super.findAll(q);
  }

  // ── Category endpoints (domain methods) ──
  // Catatan: route 'categories' harus dideklarasikan sebelum ':id' agar tidak
  // tertangkap sebagai parameter id.

  @Get('categories')
  @CrudAuth(
    'superadmin',
    'admin_distrik',
    'admin_wilayah',
    'admin_ranting',
    'admin_kegiatan',
    'anggota',
    {
      summary: 'Ambil semua kategori dokumen',
    },
  )
  getCategories() {
    return this.service.getCategories();
  }

  @Get('categories/:id')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', {
    summary: 'Ambil detail kategori dokumen',
  })
  getCategory(@Param('id') id: string) {
    return this.service.getCategory(id);
  }

  @Post('categories')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', {
    summary: 'Tambah kategori dokumen baru',
  })
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.service.createCategory(dto);
  }

  @Patch('categories/:id')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', {
    summary: 'Perbarui kategori dokumen',
  })
  updateCategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.service.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', {
    summary: 'Hapus kategori dokumen',
  })
  async deleteCategory(@Param('id') id: string) {
    await this.service.deleteCategory(id);
    return { message: 'Kategori berhasil dihapus' };
  }

  /**
   * Upload file dokumen mentah (multipart/form-data) sebelum/saat membuat
   * record dokumen. Mengembalikan `filePath` relatif untuk disimpan di form.
   */
  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', {
    summary: 'Upload file dokumen organisasi',
  })
  @UseInterceptors(FileInterceptor('file', buildDocumentUploadOptions()))
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File dokumen harus diupload');
    }
    // Simpan path relatif dari root project: uploads/org-documents/<nama-file>
    const uploadRoot = resolvePath(process.env.UPLOAD_DIR || './uploads');
    const absPath = resolvePath(file.path);
    const filePath = absPath.replace(uploadRoot, 'uploads').replace(/\\/g, '/');
    return { filePath, originalName: file.originalname, size: file.size };
  }

  @Get(':id')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', {
    summary: 'Ambil detail dokumen organisasi',
  })
  findOne(@Param('id') id: string) {
    return super.findOne(id);
  }

  @Get(':id/download')
  @CrudAuth(
    'superadmin',
    'admin_distrik',
    'admin_wilayah',
    'admin_ranting',
    'admin_kegiatan',
    'anggota',
    {
      summary: 'Download file dokumen organisasi',
    },
  )
  async downloadFile(@Param('id') id: string, @Res() res: any) {
    const doc = await this.service.findOne(id);
    const filePath = doc?.filePath as string | undefined;
    if (!filePath) throw new NotFoundException('File tidak ditemukan');
    const absPath = resolvePath(process.cwd(), filePath);
    if (!existsSync(absPath)) throw new NotFoundException('File tidak ditemukan di server');
    const fileName = (doc?.judul as string) || 'dokumen';
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    createReadStream(absPath).pipe(res);
  }

  @Post()
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', {
    summary: 'Tambah dokumen organisasi baru',
  })
  create(@Body() dto: CreateOrgDocumentDto, @Req() req?: ScopedRequest) {
    return this.service.create(dto, req?.user?.id);
  }

  @Patch(':id')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', {
    summary: 'Perbarui dokumen organisasi',
  })
  update(@Param('id') id: string, @Body() dto: UpdateOrgDocumentDto) {
    return super.update(id, dto);
  }

  @Delete(':id')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', {
    summary: 'Hapus dokumen organisasi',
  })
  remove(@Param('id') id: string) {
    return super.remove(id);
  }
}
