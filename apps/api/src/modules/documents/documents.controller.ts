import { Controller, Get, Post, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { Public } from '../../common/decorators/public.decorator';
import { GenerateDocumentDto, BatchGenerateDocumentDto, DocumentFilterDto } from './dto/document.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequireScope } from '../../common/decorators/scope.decorator';

@ApiTags('Documents')
@Controller('documents')
export class DocumentsController {
  constructor(private readonly service: DocumentsService) {}

  @Get('verify/:token')
  @Public()
  verifyByToken(@Param('token') token: string) {
    return this.service.verifyByToken(token);
  }

  @Get()
  @ApiBearerAuth()
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan')
  @RequireScope('branch')
  findAll(@Query() q: DocumentFilterDto) { return this.service.findAll(q); }

  @Get(':id')
  @ApiBearerAuth()
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post('generate')
  @ApiBearerAuth()
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  generate(@Body() dto: GenerateDocumentDto) { return this.service.generate(dto); }

  @Post('batch')
  @ApiBearerAuth()
  batchGenerate(@Body() dto: BatchGenerateDocumentDto) { return this.service.batchGenerate(dto); }

  @Delete(':id')
  @ApiBearerAuth()
  remove(@Param('id') id: string) { return this.service.remove(id); }

  @Get('types/list')
  @ApiBearerAuth()
  getTypes() { return this.service.getTypes(); }

  @Get(':id/verify-qr')
  @ApiBearerAuth()
  verifyQR(@Param('id') id: string) { return this.service.verifyQR(id); }
}
