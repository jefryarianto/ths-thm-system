import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ImportBatchService } from './import-batch.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequireScope } from '../../common/decorators/scope.decorator';
import { ScopedRequest } from '../../common/interfaces/user-scope.interface';

class StartImportDto {
  module!: 'members' | 'candidates';
  rows!: Array<Record<string, unknown>>;
  fileName?: string;
}

@ApiTags('Import Batch')
@ApiBearerAuth()
@Controller('import-batch')
export class ImportBatchController {
  constructor(private readonly importBatchService: ImportBatchService) {}

  @Post()
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  @ApiOperation({
    summary: 'Mulai impor massal asinkron (members/candidates)',
    description: 'Menyimpan baris dan memprosesnya di antrian. Status per baris terpantau via GET /import-batch/:id.',
  })
  start(@Body() dto: StartImportDto, @Req() req: ScopedRequest) {
    return this.importBatchService.createBatch(
      dto.module,
      dto.rows,
      req.scope,
      req.user?.id,
      dto.fileName,
    );
  }

  @Get()
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  @ApiOperation({ summary: 'Daftar batch import (terbaru dulu)' })
  list(@Query('limit') limit: string, @Query('offset') offset: string) {
    return this.importBatchService.getBatchList(
      parseInt(limit || '20', 10) || 20,
      parseInt(offset || '0', 10) || 0,
    );
  }

  @Get(':id')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  @ApiOperation({ summary: 'Progress batch + hasil per baris' })
  progress(
    @Param('id') id: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
  ) {
    return this.importBatchService.getBatchProgress(
      id,
      parseInt(page || '1', 10) || 1,
      parseInt(limit || '50', 10) || 50,
    );
  }

  @Post(':id/retry')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  @ApiOperation({ summary: 'Ulangi baris yang gagal pada batch' })
  retry(@Param('id') id: string) {
    return this.importBatchService.retryFailed(id);
  }

  @Post(':id/cancel')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  @ApiOperation({ summary: 'Batalkan batch yang sedang diproses' })
  cancel(@Param('id') id: string) {
    return this.importBatchService.cancelBatch(id);
  }
}