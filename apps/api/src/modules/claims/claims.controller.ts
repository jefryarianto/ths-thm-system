import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req, UploadedFiles, UseInterceptors, Res } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ClaimsService } from './claims.service';
import { BulkClaimDto, CreateClaimDto, UpdateClaimDto, ClaimFilterDto, RejectClaimDto } from './dto/claim.dto';
import { CrudAuth } from '../../common/decorators/crud-auth.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { ScopedRequest } from '../../common/interfaces/user-scope.interface';
import { buildClaimUploadOptions } from '../../common/utils/claim-upload.util';

@ApiTags('Claims')
@Controller('claims')
@ApiBearerAuth()
export class ClaimsController {
  constructor(private readonly service: ClaimsService) {}

  @Get()
  @CrudAuth('superadmin', 'admin_nasional', 'admin_distrik', 'admin_wilayah', 'admin_ranting', {
    summary: 'Ambil semua klaim',
  })
  findAll(@Query() q: ClaimFilterDto, @Req() req: ScopedRequest) {
    return this.service.findAll(q, req.scope);
  }

  @Get(':id')
  @CrudAuth('superadmin', 'admin_nasional', 'admin_distrik', 'admin_wilayah', 'admin_ranting', {
    summary: 'Ambil detail klaim',
  })
  findOne(@Param('id') id: string, @Req() req: ScopedRequest) {
    return this.service.findOne(id, req.scope);
  }

  @Post()
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60 } })
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Tambah klaim baru (publik — pendaftaran mandiri anggota belum terdaftar)',
  })
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'buktiFiles', maxCount: 3 },
        { name: 'dokumenPendukungFiles', maxCount: 3 },
      ],
      buildClaimUploadOptions(),
    ),
  )
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        tipe: { type: 'string', enum: ['keanggotaan', 'dokumen'] },
        namaLengkap: { type: 'string' },
        jenisKelamin: { type: 'string', enum: ['L', 'P'] },
        tempatLahir: { type: 'string' },
        tanggalLahir: { type: 'string', format: 'date' },
        tempatDadar: { type: 'string' },
        tahunDadar: { type: 'string' },
        alamat: { type: 'string' },
        noHp: { type: 'string' },
        email: { type: 'string', format: 'email' },
        catatan: { type: 'string' },
        rantingId: { type: 'string' },
        modeBukti: {
          type: 'string',
          enum: ['unggah', 'cerita'],
          description:
            'Cara pembuktian klaim keanggotaan: unggah bukti atau cerita singkat riwayat keanggotaan',
        },
        ceritaHistori: {
          type: 'string',
          description: 'Cerita singkat riwayat menjadi anggota (maksimal 1000 karakter)',
          maxLength: 1000,
        },
        pekerjaan: {
          type: 'string',
          description: 'Pekerjaan anggota',
          maxLength: 120,
        },
        pelantikan: {
          type: 'string',
          description: 'Pelantikan anggota',
          maxLength: 160,
        },
        buktiTipe: {
          type: 'string',
          enum: ['sertifikat', 'kartu_anggota'],
          description: 'Tipe bukti keanggotaan',
        },
        buktiFiles: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Bukti keanggotaan (max 3 files, image/PDF, 5MB each)',
        },
        dokumenPendukungFiles: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Dokumen pendukung lain (max 3 files, image/PDF, 5MB each)',
        },
      },
    },
  })
  create(
    @Body() dto: CreateClaimDto,
    @UploadedFiles() files: { 
      buktiFiles?: Express.Multer.File[]; 
      dokumenPendukungFiles?: Express.Multer.File[] 
    }
  ) {
    return this.service.create(dto, files, dto.buktiTipe as 'sertifikat' | 'kartu_anggota' || 'kartu_anggota');
  }

  @Post('bulk')
  @CrudAuth('superadmin', 'admin_nasional', 'admin_ranting', {
    summary: 'Buat klaim massal oleh admin ranting (bukti dapat menyusul)',
  })
  @ApiOperation({ summary: 'Buat hingga 100 klaim sekaligus dalam satu ranting' })
  createBulk(@Body() dto: BulkClaimDto, @Req() req: ScopedRequest) {
    return this.service.createBulk(dto, req.scope);
  }

  @Patch(':id')
  @CrudAuth('superadmin', 'admin_nasional', 'admin_distrik', 'admin_wilayah', 'admin_ranting', {
    summary: 'Perbarui klaim',
  })
  update(@Param('id') id: string, @Body() dto: UpdateClaimDto, @Req() req: ScopedRequest) {
    return this.service.update(id, dto, req.scope, req.user?.id);
  }

  @Delete(':id')
  @CrudAuth('superadmin', 'admin_nasional', 'admin_distrik', 'admin_wilayah', {
    summary: 'Hapus klaim',
  })
  remove(@Param('id') id: string, @Req() req: ScopedRequest) {
    return this.service.remove(id, req.scope);
  }

  @Post(':id/approve')
  @CrudAuth('superadmin', 'admin_nasional', 'admin_distrik', 'admin_wilayah', 'admin_ranting', {
    summary: 'Setujui klaim',
  })
  approve(@Param('id') id: string, @Req() req: ScopedRequest) {
    return this.service.approve(id, req.scope, req.user?.id);
  }

  @Post(':id/reject')
  @CrudAuth('superadmin', 'admin_nasional', 'admin_distrik', 'admin_wilayah', 'admin_ranting', {
    summary: 'Tolak klaim',
  })
  reject(@Param('id') id: string, @Body() b: RejectClaimDto, @Req() req: ScopedRequest) {
    return this.service.reject(id, b?.reason, req.scope, req.user?.id);
  }

  @Post(':id/process')
  @CrudAuth('superadmin', 'admin_nasional', 'admin_distrik', 'admin_wilayah', 'admin_ranting', {
    summary: 'Proses klaim',
  })
  process(@Param('id') id: string, @Req() req: ScopedRequest) {
    return this.service.process(id, req.scope);
  }

  @Post(':id/bukti')
  @CrudAuth('superadmin', 'admin_nasional', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @UseInterceptors(
    FileFieldsInterceptor([{ name: 'files', maxCount: 5 }], buildClaimUploadOptions())
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Tambah bukti keanggotaan multi-dokumen ke klaim' })
  addBukti(
    @Param('id') id: string,
    @UploadedFiles() files: { files?: Express.Multer.File[] },
    @Body('tipe') tipe: 'sertifikat' | 'kartu_anggota',
    @Req() req: ScopedRequest,
  ) {
    return this.service.addBuktiFiles(id, files.files || [], tipe, req.scope);
  }

  @Post(':id/dokumen')
  @CrudAuth('superadmin', 'admin_nasional', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @UseInterceptors(
    FileFieldsInterceptor([{ name: 'files', maxCount: 5 }], buildClaimUploadOptions())
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Tambah dokumen pendukung multi-dokumen ke klaim' })
  addDokumen(
    @Param('id') id: string,
    @UploadedFiles() files: { files?: Express.Multer.File[] },
    @Req() req: ScopedRequest,
    @Body('description') description?: string,
  ) {
    return this.service.addDokumenFiles(id, files.files || [], description, req.scope);
  }

  @Get(':id/files/:fileId')
  @CrudAuth('superadmin', 'admin_nasional', 'admin_distrik', 'admin_wilayah', 'admin_ranting', {
    summary: 'Download file bukti klaim',
  })
  async downloadFile(
    @Param('id') claimId: string,
    @Param('fileId') fileId: string,
    @Res() res: Response,
  ) {
    return this.service.downloadFile(claimId, fileId, res);
  }

  @Delete(':id/files/:fileId')
  @CrudAuth('superadmin', 'admin_nasional', 'admin_distrik', 'admin_wilayah', 'admin_ranting', {
    summary: 'Hapus file bukti klaim',
  })
  async deleteFile(@Param('id') claimId: string, @Param('fileId') fileId: string) {
    return this.service.deleteFile(claimId, fileId);
  }
}