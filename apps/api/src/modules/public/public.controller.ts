import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { PublicService } from './public.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Public')
@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  // ── Existing endpoints ─────────────────────────────────

  @Public()
  @Get('berita')
  async getBerita() {
    return this.publicService.getBerita();
  }

  @Public()
  @Get('galeri')
  async getGaleri() {
    return this.publicService.getGaleri();
  }

  @Public()
  @Get('donasi-program')
  async getDonasiProgram() {
    return this.publicService.getDonasiProgram();
  }

  @Public()
  @Get('sejarah')
  async getSejarah() {
    return this.publicService.getSejarah();
  }

  @Public()
  @Get('sambutan')
  async getSambutan() {
    return this.publicService.getSambutan();
  }

  @Public()
  @Get('beranda')
  async getBeranda() {
    return this.publicService.getBeranda();
  }

  @Public()
  @Get('organisasi')
  async getOrganisasi() {
    return this.publicService.getOrganisasi();
  }

  @Public()
  @Get('bank-info')
  async getBankInfo() {
    return this.publicService.getBankInfo();
  }

  @Public()
  @Get('kepengurusan')
  async getKepengurusan() {
    return this.publicService.getKepengurusan();
  }

  // ── Struktur Organisasi Public ─────────────────────────

  @Public()
  @Get('struktur/distrik')
  @ApiOperation({ summary: 'Daftar distrik (public)' })
  async getDistriks() {
    return { success: true, data: await this.publicService.getDistriks() };
  }

  @Public()
  @Get('struktur/wilayah')
  @ApiOperation({ summary: 'Daftar wilayah (public, filter by distrikId)' })
  @ApiQuery({ name: 'distrikId', required: false })
  async getWilayahs(@Query('distrikId') distrikId?: string) {
    return { success: true, data: await this.publicService.getWilayahs(distrikId) };
  }

  @Public()
  @Get('struktur/ranting')
  @ApiOperation({ summary: 'Daftar ranting (public, filter by wilayahId)' })
  @ApiQuery({ name: 'wilayahId', required: false })
  async getRantings(@Query('wilayahId') wilayahId?: string) {
    return { success: true, data: await this.publicService.getRantings(wilayahId) };
  }

  @Public()
  @Get('struktur/periode')
  @ApiOperation({ summary: 'Daftar periode per unit organisasi' })
  @ApiQuery({ name: 'level', enum: ['nasional', 'distrik', 'wilayah', 'ranting'] })
  @ApiQuery({ name: 'unitId', required: false })
  async getPeriodes(
    @Query('level') level: 'nasional' | 'distrik' | 'wilayah' | 'ranting',
    @Query('unitId') unitId?: string,
  ) {
    return { success: true, data: await this.publicService.getPeriodes(level, unitId) };
  }

  @Public()
  @Get('struktur/members')
  @ApiOperation({ summary: 'Pengurus per unit + periode (public)' })
  @ApiQuery({ name: 'level', enum: ['nasional', 'distrik', 'wilayah', 'ranting'] })
  @ApiQuery({ name: 'unitId', required: false })
  @ApiQuery({ name: 'periodeId', required: false })
  async getKepengurusanFiltered(
    @Query('level') level: 'nasional' | 'distrik' | 'wilayah' | 'ranting',
    @Query('unitId') unitId?: string,
    @Query('periodeId') periodeId?: string,
  ) {
    return {
      success: true,
      data: await this.publicService.getKepengurusanFiltered(level, unitId, periodeId),
    };
  }

  @Public()
  @Get('struktur/search')
  @ApiOperation({ summary: 'Search pengurus by nama/jabatan (public)' })
  @ApiQuery({ name: 'q', required: true })
  async searchKepengurusan(@Query('q') q: string) {
    return { success: true, data: await this.publicService.searchKepengurusan(q) };
  }

  @Public()
  @Get('struktur/children')
  @ApiOperation({ summary: 'Anak unit organisasi (public)' })
  @ApiQuery({ name: 'level', enum: ['nasional', 'distrik', 'wilayah', 'ranting'] })
  @ApiQuery({ name: 'unitId', required: true })
  async getUnitChildren(
    @Query('level') level: 'nasional' | 'distrik' | 'wilayah' | 'ranting',
    @Query('unitId') unitId: string,
  ) {
    return { success: true, data: await this.publicService.getUnitChildren(level, unitId) };
  }
}
