import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UjianPraktekService } from './ujian-praktek.service';
import {
  CreateUjianPraktekDto,
  UpdateUjianPraktekDto,
  AssignExaminerDto,
  RemoveExaminerDto,
  AssignItemDto,
  BulkScoreDto,
} from './dto/ujian-praktek.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequireScope } from '../../common/decorators/scope.decorator';
import { ScopedRequest } from '../../common/interfaces/user-scope.interface';

@ApiTags('Ujian Praktek')
@Controller('graduations')
@ApiBearerAuth()
export class UjianPraktekController {
  constructor(private readonly service: UjianPraktekService) {}

  // ─── CRUD Ujian Praktek ─────────────────────────────────

  @Get(':kegiatanId/ujian-praktek')
  @ApiOperation({ summary: 'Ambil semua ujian praktek dalam pendadaran' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', 'penguji')
  @RequireScope('branch')
  findAll(@Param('kegiatanId') kegiatanId: string) {
    return this.service.findByKegiatan(kegiatanId);
  }

  @Get(':kegiatanId/ujian-praktek/:id')
  @ApiOperation({ summary: 'Ambil detail ujian praktek' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', 'penguji')
  @RequireScope('branch')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post(':kegiatanId/ujian-praktek')
  @ApiOperation({ summary: 'Buat ujian praktek baru' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_kegiatan')
  @RequireScope('branch')
  create(
    @Param('kegiatanId') kegiatanId: string,
    @Body() dto: CreateUjianPraktekDto,
  ) {
    return this.service.create(kegiatanId, dto);
  }

  @Patch(':kegiatanId/ujian-praktek/:id')
  @ApiOperation({ summary: 'Perbarui ujian praktek' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_kegiatan')
  @RequireScope('branch')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUjianPraktekDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':kegiatanId/ujian-praktek/:id')
  @ApiOperation({ summary: 'Hapus ujian praktek' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_kegiatan')
  @RequireScope('branch')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  // ─── Examiner Management ───────────────────────────────

  @Post(':kegiatanId/ujian-praktek/:id/examiners')
  @ApiOperation({ summary: 'Tugaskan penguji ke ujian praktek' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_kegiatan')
  @RequireScope('branch')
  assignExaminer(
    @Param('id') id: string,
    @Body() dto: AssignExaminerDto,
  ) {
    return this.service.assignExaminer(id, dto);
  }

  @Delete(':kegiatanId/ujian-praktek/:id/examiners')
  @ApiOperation({ summary: 'Hapus penguji dari ujian praktek' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_kegiatan')
  @RequireScope('branch')
  removeExaminer(
    @Param('id') id: string,
    @Body() dto: RemoveExaminerDto,
  ) {
    return this.service.removeExaminer(id, dto);
  }

  // ─── Assessment Items ──────────────────────────────────

  @Post(':kegiatanId/ujian-praktek/:id/items')
  @ApiOperation({ summary: 'Tambah item penilaian ke ujian praktek' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_kegiatan')
  @RequireScope('branch')
  assignItem(
    @Param('id') id: string,
    @Body() dto: AssignItemDto,
  ) {
    return this.service.assignItem(id, dto);
  }

  @Delete(':kegiatanId/ujian-praktek/:id/items/:itemPenilaianId')
  @ApiOperation({ summary: 'Hapus item penilaian dari ujian praktek' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_kegiatan')
  @RequireScope('branch')
  removeItem(
    @Param('id') id: string,
    @Param('itemPenilaianId') itemPenilaianId: string,
  ) {
    return this.service.removeItem(id, itemPenilaianId);
  }

  // ─── Scoring ────────────────────────────────────────────

  @Get(':kegiatanId/ujian-praktek/:id/scores')
  @ApiOperation({ summary: 'Ambil nilai ujian praktek' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_kegiatan', 'penguji')
  @RequireScope('branch')
  getScores(@Param('id') id: string) {
    return this.service.getScores(id);
  }

  @Post(':kegiatanId/ujian-praktek/:id/score')
  @ApiOperation({ summary: 'Input nilai ujian praktek (bulk per penguji)' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_kegiatan', 'penguji')
  @RequireScope('branch')
  scoreCandidate(
    @Param('id') id: string,
    @Body() dto: BulkScoreDto,
    @Req() req: ScopedRequest,
  ) {
    return this.service.scoreCandidate(id, dto, req.user?.id || 'system');
  }

  // ─── Reference Data ─────────────────────────────────────

  @Get(':kegiatanId/ujian-praktek/available-items')
  @ApiOperation({ summary: 'Ambil item penilaian yang tersedia' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_kegiatan')
  @RequireScope('branch')
  getAvailableItems() {
    return this.service.getAvailableItems();
  }

  @Get(':kegiatanId/ujian-praktek/available-examiners')
  @ApiOperation({ summary: 'Ambil penguji yang tersedia' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_kegiatan')
  @RequireScope('branch')
  getAvailableExaminers(@Param('kegiatanId') kegiatanId: string) {
    return this.service.getAvailableExaminers(kegiatanId);
  }
}
