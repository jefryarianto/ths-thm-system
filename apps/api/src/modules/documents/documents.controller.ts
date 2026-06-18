import { Controller, Get, Post, Delete, Body, Param, Query, Req, Res } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DocumentsService, GenerateCertificateDto, GenerateAwardDto } from './documents.service';
import { Public } from '../../common/decorators/public.decorator';
import {
  GenerateDocumentDto,
  BatchGenerateDocumentDto,
  DocumentFilterDto,
} from './dto/document.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequireScope } from '../../common/decorators/scope.decorator';
import { ScopedRequest } from '../../common/interfaces/user-scope.interface';
import { Response } from 'express';

@ApiTags('Documents')
@Controller('documents')
export class DocumentsController {
  constructor(private readonly service: DocumentsService) {}

  @Get('verify/:token')
  @Public()
  @ApiOperation({ summary: 'Verifikasi dokumen dengan token' })
  verifyByToken(@Param('token') token: string) {
    return this.service.verifyByToken(token);
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ambil semua dokumen' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan')
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
  @ApiOperation({ summary: 'Generate dokumen' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  generate(@Body() dto: GenerateDocumentDto) {
    return this.service.generate(dto);
  }

  @Post('batch')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate dokumen massal' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  batchGenerate(@Body() dto: BatchGenerateDocumentDto) {
    return this.service.batchGenerate(dto);
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
