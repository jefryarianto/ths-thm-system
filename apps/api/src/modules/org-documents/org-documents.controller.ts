import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Res, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
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
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', {
    summary: 'Ambil semua dokumen organisasi',
  })
  findAll(@Query() q: OrgDocumentFilterDto) {
    return super.findAll(q);
  }

  @Get(':id')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', {
    summary: 'Ambil detail dokumen organisasi',
  })
  findOne(@Param('id') id: string) {
    return super.findOne(id);
  }

  @Post()
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', {
    summary: 'Tambah dokumen organisasi baru',
  })
  create(@Body() dto: CreateOrgDocumentDto) {
    return super.create(dto);
  }

  @Patch(':id')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', {
    summary: 'Perbarui dokumen organisasi',
  })
  update(@Param('id') id: string, @Body() dto: UpdateOrgDocumentDto) {
    return super.update(id, dto);
  }

  @Delete(':id')
  @CrudAuth('superadmin', 'admin_distrik', {
    summary: 'Hapus dokumen organisasi',
  })
  remove(@Param('id') id: string) {
    return super.remove(id);
  }

  // ── Download endpoint ──

  @Get(':id/download')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', {
    summary: 'Download file dokumen organisasi',
  })
  async download(@Param('id') id: string, @Res() res: any) {
    const doc = await this.service.findOne(id);
    if (!doc || !doc.filePath) {
      throw new NotFoundException('File tidak ditemukan');
    }
    // Send the file directly
    res.sendFile(doc.filePath, { root: process.cwd() });
  }

  // ── Category endpoints (domain methods) ──

  @Get('categories/list')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', {
    summary: 'Ambil semua kategori dokumen',
  })
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
  @CrudAuth('superadmin', 'admin_distrik', {
    summary: 'Hapus kategori dokumen',
  })
  deleteCategory(@Param('id') id: string) {
    return this.service.deleteCategory(id);
  }
}
