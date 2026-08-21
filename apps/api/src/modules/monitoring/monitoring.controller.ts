import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MonitoringService } from './monitoring.service';
import { CreateMonitoringAlertDto, UpdateMonitoringAlertDto } from './dto/monitoring-alert.dto';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Monitoring')
@Controller('monitoring')
@ApiBearerAuth()
export class MonitoringController {
  constructor(private readonly service: MonitoringService) {}

  // ── Alerts CRUD ────────────────────────────────────

  @Get('alerts')
  @Roles('superadmin', 'admin_distrik', 'admin_ranting')
  @ApiOperation({ summary: 'Daftar semua alert threshold' })
  async findAll() {
    return this.service.findAll();
  }

  @Get('alerts/:id')
  @Roles('superadmin', 'admin_distrik', 'admin_ranting')
  @ApiOperation({ summary: 'Detail alert threshold' })
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post('alerts')
  @Roles('superadmin', 'admin_distrik', 'admin_ranting')
  @ApiOperation({ summary: 'Tambah alert threshold baru' })
  async create(@Body() dto: CreateMonitoringAlertDto) {
    return this.service.create(dto);
  }

  @Patch('alerts/:id')
  @Roles('superadmin', 'admin_distrik', 'admin_ranting')
  @ApiOperation({ summary: 'Perbarui alert threshold' })
  async update(@Param('id') id: string, @Body() dto: UpdateMonitoringAlertDto) {
    return this.service.update(id, dto);
  }

  @Delete('alerts/:id')
  @Roles('superadmin')
  @ApiOperation({ summary: 'Hapus alert threshold' })
  async delete(@Param('id') id: string) {
    return this.service.delete(id);
  }

  @Post('alerts/:id/toggle')
  @Roles('superadmin', 'admin_distrik', 'admin_ranting')
  @ApiOperation({ summary: 'Aktif/nonaktifkan alert' })
  async toggle(@Param('id') id: string) {
    return this.service.toggle(id);
  }
}
