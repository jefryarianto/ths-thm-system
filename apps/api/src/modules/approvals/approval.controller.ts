import { Controller, Get, Post, Body, Param, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ApprovalService, SubmitApprovalDto } from './approval.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequireScope } from '../../common/decorators/scope.decorator';
import { ScopedRequest } from '../../common/interfaces/user-scope.interface';

@ApiTags('Approvals')
@Controller('approvals')
@ApiBearerAuth()
export class ApprovalController {
  constructor(private readonly service: ApprovalService) {}

  @Post('submit')
  @ApiOperation({ summary: 'Ajukan persetujuan baru' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  submit(@Body() dto: SubmitApprovalDto, @Req() req: ScopedRequest) {
    return this.service.submit(dto, req.user.id, req.scope);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Setujui pengajuan' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  approve(@Param('id') id: string, @Body('note') note: string | undefined, @Req() req: ScopedRequest) {
    return this.service.approve(id, req.user.id, note, req.scope);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Tolak pengajuan' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  reject(@Param('id') id: string, @Body('note') note: string | undefined, @Req() req: ScopedRequest) {
    return this.service.reject(id, req.user.id, note);
  }

  @Get('pending')
  @ApiOperation({ summary: 'Lihat pengajuan yang menunggu persetujuan' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  getPending(@Req() req: ScopedRequest) {
    return this.service.getPending(req.scope);
  }
}