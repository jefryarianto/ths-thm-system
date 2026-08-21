import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { LettersService } from './letters.service';
import { CrudAuth } from '../../common/decorators/crud-auth.decorator';
import {
  LetterFilterDto,
  CreateIncomingLetterDto,
  UpdateIncomingLetterDto,
  CreateOutgoingLetterDto,
  UpdateOutgoingLetterDto,
  CreateDispositionDto,
} from './dto/letter.dto';

@ApiTags('Letters')
@Controller('letters')
@ApiBearerAuth()
export class LettersController {
  constructor(private readonly service: LettersService) {}

  @Get()
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Ambil semua surat (gabungan)' })
  findAllCombined(@Query() query: LetterFilterDto) {
    return this.service.findAllCombined(query);
  }

  @Get('incoming')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Ambil semua surat masuk' })
  incomingFindAll(@Query() query: LetterFilterDto) {
    return this.service.incomingFindAll(query);
  }

  @Get('incoming/:id')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Ambil detail surat masuk' })
  incomingFindOne(@Param('id') id: string) {
    return this.service.incomingFindOne(id);
  }

  @Post('incoming')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Tambah surat masuk' })
  incomingCreate(@Body() dto: CreateIncomingLetterDto) {
    return this.service.incomingCreate(dto);
  }

  @Patch('incoming/:id')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Perbarui surat masuk' })
  incomingUpdate(@Param('id') id: string, @Body() dto: UpdateIncomingLetterDto) {
    return this.service.incomingUpdate(id, dto);
  }

  @Delete('incoming/:id')
  @CrudAuth('superadmin', 'admin_distrik', { summary: 'Hapus surat masuk' })
  incomingRemove(@Param('id') id: string) {
    return this.service.incomingRemove(id);
  }

  @Post('incoming/:id/disposition')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', { summary: 'Tambah disposisi surat' })
  createDisposition(@Param('id') id: string, @Body() dto: CreateDispositionDto) {
    return this.service.createDisposition(id, dto);
  }

  @Get('outgoing')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Ambil semua surat keluar' })
  outgoingFindAll(@Query() query: LetterFilterDto) {
    return this.service.outgoingFindAll(query);
  }

  @Get('outgoing/:id')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Ambil detail surat keluar' })
  outgoingFindOne(@Param('id') id: string) {
    return this.service.outgoingFindOne(id);
  }

  @Post('outgoing')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Tambah surat keluar' })
  outgoingCreate(@Body() dto: CreateOutgoingLetterDto) {
    return this.service.outgoingCreate(dto);
  }

  @Patch('outgoing/:id')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Perbarui surat keluar' })
  outgoingUpdate(@Param('id') id: string, @Body() dto: UpdateOutgoingLetterDto) {
    return this.service.outgoingUpdate(id, dto);
  }

  @Delete('outgoing/:id')
  @CrudAuth('superadmin', 'admin_distrik', { summary: 'Hapus surat keluar' })
  outgoingRemove(@Param('id') id: string) {
    return this.service.outgoingRemove(id);
  }

  @Post('outgoing/:id/send')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Kirim surat keluar' })
  outgoingSend(@Param('id') id: string) {
    return this.service.outgoingSend(id);
  }

  @Get('incoming/export/csv')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_ranting', { summary: 'Ekspor surat masuk' })
  incomingExport() {
    return this.service.incomingExport();
  }

  @Get('outgoing/export/csv')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_ranting', { summary: 'Ekspor surat keluar' })
  outgoingExport() {
    return this.service.outgoingExport();
  }
}
