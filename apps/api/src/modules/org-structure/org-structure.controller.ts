import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { OrgStructureService } from './org-structure.service';
import {
  CreateDistrikDto,
  UpdateDistrikDto,
  CreateWilayahDto,
  UpdateWilayahDto,
  CreateRantingDto,
  UpdateRantingDto,
} from './dto/org-structure.dto';
import { CrudAuth } from '../../common/decorators/crud-auth.decorator';

@ApiTags('Organization Structure')
@Controller('org-structure')
@ApiBearerAuth()
export class OrgStructureController {
  constructor(private readonly service: OrgStructureService) {}

  @Get('distrik')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', 'penguji', { summary: 'Daftar semua distrik' })
  getAllDistrik() {
    return this.service.getAllDistrik();
  }

  @Get('distrik/:id')
  @CrudAuth('superadmin', { summary: 'Detail distrik' })
  getDistrik(@Param('id') id: string) {
    return this.service.getDistrik(id);
  }

  @Post('distrik')
  @CrudAuth('superadmin', { summary: 'Tambah distrik baru' })
  createDistrik(@Body() dto: CreateDistrikDto) {
    return this.service.createDistrik(dto);
  }

  @Patch('distrik/:id')
  @CrudAuth('superadmin', { summary: 'Update distrik' })
  updateDistrik(@Param('id') id: string, @Body() dto: UpdateDistrikDto) {
    return this.service.updateDistrik(id, dto);
  }

  @Delete('distrik/:id')
  @CrudAuth('superadmin', { summary: 'Hapus distrik' })
  deleteDistrik(@Param('id') id: string) {
    return this.service.deleteDistrik(id);
  }

  @Get('wilayah')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', 'penguji', { summary: 'Daftar wilayah (opsional filter by distrikId)' })
  getAllWilayah(@Query('distrikId') distrikId?: string) {
    return this.service.getAllWilayah(distrikId);
  }

  @Get('wilayah/:id')
  @CrudAuth('superadmin', { scope: 'national', summary: 'Detail wilayah' })
  getWilayah(@Param('id') id: string) {
    return this.service.getWilayah(id);
  }

  @Post('wilayah')
  @CrudAuth('superadmin', { scope: 'national', summary: 'Tambah wilayah baru' })
  createWilayah(@Body() dto: CreateWilayahDto) {
    return this.service.createWilayah(dto);
  }

  @Patch('wilayah/:id')
  @CrudAuth('superadmin', { scope: 'national', summary: 'Update wilayah' })
  updateWilayah(@Param('id') id: string, @Body() dto: UpdateWilayahDto) {
    return this.service.updateWilayah(id, dto);
  }

  @Delete('wilayah/:id')
  @CrudAuth('superadmin', { scope: 'national', summary: 'Hapus wilayah' })
  deleteWilayah(@Param('id') id: string) {
    return this.service.deleteWilayah(id);
  }

  @Get('ranting')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', 'penguji', { summary: 'Daftar ranting (opsional filter by wilayahId)' })
  getAllRanting(@Query('wilayahId') wilayahId?: string) {
    return this.service.getAllRanting(wilayahId);
  }

  @Get('ranting/:id')
  @CrudAuth('superadmin', { scope: 'national', summary: 'Detail ranting' })
  getRanting(@Param('id') id: string) {
    return this.service.getRanting(id);
  }

  @Post('ranting')
  @CrudAuth('superadmin', { scope: 'national', summary: 'Tambah ranting baru' })
  createRanting(@Body() dto: CreateRantingDto) {
    return this.service.createRanting(dto);
  }

  @Patch('ranting/:id')
  @CrudAuth('superadmin', { scope: 'national', summary: 'Update ranting' })
  updateRanting(@Param('id') id: string, @Body() dto: UpdateRantingDto) {
    return this.service.updateRanting(id, dto);
  }

  @Delete('ranting/:id')
  @CrudAuth('superadmin', { scope: 'national', summary: 'Hapus ranting' })
  deleteRanting(@Param('id') id: string) {
    return this.service.deleteRanting(id);
  }

  @Get('tree')
  @CrudAuth('superadmin', { summary: 'Pohon organisasi (distrik → wilayah → ranting)' })
  getOrgTree() {
    return this.service.getOrgTree();
  }
}
