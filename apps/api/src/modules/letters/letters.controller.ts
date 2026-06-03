import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { LettersService } from './letters.service';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Letters')
@Controller('letters')
@ApiBearerAuth()
export class LettersController {
  constructor(private readonly service: LettersService) {}

  @Get()
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  findAllCombined(@Query() query: any) { return this.service.findAllCombined(query); }

  @Get('incoming')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  incomingFindAll(@Query() query: any) { return this.service.incomingFindAll(query); }

  @Get('incoming/:id')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  incomingFindOne(@Param('id') id: string) { return this.service.incomingFindOne(id); }

  @Post('incoming')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  incomingCreate(@Body() dto: any) { return this.service.incomingCreate(dto); }

  @Patch('incoming/:id')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  incomingUpdate(@Param('id') id: string, @Body() dto: any) { return this.service.incomingUpdate(id, dto); }

  @Delete('incoming/:id')
  @Roles('superadmin', 'admin_distrik')
  incomingRemove(@Param('id') id: string) { return this.service.incomingRemove(id); }

  @Post('incoming/:id/disposition')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah')
  createDisposition(@Param('id') id: string, @Body() dto: any) { return this.service.createDisposition(id, dto); }

  @Get('outgoing')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  outgoingFindAll(@Query() query: any) { return this.service.outgoingFindAll(query); }

  @Get('outgoing/:id')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  outgoingFindOne(@Param('id') id: string) { return this.service.outgoingFindOne(id); }

  @Post('outgoing')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  outgoingCreate(@Body() dto: any) { return this.service.outgoingCreate(dto); }

  @Patch('outgoing/:id')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  outgoingUpdate(@Param('id') id: string, @Body() dto: any) { return this.service.outgoingUpdate(id, dto); }

  @Delete('outgoing/:id')
  @Roles('superadmin', 'admin_distrik')
  outgoingRemove(@Param('id') id: string) { return this.service.outgoingRemove(id); }

  @Post('outgoing/:id/send')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  outgoingSend(@Param('id') id: string) { return this.service.outgoingSend(id); }

  @Get('incoming/export/csv')
  @Roles('superadmin', 'admin_distrik')
  incomingExport() { return this.service.incomingExport(); }

  @Get('outgoing/export/csv')
  @Roles('superadmin', 'admin_distrik')
  outgoingExport() { return this.service.outgoingExport(); }
}
