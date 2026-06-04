import { Controller, Get, Post, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { Public } from '../../common/decorators/public.decorator';
import { GenerateDocumentDto, BatchGenerateDocumentDto, DocumentFilterDto } from './dto/document.dto';

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
  findAll(@Query() q: DocumentFilterDto) { return this.service.findAll(q); }

  @Get(':id')
  @ApiBearerAuth()
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post('generate')
  @ApiBearerAuth()
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
