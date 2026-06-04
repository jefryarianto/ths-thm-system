import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { RegistrationsService } from './registrations.service';
import { CreateRegistrationDto, UpdateRegistrationDto, RegistrationFilterDto, RejectRegistrationDto } from './dto/registration.dto';

@ApiTags('Registrations')
@Controller('registrations')
@ApiBearerAuth()
export class RegistrationsController {
  constructor(private readonly service: RegistrationsService) {}
  @Get() findAll(@Query() q: RegistrationFilterDto) { return this.service.findAll(q); }
  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(id); }
  @Post() create(@Body() dto: CreateRegistrationDto) { return this.service.create(dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateRegistrationDto) { return this.service.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.service.remove(id); }
  @Post(':id/verify') verify(@Param('id') id: string) { return this.service.verify(id); }
  @Post(':id/approve') approve(@Param('id') id: string) { return this.service.approve(id); }
  @Post(':id/reject') reject(@Param('id') id: string, @Body() b: RejectRegistrationDto) { return this.service.reject(id, b?.reason); }
  @Post('import') importCsv(@Body() importDto: { data: Record<string, unknown>[] }) { return this.service.importCsv(importDto.data); }
}
