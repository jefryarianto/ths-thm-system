import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AssessmentsService } from './assessments.service';

@ApiTags('Assessments')
@Controller('assessments')
@ApiBearerAuth()
export class AssessmentsController {
  constructor(private readonly service: AssessmentsService) {}
  @Get('aspects') getAspects(@Query() q: any) { return this.service.getAspects(q); }
  @Get('aspects/:id') getAspect(@Param('id') id: string) { return this.service.getAspect(id); }
  @Post('aspects') createAspect(@Body() dto: any) { return this.service.createAspect(dto); }
  @Patch('aspects/:id') updateAspect(@Param('id') id: string, @Body() dto: any) { return this.service.updateAspect(id, dto); }
  @Delete('aspects/:id') deleteAspect(@Param('id') id: string) { return this.service.deleteAspect(id); }
  @Get('items') getItems(@Query() q: any) { return this.service.getItems(q); }
  @Get('items/:id') getItem(@Param('id') id: string) { return this.service.getItem(id); }
  @Post('items') createItem(@Body() dto: any) { return this.service.createItem(dto); }
  @Patch('items/:id') updateItem(@Param('id') id: string, @Body() dto: any) { return this.service.updateItem(id, dto); }
  @Delete('items/:id') deleteItem(@Param('id') id: string) { return this.service.deleteItem(id); }
  @Get('scores') getScores(@Query() q: any) { return this.service.getScores(q); }
  @Post('scores') createScore(@Body() dto: any) { return this.service.createScore(dto); }
  @Post('import') importScores(@Body() data: any[]) { return this.service.importScores(data); }
}