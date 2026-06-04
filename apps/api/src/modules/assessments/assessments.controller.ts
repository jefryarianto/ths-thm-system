import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AssessmentsService } from './assessments.service';
import { CreateAspectDto, UpdateAspectDto, CreateItemDto, UpdateItemDto, CreateScoreDto, ScoreFilterDto, AssessmentFilterDto } from './dto/assessment.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequireScope } from '../../common/decorators/scope.decorator';
import { ScopedRequest } from '../../common/interfaces/user-scope.interface';

@ApiTags('Assessments')
@Controller('assessments')
@ApiBearerAuth()
export class AssessmentsController {
  constructor(private readonly service: AssessmentsService) {}
  @Get('aspects')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', 'penguji')
  @RequireScope('branch')
  getAspects(@Query() q: AssessmentFilterDto) { return this.service.getAspects(q); }
  @Get('aspects/:id') getAspect(@Param('id') id: string) { return this.service.getAspect(id); }
  @Post('aspects')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan')
  @RequireScope('branch')
  createAspect(@Body() dto: CreateAspectDto) { return this.service.createAspect(dto); }
  @Patch('aspects/:id') updateAspect(@Param('id') id: string, @Body() dto: UpdateAspectDto) { return this.service.updateAspect(id, dto); }
  @Delete('aspects/:id') deleteAspect(@Param('id') id: string) { return this.service.deleteAspect(id); }
  @Get('items') getItems(@Query() q: AssessmentFilterDto) { return this.service.getItems(q); }
  @Get('items/:id') getItem(@Param('id') id: string) { return this.service.getItem(id); }
  @Post('items') createItem(@Body() dto: CreateItemDto) { return this.service.createItem(dto); }
  @Patch('items/:id') updateItem(@Param('id') id: string, @Body() dto: UpdateItemDto) { return this.service.updateItem(id, dto); }
  @Delete('items/:id') deleteItem(@Param('id') id: string) { return this.service.deleteItem(id); }
  @Get('scores') getScores(@Query() q: ScoreFilterDto, @Req() req: ScopedRequest) { return this.service.getScores(q, req.scope); }
  @Post('scores')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', 'penguji')
  @RequireScope('branch')
  createScore(@Body() dto: CreateScoreDto) { return this.service.createScore(dto); }
  @Post('import') importScores(@Body() importDto: { data: Record<string, unknown>[] }) { return this.service.importScores(importDto.data); }
}
