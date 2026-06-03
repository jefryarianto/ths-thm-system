import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ExaminersService } from './examiners.service';

@ApiTags('Examiners')
@Controller('examiners')
@ApiBearerAuth()
export class ExaminersController {
  constructor(private readonly service: ExaminersService) {}
  @Get() findAll(@Query() q: any) { return this.service.findAll(q); }
  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(id); }
  @Post() create(@Body() dto: any) { return this.service.create(dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: any) { return this.service.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.service.remove(id); }
  @Post('import') importCsv(@Body() data: any[]) { return this.service.importCsv(data); }
  @Post(':id/assign') assign(@Param('id') id: string, @Body() dto: any) { return this.service.assign(id, dto); }
  @Get(':id/assignments') getAssignments(@Param('id') id: string) { return this.service.getAssignments(id); }
  @Get(':id/schedules') getSchedules(@Param('id') id: string) { return this.service.getSchedules(id); }
}