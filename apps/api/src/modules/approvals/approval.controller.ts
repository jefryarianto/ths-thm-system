import { Controller, Get, Post, Body, Param, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ApprovalService, SubmitApprovalDto } from './approval.service';
import { CrudAuth } from '../../common/decorators/crud-auth.decorator';
import { ScopedRequest } from '../../common/interfaces/user-scope.interface';

@ApiTags('Approvals')
@Controller('approvals')
@ApiBearerAuth()
export class ApprovalController {
  constructor(private readonly service: ApprovalService) {}

  @Post('submit')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Ajukan persetujuan baru' })
  submit(@Body() dto: SubmitApprovalDto, @Req() req: ScopedRequest) {
    return this.service.submit(dto, req.user.id, req.scope);
  }

  @Post(':id/approve')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Setujui pengajuan' })
  approve(@Param('id') id: string, @Body('note') note: string | undefined, @Req() req: ScopedRequest) {
    return this.service.approve(id, req.user.id, note, req.scope);
  }

  @Post(':id/reject')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Tolak pengajuan' })
  reject(@Param('id') id: string, @Body('note') note: string | undefined, @Req() req: ScopedRequest) {
    return this.service.reject(id, req.user.id, note);
  }

  @Get(':id')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Ambil detail pengajuan persetujuan' })
  findOne(@Param('id') id: string, @Req() req: ScopedRequest) {
    return this.service.findOne(id, req.scope);
  }

  @Get('pending')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Lihat pengajuan yang menunggu persetujuan' })
  getPending(@Req() req: ScopedRequest) {
    return this.service.getPending(req.scope);
  }
}