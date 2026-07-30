import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { DocumentTemplatesService } from './document-templates.service';
import { CreateDocumentTemplateDto, UpdateDocumentTemplateDto, DocumentTemplateType } from './dto/document-template.dto';
import { CrudAuth } from '../../common/decorators/crud-auth.decorator';
import { ScopedRequest } from '../../common/interfaces/user-scope.interface';

@ApiTags('Document Templates')
@Controller('document-templates')
@ApiBearerAuth()
export class DocumentTemplatesController {
  constructor(private readonly service: DocumentTemplatesService) {}

  @Get()
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Ambil semua template dokumen' })
  findAll(@Query('type') type?: string) {
    return this.service.findAll(type);
  }

  @Get('types/:type')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Ambil template berdasarkan tipe' })
  getByType(@Param('type') type: string) {
    return this.service.getByType(type);
  }

  @Get('default/:type')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Ambil template default untuk tipe tertentu' })
  getDefaultByType(@Param('type') type: string) {
    return this.service.getDefaultByType(type);
  }

  @Get(':id')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Ambil detail template' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @CrudAuth('superadmin', 'admin_distrik', { summary: 'Buat template baru' })
  create(@Body() dto: CreateDocumentTemplateDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @CrudAuth('superadmin', 'admin_distrik', { summary: 'Update template' })
  update(@Param('id') id: string, @Body() dto: UpdateDocumentTemplateDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @CrudAuth('superadmin', 'admin_distrik', { summary: 'Hapus template (soft delete)' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
