import { Controller, Get, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { ScopedRequest } from '../../common/interfaces/user-scope.interface';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Search')
@ApiBearerAuth()
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', 'penguji', 'anggota')
  @ApiOperation({
    summary: 'Pencarian gabungan lintas entitas (anggota, calon, kegiatan, latihan, user, dokumen)',
  })
  search(
    @Query('q') q: string,
    @Query('type') type: string,
    @Query('limit') limit: string,
    @Req() req: ScopedRequest,
  ) {
    const types = type
      ? type.split(',').map((t) => t.trim()).filter(Boolean)
      : ['all'];
    const parsedLimit = Math.min(Math.max(parseInt(limit || '8', 10) || 8, 1), 50);
    return this.searchService.search(q, req.scope, types, parsedLimit);
  }
}