import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req, UploadedFiles, UseInterceptors, Res } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ClaimsService } from './claims.service';
import { CreateClaimDto, UpdateClaimDto, ClaimFilterDto, RejectClaimDto } from './dto/claim.dto';
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
    return this.service.create(dto, files);
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
    return this.service.reject(id, b?.reason, req.scope);
  }

  @Post(':id/process')
  @CrudAuth('superadmin', 'admin_nasional', 'admin_distrik', 'admin_wilayah', 'admin_ranting', {
    summary: 'Proses klaim',
  })
  process(@Param('id') id: string, @Req() req: ScopedRequest) {
    return this.service.process(id, req.scope);
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