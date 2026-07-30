import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TingkatanService } from './tingkatan.service';
import { CreateTingkatanDto, UpdateTingkatanDto, TingkatanDto } from './dto/tingkatan.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('tingkatan')
@Controller('tingkatan')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TingkatanController {
  constructor(private readonly tingkatanService: TingkatanService) {}

  @Post()
  @Roles('admin', 'superadmin')
  @ApiOperation({ summary: 'Create a new tingkatan' })
  @ApiResponse({ status: 201, description: 'Tingkatan berhasil dibuat.', type: TingkatanDto })
  create(@Body() createTingkatanDto: CreateTingkatanDto) {
    return this.tingkatanService.create(createTingkatanDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all tingkatan' })
  @ApiResponse({ status: 200, description: 'Return all tingkatan.', type: [TingkatanDto] })
  findAll(
    @Query('statusAktif') statusAktif?: string,
  ) {
    const filters: any = {};
    if (statusAktif !== undefined) {
      filters.statusAktif = statusAktif === 'true';
    }
    return this.tingkatanService.findAll(filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get tingkatan by ID' })
  @ApiResponse({ status: 200, description: 'Return tingkatan by ID.', type: TingkatanDto })
  @ApiResponse({ status: 404, description: 'Tingkatan not found.' })
  findOne(@Param('id') id: string) {
    return this.tingkatanService.findOne(id);
  }

  @Patch(':id')
  @Roles('admin', 'superadmin')
  @ApiOperation({ summary: 'Update tingkatan' })
  @ApiResponse({ status: 200, description: 'Tingkatan berhasil diupdate.', type: TingkatanDto })
  @ApiResponse({ status: 404, description: 'Tingkatan not found.' })
  update(
    @Param('id') id: string,
    @Body() updateTingkatanDto: UpdateTingkatanDto,
  ) {
    return this.tingkatanService.update(id, updateTingkatanDto);
  }

  @Delete(':id')
  @Roles('admin', 'superadmin')
  @ApiOperation({ summary: 'Delete tingkatan (soft delete)' })
  @ApiResponse({ status: 200, description: 'Tingkatan berhasil dihapus.' })
  @ApiResponse({ status: 404, description: 'Tingkatan not found.' })
  remove(@Param('id') id: string) {
    return this.tingkatanService.remove(id);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get all active tingkatan' })
  @ApiResponse({ status: 200, description: 'Return all active tingkatan.', type: [TingkatanDto] })
  findActive() {
    return this.tingkatanService.findActive();
  }
}
