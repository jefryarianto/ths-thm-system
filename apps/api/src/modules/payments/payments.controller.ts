import { Controller, Post, Get, Patch, Body, Param, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
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
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'anggota')
  getBankInfo() {
    return this.service.getBankInfo();
  }

  @Post(':id/upload-proof')
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
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  verifyPayment(@Param('id') id: string, @Req() req: ScopedRequest) {
    return this.service.verifyPayment(id, req.user.id, req.scope);
  }

  @Patch(':id/reject')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  rejectPayment(@Param('id') id: string, @Req() req: ScopedRequest) {
    return this.service.rejectPayment(id, req.scope);
  }
}