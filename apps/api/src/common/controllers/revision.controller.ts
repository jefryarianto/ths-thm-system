import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RevisionService } from '../services/revision.service';
import { Roles } from '../decorators/roles.decorator';
import { RequireScope } from '../decorators/scope.decorator';
import { ScopedRequest } from '../interfaces/user-scope.interface';

class RestoreRevisionDto {
  id!: string;
  entity!: string;
  entityId!: string;
}

@ApiTags('Revisions')
@ApiBearerAuth()
@Controller('admin/revisions')
export class RevisionController {
  constructor(private readonly revisionService: RevisionService) {}

  @Get()
  @Roles('superadmin')
  @RequireScope('national')
  @ApiOperation({ summary: 'Daftar riwayat revisi (diff audit) untuk sebuah entitas' })
  list(
    @Query('entity') entity: string,
    @Query('entityId') entityId: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
  ) {
    return this.revisionService.listRevisions(
      entity,
      entityId,
      parseInt(page || '1', 10) || 1,
      parseInt(limit || '20', 10) || 20,
    );
  }

  @Get(':id/diff')
  @Roles('superadmin')
  @RequireScope('national')
  @ApiOperation({ summary: 'Lihat diff (perubahan field) dari sebuah revisi' })
  diff(@Param('id') id: string) {
    return this.revisionService.getRevision(id);
  }

  @Get('compare/:fromId/:toId')
  @Roles('superadmin')
  @RequireScope('national')
  @ApiOperation({ summary: 'Bandingkan dua revisi untuk entitas yang sama' })
  compare(
    @Query('entity') entity: string,
    @Query('entityId') entityId: string,
    @Param('fromId') fromId: string,
    @Param('toId') toId: string,
  ) {
    return this.revisionService.compareRevisions(entity, entityId, fromId, toId);
  }

  @Post('restore')
  @Roles('superadmin')
  @RequireScope('national')
  @ApiOperation({
    summary: 'Pulihkan data ke nilai lama dari sebuah revisi',
    description: 'Hanya field yang berubah pada revisi tersebut yang dikembalikan. Membuat jejak revisi RESTORE.',
  })
  restore(@Body() dto: RestoreRevisionDto, @Req() req: ScopedRequest) {
    return this.revisionService.restore(dto.entity, dto.entityId, dto.id, req.user?.id);
  }
}