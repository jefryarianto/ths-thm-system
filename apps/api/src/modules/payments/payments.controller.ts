import { Controller, Post, Get, Patch, Body, Param, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequireScope } from '../../common/decorators/scope.decorator';
import { ScopedRequest } from '../../common/interfaces/user-scope.interface';

@ApiTags('Payments')
@Controller('payments')
@ApiBearerAuth()
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}

  @Get('bank-info')
  @ApiOperation({ summary: 'Dapatkan informasi rekening bank & QRIS' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'anggota')
  getBankInfo() {
    return this.service.getBankInfo();
  }

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
