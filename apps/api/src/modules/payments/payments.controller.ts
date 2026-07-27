import { Controller, Post, Get, Patch, Delete, Body, Param, Req, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { PaymentsService, CreateBankInfoDto, UpdateBankInfoDto } from './payments.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, resolve } from 'path';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequireScope } from '../../common/decorators/scope.decorator';
import { ScopedRequest } from '../../common/interfaces/user-scope.interface';

function buildProofStorage() {
  const rawDir = process.env.UPLOAD_DIR || './uploads';
  const proofDir = resolve(rawDir, 'proofs');
  if (!existsSync(proofDir)) {
    mkdirSync(proofDir, { recursive: true });
  }
  return diskStorage({
    destination: (_req, _file, cb) => {
      if (!existsSync(proofDir)) mkdirSync(proofDir, { recursive: true });
      cb(null, proofDir);
    },
    filename: (_req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = extname(file.originalname).toLowerCase();
      cb(null, `proof-${uniqueSuffix}${ext}`);
    },
  });
}

@ApiTags('Payments')
@Controller('payments')
@ApiBearerAuth()
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}

  // ── Bank Info Management (Admin) ──

  @Get('bank-info')
  @ApiOperation({ summary: 'Dapatkan daftar rekening bank & QRIS aktif' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'anggota')
  getBankInfo() {
    return this.service.getBankInfo();
  }

  @Get('bank-info/all')
  @ApiOperation({ summary: 'Dapatkan semua rekening bank (termasuk non-aktif) — Admin' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah')
  getAllBankInfo() {
    return this.service.getAllBankInfo();
  }

  @Post('bank-info')
  @ApiOperation({ summary: 'Tambah rekening bank baru — Admin' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah')
  createBankInfo(@Body() dto: CreateBankInfoDto) {
    return this.service.createBankInfo(dto);
  }

  @Patch('bank-info/:id')
  @ApiOperation({ summary: 'Ubah rekening bank — Admin' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah')
  updateBankInfo(@Param('id') id: string, @Body() dto: UpdateBankInfoDto) {
    return this.service.updateBankInfo(id, dto);
  }

  @Delete('bank-info/:id')
  @ApiOperation({ summary: 'Hapus rekening bank — Admin' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah')
  deleteBankInfo(@Param('id') id: string) {
    return this.service.deleteBankInfo(id);
  }

  // ── Payment Flow ──

  @Get(':id')
  @ApiOperation({ summary: 'Ambil detail pembayaran iuran' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  findOne(@Param('id') id: string, @Req() req: ScopedRequest) {
    return this.service.findOne(id, req.scope);
  }

  @Post(':id/upload-proof')
  @ApiOperation({ summary: 'Upload bukti pembayaran manual' })
  @ApiConsumes('multipart/form-data')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'anggota')
  @RequireScope('branch')
  @UseInterceptors(
    FileInterceptor('bukti', {
      storage: buildProofStorage(),
      fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/pdf'];
        if (!allowed.includes(file.mimetype)) {
          cb(new BadRequestException('Format file tidak didukung. Gunakan JPEG, PNG, WebP, atau PDF'), false);
          return;
        }
        cb(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadProof(
    @Param('id') id: string,
    @UploadedFile() file?: Express.Multer.File,
    @Body('catatan') catatan?: string,
    @Req() req: ScopedRequest,
  ) {
    return this.service.uploadProof(id, { catatan, file }, req.scope);
  }

  @Patch(':id/verify')
  @ApiOperation({ summary: 'Verifikasi pembayaran (admin)' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  verifyPayment(@Param('id') id: string, @Req() req: ScopedRequest) {
    return this.service.verifyPayment(id, req.user.id, req.scope);
  }

  @Patch(':id/reject')
  @ApiOperation({ summary: 'Tolak pembayaran (admin)' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  rejectPayment(@Param('id') id: string, @Req() req: ScopedRequest) {
    return this.service.rejectPayment(id, req.scope);
  }
}