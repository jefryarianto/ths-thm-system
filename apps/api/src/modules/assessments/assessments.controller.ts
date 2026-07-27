import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req, UploadedFile, UseInterceptors, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { AssessmentsService, ImportRow } from './assessments.service';
import { AspectService } from './aspect.service';
import {
  CreateAspectDto,
  UpdateAspectDto,
  CreateItemDto,
  UpdateItemDto,
  CreateScoreDto,
  ScoreFilterDto,
  AssessmentFilterDto,
} from './dto/assessment.dto';
import { CrudAuth } from '../../common/decorators/crud-auth.decorator';
import { ScopedRequest } from '../../common/interfaces/user-scope.interface';

@ApiTags('Assessments')
@Controller('assessments')
@ApiBearerAuth()
export class AssessmentsController {
  constructor(
    private readonly service: AssessmentsService,
    private readonly aspectService: AspectService,
  ) {}

  // ── Aspects (via AspectService / BaseCrudService) ────

  @Get('aspects')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', 'penguji', { summary: 'Ambil semua aspek penilaian' })
  getAspects(@Query() _q: AssessmentFilterDto) {
    return this.aspectService.findAll();
  }

  @Get('aspects/:id')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', 'penguji', { summary: 'Ambil detail aspek penilaian' })
  getAspect(@Param('id') id: string) {
    return this.aspectService.findOne(id);
  }

  @Post('aspects')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', { summary: 'Tambah aspek penilaian baru' })
  createAspect(@Body() dto: CreateAspectDto) {
    return this.aspectService.create(dto);
  }

  @Patch('aspects/:id')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', { summary: 'Perbarui aspek penilaian' })
  updateAspect(@Param('id') id: string, @Body() dto: UpdateAspectDto) {
    return this.aspectService.update(id, dto);
  }

  @Delete('aspects/:id')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Hapus aspek penilaian' })
  deleteAspect(@Param('id') id: string) {
    return this.aspectService.remove(id);
  }

  // ── Items ────────────────────────────────────────────

  @Get('items')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', 'penguji', { summary: 'Ambil semua item penilaian' })
  getItems(@Query() q: AssessmentFilterDto) {
    return this.service.getItems(q);
  }

  @Get('items/:id')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', 'penguji', { summary: 'Ambil detail item penilaian' })
  getItem(@Param('id') id: string) {
    return this.service.getItem(id);
  }

  @Post('items')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', { summary: 'Tambah item penilaian baru' })
  createItem(@Body() dto: CreateItemDto) {
    return this.service.createItem(dto);
  }

  @Patch('items/:id')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', { summary: 'Perbarui item penilaian' })
  updateItem(@Param('id') id: string, @Body() dto: UpdateItemDto) {
    return this.service.updateItem(id, dto);
  }

  @Delete('items/:id')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Hapus item penilaian' })
  deleteItem(@Param('id') id: string) {
    return this.service.deleteItem(id);
  }

  // ── Import ────────────────────────────────────────────

  @Post('import-from-list')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Import aspek & item penilaian dari list JSON' })
  importFromList(@Body() body: { data: ImportRow[] }) {
    if (!body.data || !Array.isArray(body.data)) {
      throw new BadRequestException('Data harus berupa array');
    }
    return this.service.importFromList(body.data);
  }

  @Post('upload-csv')
  @ApiConsumes('multipart/form-data')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Upload file CSV untuk import aspek & item penilaian' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadCsv(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('File CSV harus diupload');
    }
    const csvText = file.buffer.toString('utf-8');
    return this.service.importFromCsvText(csvText);
  }

  // ── Scores ────────────────────────────────────────────

  @Get('scores')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', 'penguji', { summary: 'Ambil semua nilai' })
  getScores(@Query() q: ScoreFilterDto, @Req() req: ScopedRequest) {
    return this.service.getScores(q, req.scope);
  }

  @Post('scores')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', 'penguji', { summary: 'Tambah nilai baru' })
  createScore(@Body() dto: CreateScoreDto) {
    return this.service.createScore(dto);
  }

  @Post('import')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', { summary: 'Impor nilai' })
  importScores(@Body() importDto: { data: Record<string, unknown>[] }) {
    return this.service.importScores(importDto.data);
  }
}
