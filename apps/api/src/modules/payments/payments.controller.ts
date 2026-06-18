import { Controller, Post, Get, Patch, Delete, Body, Param, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PaymentsService, CreateBankInfoDto, UpdateBankInfoDto } from './payments.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequireScope } from '../../common/decorators/scope.decorator';
import { ScopedRequest } from '../../common/interfaces/user-scope.interface';

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

  @Post(':id/upload-proof')
  @ApiOperation({ summary: 'Upload bukti pembayaran manual' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'anggota')
  @RequireScope('branch')
  uploadProof(
    @Param('id') id: string,
    @Body() payload: { catatan: string; buktiBayarPath?: string },
    @Req() req: ScopedRequest,
  ) {
    return this.service.uploadProof(id, payload, req.scope);
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