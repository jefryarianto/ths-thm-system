import { Controller, Post, Get, Patch, Delete, Body, Param, Req, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { PaymentsService, CreateBankInfoDto, UpdateBankInfoDto } from './payments.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, resolve } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { CrudAuth } from '../../common/decorators/crud-auth.decorator';
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
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'anggota', { scope: 'self', summary: 'Dapatkan daftar rekening bank & QRIS aktif' })
  getBankInfo() {
    return this.service.getBankInfo();
  }

  @Get('bank-info/all')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Dapatkan semua rekening bank (termasuk non-aktif) — Admin' })
  getAllBankInfo() {
    return this.service.getAllBankInfo();
  }

  @Post('bank-info')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Tambah rekening bank baru — Admin' })
  createBankInfo(@Body() dto: CreateBankInfoDto) {
    return this.service.createBankInfo(dto);
  }

  @Patch('bank-info/:id')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Ubah rekening bank — Admin' })
  updateBankInfo(@Param('id') id: string, @Body() dto: UpdateBankInfoDto) {
    return this.service.updateBankInfo(id, dto);
  }

  @Delete('bank-info/:id')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Hapus rekening bank — Admin' })
  deleteBankInfo(@Param('id') id: string) {
    return this.service.deleteBankInfo(id);
  }

  // ── Payment Flow ──

  @Get(':id')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Ambil detail pembayaran iuran' })
  findOne(@Param('id') id: string, @Req() req: ScopedRequest) {
    return this.service.findOne(id, req.scope);
  }

  @Post(':id/upload-proof')
  @ApiConsumes('multipart/form-data')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'anggota', { scope: 'self', summary: 'Upload bukti pembayaran manual' })
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
    @Req() req: ScopedRequest,
    @UploadedFile() file?: Express.Multer.File,
    @Body('catatan') catatan?: string,
  ) {
    return this.service.uploadProof(id, { catatan, file }, req.scope, req.user);
  }

  @Patch(':id/verify')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Verifikasi pembayaran (admin)' })
  verifyPayment(@Param('id') id: string, @Req() req: ScopedRequest) {
    return this.service.verifyPayment(id, req.user.id, req.scope);
  }

  @Patch(':id/reject')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Tolak pembayaran (admin)' })
  rejectPayment(@Param('id') id: string, @Req() req: ScopedRequest) {
    return this.service.rejectPayment(id, req.scope);
  }
}
