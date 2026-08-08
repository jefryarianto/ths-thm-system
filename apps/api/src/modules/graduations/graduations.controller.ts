import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { GraduationsService } from './graduations.service';
import {
  CreateGraduationDto,
  UpdateGraduationDto,
  GraduationFilterDto,
  RegisterParticipantDto,
  GraduateDto,
  ValidateResultDto,
  GenerateDocsDto,
} from './dto/graduation.dto';
import { CrudAuth } from '../../common/decorators/crud-auth.decorator';
import { ScopedRequest } from '../../common/interfaces/user-scope.interface';

@ApiTags('Graduations')
@Controller('graduations')
@ApiBearerAuth()
export class GraduationsController {
  constructor(private readonly service: GraduationsService) {}

  // ── CRUD endpoints ──

  @Get()
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', { summary: 'Ambil semua wisuda' })
  findAll(@Query() query: GraduationFilterDto, @Req() req: ScopedRequest) {
    return this.service.findAll(query, req.scope);
  }

  @Get(':id')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', { summary: 'Ambil detail wisuda' })
  findOne(@Param('id') id: string, @Req() req: ScopedRequest) {
    return this.service.findOne(id, req.scope);
  }

  @Patch(':id')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', { summary: 'Perbarui pendadaran' })
  update(@Param('id') id: string, @Body() dto: UpdateGraduationDto, @Req() req: ScopedRequest) {
    return this.service.update(id, dto, req.scope);
  }

  @Post()
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', { summary: 'Tambah wisuda baru' })
  create(@Body() dto: CreateGraduationDto, @Req() req: ScopedRequest) {
    return this.service.create(dto, req.scope, req.user?.id);
  }

  @Delete(':id')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', { summary: 'Hapus / batalkan pendadaran' })
  remove(@Param('id') id: string, @Req() req: ScopedRequest) {
    return this.service.delete(id, req.scope);
  }

  // ── Participant endpoints ──

  @Post(':id/register')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', { summary: 'Daftarkan peserta wisuda' })
  register(@Param('id') id: string, @Body() dto: RegisterParticipantDto, @Req() req: ScopedRequest) {
    return this.service.registerParticipant(id, dto, req.scope);
  }

  @Post(':id/unregister')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', { summary: 'Batalkan pendaftaran wisuda' })
  unregister(@Param('id') id: string, @Body() dto: RegisterParticipantDto, @Req() req: ScopedRequest) {
    return this.service.unregisterParticipant(id, dto, req.scope);
  }

  @Get(':id/participants')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', 'penguji', { summary: 'Ambil peserta wisuda' })
  getParticipants(@Param('id') id: string, @Req() req: ScopedRequest) {
    return this.service.getParticipants(id, req.scope);
  }

  @Post(':id/participants/import')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', { summary: 'Impor peserta wisuda' })
  importParticipants(
    @Param('id') id: string,
    @Body() importDto: { data: Array<{ candidateId?: string; id?: string }> },
    @Req() req: ScopedRequest,
  ) {
    return this.service.importParticipants(id, importDto.data, req.scope);
  }

  // ── Graduate & Documents ──

  @Post(':id/graduate')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', { summary: 'Proses kelulusan (hitung skor & ranking, buat HasilPendadaran pending)' })
  graduate(@Param('id') id: string, @Body() dto: GraduateDto, @Req() req: ScopedRequest) {
    return this.service.graduate(id, dto, req.scope);
  }

  /**
   * VALIDATION GAP FIX: Admin validasi hasil pendadaran (Approve / Reject).
   * - Approve + lulus → otomatis buat Anggota (NRA) + generate sertifikat.
   */
  @Post(':id/validate-result')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', { summary: 'Validasi (approve/reject) hasil pendadaran oleh admin' })
  validateResult(
    @Param('id') id: string,
    @Body() dto: ValidateResultDto,
    @Req() req: ScopedRequest,
  ) {
    return this.service.validateResult(id, dto, req.user?.id, req.scope);
  }

  @Post(':id/generate-docs')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', { summary: 'Generate sertifikat batch untuk lulus+approved' })
  generateDocs(
    @Param('id') id: string,
    @Body() dto: GenerateDocsDto,
    @Req() req: ScopedRequest,
  ) {
    return this.service.generateDocuments(id, dto, req.scope);
  }

  // ── Results (HasilPendadaran + status validasi) ──

  @Get(':id/results')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', { summary: 'Ambil hasil pendadaran beserta status validasi' })
  getResults(@Param('id') id: string, @Req() req: ScopedRequest) {
    return this.service.getResults(id, req.scope);
  }

  // ── Evaluations (Nilai aspek & item penilaian) — didokumentasikan di API.md ──

  @Get(':id/evaluations')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', 'penguji', { summary: 'Nilai evaluasi / penilaian pendadaran' })
  getEvaluations(@Param('id') id: string, @Req() req: ScopedRequest) {
    return this.service.getEvaluations(id, req.scope);
  }

  // ── Workflow pendadaran: pengajuan & persetujuan penguji, nilai, dan pengajuan ke distrik ──

  @Get(':id/examiners')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', 'penguji', { summary: 'Daftar penguji pendadaran beserta status persetujuan' })
  getExaminers(@Param('id') id: string, @Req() req: ScopedRequest) {
    return this.service.getExaminers(id, req.scope);
  }

  @Post(':id/examiners')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', { summary: 'Admin kegiatan mengajukan penguji (status pending, menunggu persetujuan admin distrik)' })
  proposeExaminer(
    @Param('id') id: string,
    @Body() dto: { pengujiUserId: string; peran?: string; catatan?: string },
    @Req() req: ScopedRequest,
  ) {
    return this.service.proposeExaminer(id, dto, req.scope);
  }

  @Post(':id/examiners/:penugasanId/review')
  @CrudAuth('superadmin', 'admin_distrik', { summary: 'Admin distrik menyetujui / menolak pengajuan penguji' })
  reviewExaminer(
    @Param('id') id: string,
    @Param('penugasanId') penugasanId: string,
    @Body() dto: { approved: boolean; catatan?: string },
    @Req() req: ScopedRequest,
  ) {
    return this.service.reviewExaminer(id, penugasanId, dto, req.user?.id, req.scope);
  }

  @Post(':id/scores/approve')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', { summary: 'Admin kegiatan menyetujui seluruh nilai penguji' })
  approveScores(@Param('id') id: string, @Req() req: ScopedRequest) {
    return this.service.approveScores(id, req.user?.id, req.scope);
  }

  @Post(':id/submit-results')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', { summary: 'Admin kegiatan mengajukan seluruh nilai ke admin distrik untuk review & approve' })
  submitResults(@Param('id') id: string, @Req() req: ScopedRequest) {
    return this.service.submitResults(id, req.user?.id, req.scope);
  }
}
