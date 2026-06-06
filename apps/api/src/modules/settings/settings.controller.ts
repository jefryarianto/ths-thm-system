import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { CreatePeriodDto, UpdatePeriodDto, CreateSignatureDto, CreateStampDto } from './dto/setting.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequireScope } from '../../common/decorators/scope.decorator';

@ApiTags('Settings')
@Controller('settings')
@ApiBearerAuth()
export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  @Get()
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  getSettings() { return this.service.getSettings(); }

  @Patch()
  @Roles('superadmin')
  updateSettings(@Body() dto: Record<string, unknown>) { return this.service.updateSettings(dto); }

  @Get('periods')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  getPeriods() { return this.service.getPeriods(); }

  @Get('periods/:id')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  getPeriod(@Param('id') id: string) { return this.service.getPeriod(id); }

  @Post('periods')
  @Roles('superadmin', 'admin_distrik')
  @RequireScope('branch')
  createPeriod(@Body() dto: CreatePeriodDto) { return this.service.createPeriod(dto); }

  @Patch('periods/:id')
  @Roles('superadmin', 'admin_distrik')
  @RequireScope('branch')
  updatePeriod(@Param('id') id: string, @Body() dto: UpdatePeriodDto) { return this.service.updatePeriod(id, dto); }

  @Delete('periods/:id')
  @Roles('superadmin', 'admin_distrik')
  @RequireScope('branch')
  deletePeriod(@Param('id') id: string) { return this.service.deletePeriod(id); }

  @Get('roles')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  getRoles() { return this.service.getRoles(); }

  @Post('signatures')
  @Roles('superadmin', 'admin_distrik')
  uploadSignature(@Body() dto: CreateSignatureDto) { return this.service.uploadSignature(dto); }

  @Get('signatures')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  getSignatures() { return this.service.getSignatures(); }

  @Delete('signatures/:id')
  @Roles('superadmin', 'admin_distrik')
  deleteSignature(@Param('id') id: string) { return this.service.deleteSignature(id); }

  @Post('stamp')
  @Roles('superadmin', 'admin_distrik')
  uploadStamp(@Body() dto: CreateStampDto) { return this.service.uploadStamp(dto); }

  @Get('stamp')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  getStamp() { return this.service.getStamp(); }
}
