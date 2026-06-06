import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequireScope } from '../../common/decorators/scope.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { RegistrationsService } from './registrations.service';
import { CreateRegistrationDto, UpdateRegistrationDto, RegistrationFilterDto, RejectRegistrationDto } from './dto/registration.dto';

@ApiTags('Registrations')
@Controller('registrations')
export class RegistrationsController {
  constructor(private readonly service: RegistrationsService) {}

  @Get()
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  @ApiBearerAuth()
  findAll(@Query() q: RegistrationFilterDto) { return this.service.findAll(q); }

  @Get(':id')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  @ApiBearerAuth()
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  @Public()
  @ApiOperation({ summary: 'Public registration — no auth required' })
  create(@Body() dto: CreateRegistrationDto) { return this.service.create(dto); }

  @Patch(':id')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  @ApiBearerAuth()
  update(@Param('id') id: string, @Body() dto: UpdateRegistrationDto) { return this.service.update(id, dto); }

  @Delete(':id')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  @ApiBearerAuth()
  remove(@Param('id') id: string) { return this.service.remove(id); }

  @Post(':id/verify')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  @ApiBearerAuth()
  verify(@Param('id') id: string) { return this.service.verify(id); }

  @Post(':id/approve')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  @ApiBearerAuth()
  approve(@Param('id') id: string) { return this.service.approve(id); }

  @Post(':id/reject')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  @ApiBearerAuth()
  reject(@Param('id') id: string, @Body() b: RejectRegistrationDto) { return this.service.reject(id, b?.reason); }

  @Post('import')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  @ApiBearerAuth()
  importCsv(@Body() importDto: { data: Record<string, unknown>[] }) { return this.service.importCsv(importDto.data); }
}
