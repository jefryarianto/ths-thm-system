import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CrudAuth } from '../../common/decorators/crud-auth.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { RegistrationsService } from './registrations.service';
import {
  CreateRegistrationDto,
  UpdateRegistrationDto,
  RegistrationFilterDto,
  RejectRegistrationDto,
} from './dto/registration.dto';

@ApiTags('Registrations')
@Controller('registrations')
export class RegistrationsController {
  constructor(private readonly service: RegistrationsService) {}

  @Get()
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Daftar semua registrasi' })
  @ApiBearerAuth()
  findAll(@Query() q: RegistrationFilterDto) {
    return this.service.findAll(q);
  }

  @Get(':id')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Detail registrasi' })
  @ApiBearerAuth()
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Public()
  create(@Body() dto: CreateRegistrationDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Perbarui registrasi' })
  @ApiBearerAuth()
  update(@Param('id') id: string, @Body() dto: UpdateRegistrationDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Hapus registrasi' })
  @ApiBearerAuth()
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Post(':id/verify')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Verifikasi registrasi' })
  @ApiBearerAuth()
  verify(@Param('id') id: string) {
    return this.service.verify(id);
  }

  @Post(':id/approve')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Setujui registrasi' })
  @ApiBearerAuth()
  approve(@Param('id') id: string) {
    return this.service.approve(id);
  }

  @Post(':id/reject')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Tolak registrasi' })
  @ApiBearerAuth()
  reject(@Param('id') id: string, @Body() b: RejectRegistrationDto) {
    return this.service.reject(id, b?.reason);
  }

  @Post('import')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Impor data registrasi' })
  @ApiBearerAuth()
  importCsv(@Body() importDto: { data: Record<string, unknown>[] }) {
    return this.service.importCsv(importDto.data);
  }
}
