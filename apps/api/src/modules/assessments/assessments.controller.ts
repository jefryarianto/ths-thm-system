import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req, UploadedFile, UseInterceptors, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { AssessmentsService, ImportRow } from './assessments.service';
import {
  CreateAspectDto,
  UpdateAspectDto,
  CreateItemDto,
  UpdateItemDto,
  CreateScoreDto,
  ScoreFilterDto,
  AssessmentFilterDto,
} from './dto/assessment.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequireScope } from '../../common/decorators/scope.decorator';
import { ScopedRequest } from '../../common/interfaces/user-scope.interface';

@ApiTags('Assessments')
@Controller('assessments')
@ApiBearerAuth()
export class AssessmentsController {
  constructor(private readonly service: AssessmentsService) {}

  @Get('aspects')
  @ApiOperation({ summary: 'Ambil semua aspek penilaian' })
  @Roles(
    'superadmin',
    'admin_distrik',
    'admin_wilayah',
    'admin_ranting',
    'admin_kegiatan',
    'penguji',
  )
  @RequireScope('branch')
  getAspects(@Query() q: AssessmentFilterDto) {
    return this.service.getAspects(q);
  }

  @Get('aspects/:id')
  @ApiOperation({ summary: 'Ambil detail aspek penilaian' })
  @Roles(
    'superadmin',
    'admin_distrik',
    'admin_wilayah',
    'admin_ranting',
    'admin_kegiatan',
    'penguji',
  )
  @RequireScope('branch')
  getAspect(@Param('id') id: string) {
    return this.service.getAspect(id);
  }

  @Post('aspects')
  @ApiOperation({ summary: 'Tambah aspek penilaian baru' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan')
  @RequireScope('branch')
  createAspect(@Body() dto: CreateAspectDto) {
    return this.service.createAspect(dto);
  }

  @Patch('aspects/:id')
  @ApiOperation({ summary: 'Perbarui aspek penilaian' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan')
  @RequireScope('branch')
  updateAspect(@Param('id') id: string, @Body() dto: UpdateAspectDto) {
    return this.service.updateAspect(id, dto);
  }

  @Delete('aspects/:id')
  @ApiOperation({ summary: 'Hapus aspek penilaian' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  deleteAspect(@Param('id') id: string) {
    return this.service.deleteAspect(id);
  }

  @Get('items')
  @ApiOperation({ summary: 'Ambil semua item penilaian' })
  @Roles(
    'superadmin',
    'admin_distrik',
    'admin_wilayah',
    'admin_ranting',
    'admin_kegiatan',
    'penguji',
  )
  @RequireScope('branch')
  getItems(@Query() q: AssessmentFilterDto) {
    return this.service.getItems(q);
  }

  @Get('items/:id')
  @ApiOperation({ summary: 'Ambil detail item penilaian' })
  @Roles(
    'superadmin',
    'admin_distrik',
    'admin_wilayah',
    'admin_ranting',
    'admin_kegiatan',
    'penguji',
  )
  @RequireScope('branch')
  getItem(@Param('id') id: string) {
    return this.service.getItem(id);
  }

  @Post('items')
  @ApiOperation({ summary: 'Tambah item penilaian baru' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan')
  @RequireScope('branch')
  createItem(@Body() dto: CreateItemDto) {
    return this.service.createItem(dto);
  }

  @Patch('items/:id')
  @ApiOperation({ summary: 'Perbarui item penilaian' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan')
  @RequireScope('branch')
  updateItem(@Param('id') id: string, @Body() dto: UpdateItemDto) {
    return this.service.updateItem(id, dto);
  }

  @Delete('items/:id')
  @ApiOperation({ summary: 'Hapus item penilaian' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  deleteItem(@Param('id') id: string) {
    return this.service.deleteItem(id);
  }

  // ── Import Endpoints ──

  @Post('import-from-list')
  @ApiOperation({ summary: 'Import aspek & item penilaian dari list JSON (format: docs/item.txt)' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  importFromList(@Body() body: { data: ImportRow[] }) {
    if (!body.data || !Array.isArray(body.data)) {
      throw new BadRequestException('Data harus berupa array');
    }
    return this.service.importFromList(body.data);
  }

  @Post('upload-csv')
  @ApiOperation({ summary: 'Upload file CSV untuk import aspek & item penilaian' })
  @ApiConsumes('multipart/form-data')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  @UseInterceptors(FileInterceptor('file'))
  async uploadCsv(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('File CSV harus diupload');
    }
    const csvText = file.buffer.toString('utf-8');
    return this.service.importFromCsvText(csvText);
  }

  @Get('scores')
  @ApiOperation({ summary: 'Ambil semua nilai' })
  @Roles(
    'superadmin',
    'admin_distrik',
    'admin_wilayah',
    'admin_ranting',
    'admin_kegiatan',
    'penguji',
  )
  @RequireScope('branch')
  getScores(@Query() q: ScoreFilterDto, @Req() req: ScopedRequest) {
    return this.service.getScores(q, req.scope);
  }

  @Post('scores')
  @ApiOperation({ summary: 'Tambah nilai baru' })
  @Roles(
    'superadmin',
    'admin_distrik',
    'admin_wilayah',
    'admin_ranting',
    'admin_kegiatan',
    'penguji',
  )
  @RequireScope('branch')
  createScore(@Body() dto: CreateScoreDto) {
    return this.service.createScore(dto);
  }

  @Post('import')
  @ApiOperation({ summary: 'Impor nilai' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan')
  @RequireScope('branch')
  importScores(@Body() importDto: { data: Record<string, unknown>[] }) {
    return this.service.importScores(importDto.data);
  }
}