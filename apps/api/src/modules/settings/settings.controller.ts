import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SettingsService } from './settings.service';

@ApiTags('Settings')
@Controller('settings')
@ApiBearerAuth()
export class SettingsController {
  constructor(private readonly service: SettingsService) {}
  @Get() getSettings() { return this.service.getSettings(); }
  @Patch() updateSettings(@Body() dto: any) { return this.service.updateSettings(dto); }
  @Get('periods') getPeriods() { return this.service.getPeriods(); }
  @Get('periods/:id') getPeriod(@Param('id') id: string) { return this.service.getPeriod(id); }
  @Post('periods') createPeriod(@Body() dto: any) { return this.service.createPeriod(dto); }
  @Patch('periods/:id') updatePeriod(@Param('id') id: string, @Body() dto: any) { return this.service.updatePeriod(id, dto); }
  @Delete('periods/:id') deletePeriod(@Param('id') id: string) { return this.service.deletePeriod(id); }
  @Get('roles') getRoles() { return this.service.getRoles(); }
  @Post('signatures') uploadSignature(@Body() dto: any) { return this.service.uploadSignature(dto); }
  @Get('signatures') getSignatures() { return this.service.getSignatures(); }
  @Delete('signatures/:id') deleteSignature(@Param('id') id: string) { return this.service.deleteSignature(id); }
  @Post('stamp') uploadStamp(@Body() dto: any) { return this.service.uploadStamp(dto); }
  @Get('stamp') getStamp() { return this.service.getStamp(); }
}