import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { OrgStructureService } from './org-structure.service';
import {
  CreateDistrikDto,
  UpdateDistrikDto,
  CreateWilayahDto,
  UpdateWilayahDto,
  CreateRantingDto,
  UpdateRantingDto,
} from './dto/org-structure.dto';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Organization Structure')
@Controller('org-structure')
@ApiBearerAuth()
@Roles('superadmin')
export class OrgStructureController {
  constructor(private readonly service: OrgStructureService) {}

  // ─── DISTRIK ───

  @Get('distrik')
  @ApiOperation({ summary: 'Daftar semua distrik' })
  getAllDistrik() {
    return this.service.getAllDistrik();
  }

  @Get('distrik/:id')
  @ApiOperation({ summary: 'Detail distrik' })
  getDistrik(@Param('id') id: string) {
    return this.service.getDistrik(id);
  }

  @Post('distrik')
  @ApiOperation({ summary: 'Tambah distrik baru' })
  createDistrik(@Body() dto: CreateDistrikDto) {
    return this.service.createDistrik(dto);
  }

  @Patch('distrik/:id')
  @ApiOperation({ summary: 'Update distrik' })
  updateDistrik(@Param('id') id: string, @Body() dto: UpdateDistrikDto) {
    return this.service.updateDistrik(id, dto);
  }

  @Delete('distrik/:id')
  @ApiOperation({ summary: 'Hapus distrik' })
  deleteDistrik(@Param('id') id: string) {
    return this.service.deleteDistrik(id);
  }

  // ─── WILAYAH ───

  @Get('wilayah')
  @ApiOperation({ summary: 'Daftar wilayah (opsional filter by distrikId)' })
  @ApiQuery({ name: 'distrikId', required: false })
  getAllWilayah(@Query('distrikId') distrikId?: string) {
    return this.service.getAllWilayah(distrikId);
  }

  @Get('wilayah/:id')
  @ApiOperation({ summary: 'Detail wilayah' })
  getWilayah(@Param('id') id: string) {
    return this.service.getWilayah(id);
  }

  @Post('wilayah')
  @ApiOperation({ summary: 'Tambah wilayah baru' })
  createWilayah(@Body() dto: CreateWilayahDto) {
    return this.service.createWilayah(dto);
  }

  @Patch('wilayah/:id')
  @ApiOperation({ summary: 'Update wilayah' })
  updateWilayah(@Param('id') id: string, @Body() dto: UpdateWilayahDto) {
    return this.service.updateWilayah(id, dto);
  }

  @Delete('wilayah/:id')
  @ApiOperation({ summary: 'Hapus wilayah' })
  deleteWilayah(@Param('id') id: string) {
    return this.service.deleteWilayah(id);
  }

  // ─── RANTING ───

  @Get('ranting')
  @ApiOperation({ summary: 'Daftar ranting (opsional filter by wilayahId)' })
  @ApiQuery({ name: 'wilayahId', required: false })
  getAllRanting(@Query('wilayahId') wilayahId?: string) {
    return this.service.getAllRanting(wilayahId);
  }

  @Get('ranting/:id')
  @ApiOperation({ summary: 'Detail ranting' })
  getRanting(@Param('id') id: string) {
    return this.service.getRanting(id);
  }

  @Post('ranting')
  @ApiOperation({ summary: 'Tambah ranting baru' })
  createRanting(@Body() dto: CreateRantingDto) {
    return this.service.createRanting(dto);
  }

  @Patch('ranting/:id')
  @ApiOperation({ summary: 'Update ranting' })
  updateRanting(@Param('id') id: string, @Body() dto: UpdateRantingDto) {
    return this.service.updateRanting(id, dto);
  }

  @Delete('ranting/:id')
  @ApiOperation({ summary: 'Hapus ranting' })
  deleteRanting(@Param('id') id: string) {
    return this.service.deleteRanting(id);
  }

  // ─── TREE ───

  @Get('tree')
  @ApiOperation({ summary: 'Pohon organisasi (distrik → wilayah → ranting)' })
  getOrgTree() {
    return this.service.getOrgTree();
  }
}
