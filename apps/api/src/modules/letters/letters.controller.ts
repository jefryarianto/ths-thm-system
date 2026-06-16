import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { LettersService } from './letters.service';
import { Roles } from '../../common/decorators/roles.decorator';
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
  @ApiOperation({ summary: 'Ambil semua surat (gabungan)' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  findAllCombined(@Query() query: LetterFilterDto) {
    return this.service.findAllCombined(query);
  }

  @Get('incoming')
  @ApiOperation({ summary: 'Ambil semua surat masuk' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  incomingFindAll(@Query() query: LetterFilterDto) {
    return this.service.incomingFindAll(query);
  }

  @Get('incoming/:id')
  @ApiOperation({ summary: 'Ambil detail surat masuk' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  incomingFindOne(@Param('id') id: string) {
    return this.service.incomingFindOne(id);
  }

  @Post('incoming')
  @ApiOperation({ summary: 'Tambah surat masuk' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  incomingCreate(@Body() dto: CreateIncomingLetterDto) {
    return this.service.incomingCreate(dto);
  }

  @Patch('incoming/:id')
  @ApiOperation({ summary: 'Perbarui surat masuk' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  incomingUpdate(@Param('id') id: string, @Body() dto: UpdateIncomingLetterDto) {
    return this.service.incomingUpdate(id, dto);
  }

  @Delete('incoming/:id')
  @ApiOperation({ summary: 'Hapus surat masuk' })
  @Roles('superadmin', 'admin_distrik')
  incomingRemove(@Param('id') id: string) {
    return this.service.incomingRemove(id);
  }

  @Post('incoming/:id/disposition')
  @ApiOperation({ summary: 'Tambah disposisi surat' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah')
  createDisposition(@Param('id') id: string, @Body() dto: CreateDispositionDto) {
    return this.service.createDisposition(id, dto);
  }

  @Get('outgoing')
  @ApiOperation({ summary: 'Ambil semua surat keluar' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  outgoingFindAll(@Query() query: LetterFilterDto) {
    return this.service.outgoingFindAll(query);
  }

  @Get('outgoing/:id')
  @ApiOperation({ summary: 'Ambil detail surat keluar' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  outgoingFindOne(@Param('id') id: string) {
    return this.service.outgoingFindOne(id);
  }

  @Post('outgoing')
  @ApiOperation({ summary: 'Tambah surat keluar' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  outgoingCreate(@Body() dto: CreateOutgoingLetterDto) {
    return this.service.outgoingCreate(dto);
  }

  @Patch('outgoing/:id')
  @ApiOperation({ summary: 'Perbarui surat keluar' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  outgoingUpdate(@Param('id') id: string, @Body() dto: UpdateOutgoingLetterDto) {
    return this.service.outgoingUpdate(id, dto);
  }

  @Delete('outgoing/:id')
  @ApiOperation({ summary: 'Hapus surat keluar' })
  @Roles('superadmin', 'admin_distrik')
  outgoingRemove(@Param('id') id: string) {
    return this.service.outgoingRemove(id);
  }

  @Post('outgoing/:id/send')
  @ApiOperation({ summary: 'Kirim surat keluar' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  outgoingSend(@Param('id') id: string) {
    return this.service.outgoingSend(id);
  }

  @Get('incoming/export/csv')
  @ApiOperation({ summary: 'Ekspor surat masuk' })
  @Roles('superadmin', 'admin_distrik')
  incomingExport() {
    return this.service.incomingExport();
  }

  @Get('outgoing/export/csv')
  @ApiOperation({ summary: 'Ekspor surat keluar' })
  @Roles('superadmin', 'admin_distrik')
  outgoingExport() {
    return this.service.outgoingExport();
  }
}
