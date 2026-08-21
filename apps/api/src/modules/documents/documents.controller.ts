import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req, Res, HttpCode } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DocumentsService, GenerateCertificateDto, GenerateAwardDto } from './documents.service';
import { DocumentBatchService } from './document-batch.service';
import { Public } from '../../common/decorators/public.decorator';
import {
  GenerateDocumentDto,
  BatchGenerateDocumentDto,
  DocumentFilterDto,
  BatchListQueryDto,
  BatchEstimateQueryDto,
  BatchRetryDto,
} from './dto/document.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequireScope } from '../../common/decorators/scope.decorator';
import { ScopedRequest } from '../../common/interfaces/user-scope.interface';
import { Response } from 'express';

@ApiTags('Documents')
@Controller('documents')
export class DocumentsController {
  constructor(
    private readonly service: DocumentsService,
    private readonly batchService: DocumentBatchService,
  ) {}

  @Get('verify/:token')
  @Public()
  @ApiOperation({ summary: 'Verifikasi dokumen dengan token' })
  verifyByToken(@Param('token') token: string) {
    return this.service.verifyByToken(token);
  }

  @Get(':id/file')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Download file PDF/PNG tersimpan dari dokumen' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', 'anggota')
  @RequireScope('branch')
  async downloadDocumentFile(@Param('id') id: string, @Req() req: ScopedRequest, @Res() res: Response) {
    const { filePath, nomorDokumen, tipe } = await this.service.getDocumentFile(id, req.scope);
    const ext = filePath.toLowerCase().endsWith('.png') ? 'image/png' : 'application/pdf';
    const extName = ext === 'image/png' ? 'png' : 'pdf';
    res.setHeader('Content-Type', ext);
    res.setHeader('Content-Disposition', `attachment; filename="${nomorDokumen}-${tipe}.${extName}"`);
    res.sendFile(filePath);
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ambil semua dokumen' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', 'anggota')
  @RequireScope('branch')
  findAll(@Query() q: DocumentFilterDto, @Req() req: ScopedRequest) {
    return this.service.findAll(q, req.scope);
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ambil detail dokumen' })
  @Roles(
    'superadmin',
    'admin_distrik',
    'admin_wilayah',
    'admin_ranting',
    'admin_kegiatan',
    'anggota',
  )
  @RequireScope('branch')
  findOne(@Param('id') id: string, @Req() req: ScopedRequest) {
    return this.service.findOne(id, req.scope);
  }

  @Post('generate')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate dokumen (synchronous, single)' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  generate(@Body() dto: GenerateDocumentDto) {
    return this.service.generate(dto);
  }

  @Post('batch')
  @HttpCode(202)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate dokumen massal (async, returns batchId)' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  batchGenerate(@Body() dto: BatchGenerateDocumentDto) {
    return this.service.batchGenerate(dto);
  }

  // ── Batch Progress Endpoints ──
  // IMPORTANT: Static routes (batch/estimate, batch/list) must be BEFORE
  // parameterized route (batch/:batchId) to avoid path conflicts.

  @Get('batch/estimate')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Estimasi jumlah anggota untuk batch generate' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  async estimateBatch(@Query() q: BatchEstimateQueryDto) {
    const count = await this.service.estimateBatch(q.range, q.rantingId);
    return { count };
  }

  @Get('batch/list')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Daftar batch generation (recent first)' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  getBatchList(@Query() q: BatchListQueryDto) {
    const limit = q.limit || 20;
    const page = q.page || 1;
    return this.batchService.getBatchList(limit, (page - 1) * limit);
  }

  // Alias: GET /documents/batch (without /list) for cleaner API
  @Get('batch')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Daftar batch (alias untuk /batch/list)' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  getBatchListAlias(@Query() q: BatchListQueryDto) {
    return this.getBatchList(q);
  }

  @Get('batch/:batchId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Progress batch generation by batchId' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  async getBatchProgress(@Param('batchId') batchId: string) {
    const progress = await this.batchService.getBatchProgress(batchId);
    if (!progress) {
      return { success: false, message: 'Batch tidak ditemukan' };
    }
    return progress;
  }

  @Get('batch/:batchId/export')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Export laporan batch ke CSV (status per-job)' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  async exportBatchCsv(@Param('batchId') batchId: string, @Res() res: Response) {
    const { csv, filename } = await this.batchService.exportCsv(batchId);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }

  @Post('batch/:batchId/retry')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retry job yang gagal dalam batch' })
  @Roles('superadmin', 'admin_distrik')
  @RequireScope('branch')
  async retryBatch(@Param('batchId') batchId: string, @Body() dto: BatchRetryDto) {
    const result = await this.batchService.retryBatch(batchId, dto.jobIds);
    return {
      data: result,
      message: `${result.retried} job di-queue ulang`,
    };
  }

  @Post('batch/:batchId/cancel')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Batalkan batch generation yang sedang berlangsung' })
  @Roles('superadmin', 'admin_distrik')
  @RequireScope('branch')
  async cancelBatch(@Param('batchId') batchId: string) {
    const cancelled = await this.batchService.cancelBatch(batchId);
    if (!cancelled) {
      return { success: false, message: 'Batch tidak ditemukan atau sudah selesai' };
    }
  }

  @Patch('batch/:batchId/cancel')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Batalkan batch (PATCH — alias untuk POST cancel)' })
  @Roles('superadmin', 'admin_distrik')
  @RequireScope('branch')
  async cancelBatchPatch(@Param('batchId') batchId: string) {
    return this.cancelBatch(batchId);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Hapus dokumen' })
  @Roles('superadmin', 'admin_distrik')
  @RequireScope('branch')
  remove(@Param('id') id: string, @Req() req: ScopedRequest) {
    return this.service.remove(id, req.scope);
  }

  @Get('types/list')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ambil tipe dokumen' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan')
  @RequireScope('branch')
  getTypes() {
    return this.service.getTypes();
  }

  // ── Certificate (Sertifikat Pendadaran) ──

  @Post('certificate')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate sertifikat pendadaran' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  generateCertificate(@Body() dto: GenerateCertificateDto) {
    return this.service.generateCertificate(dto);
  }

  @Post('certificate/pdf')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Download sertifikat pendadaran (PDF)' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  async getCertificatePdf(@Body() dto: GenerateCertificateDto, @Res() res: Response) {
    const pdfBuffer = await this.service.getCertificatePdf(dto.memberId, dto);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="sertifikat-${dto.memberId}.pdf"`);
    res.send(pdfBuffer);
  }

  @Post('certificate/image')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Preview sertifikat pendadaran (PNG)' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  async getCertificateImage(@Body() dto: GenerateCertificateDto, @Res() res: Response) {
    const pngBuffer = await this.service.getCertificateImage(dto.memberId, dto);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `inline; filename="sertifikat-${dto.memberId}.png"`);
    res.send(pngBuffer);
  }

  // ── Award (Piagam Prestasi) ──

  @Post('award')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate piagam prestasi' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  generateAward(@Body() dto: GenerateAwardDto) {
    return this.service.generateAward(dto);
  }

  @Get(':id/verify-qr')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verifikasi QR dokumen' })
  @Roles(
    'superadmin',
    'admin_distrik',
    'admin_wilayah',
    'admin_ranting',
    'admin_kegiatan',
    'anggota',
  )
  @RequireScope('branch')
  verifyQR(@Param('id') id: string) {
    return this.service.verifyQR(id);
  }
}
