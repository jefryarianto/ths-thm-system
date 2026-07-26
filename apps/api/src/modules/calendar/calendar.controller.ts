import { Controller, Get, Query, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CalendarService } from './calendar.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequireScope } from '../../common/decorators/scope.decorator';
import { ScopedRequest } from '../../common/interfaces/user-scope.interface';

@ApiTags('Calendar')
@Controller('calendar')
@ApiBearerAuth()
export class CalendarController {
  constructor(private readonly service: CalendarService) {}

  @Get('events')
  @ApiOperation({ summary: 'Ambil event kalender per bulan (latihan, kegiatan, pendadaran)' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', 'penguji', 'anggota')
  @RequireScope('branch')
  getEvents(
    @Query('year') year: string,
    @Query('month') month: string,
    @Req() req: ScopedRequest,
  ) {
    const y = parseInt(year, 10) || new Date().getFullYear();
    const m = parseInt(month, 10) || new Date().getMonth() + 1;
    return this.service.getCalendarEvents(y, m, req.scope);
  }

  @Get('holidays')
  @ApiOperation({ summary: 'Ambil hari libur nasional (opsional filter tahun)' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', 'penguji', 'anggota')
  @RequireScope('branch')
  getHolidays(@Query('year') year: string) {
    const y = year ? parseInt(year, 10) : undefined;
    return this.service.getHolidays(y);
  }

  @Get('upcoming')
  @ApiOperation({ summary: 'Ambil event 7 hari ke depan (latihan + iuran jatuh tempo)' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', 'penguji', 'anggota')
  @RequireScope('branch')
  getUpcoming(
    @Query('days') days: string,
    @Req() req: ScopedRequest,
  ) {
    const d = parseInt(days, 10) || 7;
    return this.service.getUpcomingEvents(d, req.scope);
  }
}