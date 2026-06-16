import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { OrgDocumentsService } from './org-documents.service';
import {
  CreateOrgDocumentDto,
  UpdateOrgDocumentDto,
  OrgDocumentFilterDto,
  CreateCategoryDto,
  UpdateCategoryDto,
} from './dto/org-document.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequireScope } from '../../common/decorators/scope.decorator';
import { ScopedRequest } from '../../common/interfaces/user-scope.interface';

@ApiTags('Org-Documents')
@Controller('org-documents')
@ApiBearerAuth()
export class OrgDocumentsController {
  constructor(private readonly service: OrgDocumentsService) {}

  @Get()
  @ApiOperation({ summary: 'Ambil semua dokumen organisasi' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan')
  @RequireScope('branch')
  findAll(@Query() q: OrgDocumentFilterDto) {
    return this.service.findAll(q);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Ambil detail dokumen organisasi' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan')
  @RequireScope('branch')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Tambah dokumen organisasi baru' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  create(@Body() dto: CreateOrgDocumentDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Perbarui dokumen organisasi' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  update(@Param('id') id: string, @Body() dto: UpdateOrgDocumentDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Hapus dokumen organisasi' })
  @Roles('superadmin', 'admin_distrik')
  @RequireScope('branch')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Get('categories/list')
  @ApiOperation({ summary: 'Ambil semua kategori dokumen' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan')
  @RequireScope('branch')
  getCategories() {
    return this.service.getCategories();
  }

  @Get('categories/:id')
  @ApiOperation({ summary: 'Ambil detail kategori dokumen' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan')
  @RequireScope('branch')
  getCategory(@Param('id') id: string) {
    return this.service.getCategory(id);
  }

  @Post('categories')
  @ApiOperation({ summary: 'Tambah kategori dokumen baru' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.service.createCategory(dto);
  }

  @Patch('categories/:id')
  @ApiOperation({ summary: 'Perbarui kategori dokumen' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  updateCategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.service.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  @ApiOperation({ summary: 'Hapus kategori dokumen' })
  @Roles('superadmin', 'admin_distrik')
  @RequireScope('branch')
  deleteCategory(@Param('id') id: string) {
    return this.service.deleteCategory(id);
  }
}
