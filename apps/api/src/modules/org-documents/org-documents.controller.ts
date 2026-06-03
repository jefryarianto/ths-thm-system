import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { OrgDocumentsService } from './org-documents.service';

@ApiTags('Org-Documents')
@Controller('org-documents')
@ApiBearerAuth()
export class OrgDocumentsController {
  constructor(private readonly service: OrgDocumentsService) {}
  @Get() findAll(@Query() q: any) { return this.service.findAll(q); }
  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(id); }
  @Post() create(@Body() dto: any) { return this.service.create(dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: any) { return this.service.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.service.remove(id); }
  @Get('categories/list') getCategories() { return this.service.getCategories(); }
  @Get('categories/:id') getCategory(@Param('id') id: string) { return this.service.getCategory(id); }
  @Post('categories') createCategory(@Body() dto: any) { return this.service.createCategory(dto); }
  @Patch('categories/:id') updateCategory(@Param('id') id: string, @Body() dto: any) { return this.service.updateCategory(id, dto); }
  @Delete('categories/:id') deleteCategory(@Param('id') id: string) { return this.service.deleteCategory(id); }
}