import { Controller, Get, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TargetsService } from './targets.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequireScope } from '../../common/decorators/scope.decorator';
import { ScopedRequest } from '../../common/interfaces/user-scope.interface';

@ApiTags('Targets')
@Controller('targets')
@ApiBearerAuth()
export class TargetsController {
  constructor(private readonly service: TargetsService) {}

  @Get()
  @ApiOperation({ summary: 'Target & progress organisasi (anggota, iuran, kandidat)' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  getTargets(@Req() req: ScopedRequest) {
    return this.service.getTargets(req.scope);
  }
}