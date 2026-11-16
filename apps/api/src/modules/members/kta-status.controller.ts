import { Controller, Get, UseGuards, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { KtaApplicationService } from './kta-application.service';
import { KtaStatusDto } from './dto/kta-status.dto';

@ApiTags('kta-status')
@Controller('kta-status')
@UseGuards(JwtAuthGuard)
export class KtaStatusController {
  constructor(private readonly ktaService: KtaApplicationService) {}

  @Get(':memberId')
  @Roles('anggota', 'admin_ranting', 'admin_wilayah', 'admin_distrik', 'admin_nasional', 'superadmin')
  @ApiOperation({ summary: 'Get KTA status for a member' })
  @ApiResponse({ status: 200, type: KtaStatusDto })
  async getStatus(@Param('memberId') memberId: string): Promise<KtaStatusDto> {
    return this.ktaService.getStatus(memberId);
  }
}
