import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DuesService } from './dues.service';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  CreateDueDto,
  UpdateDueDto,
  DueFilterDto,
  BatchPaymentDto,
  PaymentConfirmationDto,
} from './dto/dues.dto';
import { RequireScope } from '../../common/decorators/scope.decorator';
import { ScopedRequest } from '../../common/interfaces/user-scope.interface';

@ApiTags('Dues')
@Controller('dues')
@ApiBearerAuth()
export class DuesController {
  constructor(private readonly service: DuesService) {}

  @Get()
  @ApiOperation({ summary: 'Daftar semua iuran' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  findAll(@Query() query: DueFilterDto, @Req() req: ScopedRequest) {
    return this.service.findAll(query, req.scope);
  }

  @Post()
  @ApiOperation({ summary: 'Buat iuran baru' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  create(@Body() dto: CreateDueDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update iuran' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  update(@Param('id') id: string, @Body() dto: UpdateDueDto, @Req() req: ScopedRequest) {
    return this.service.update(id, dto, req.scope);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Hapus iuran' })
  @Roles('superadmin', 'admin_distrik')
  @RequireScope('branch')
  remove(@Param('id') id: string, @Req() req: ScopedRequest) {
    return this.service.remove(id, req.scope);
  }

  @Get('members/me')
  @ApiOperation({ summary: 'Daftar iuran saya (anggota login)' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'anggota')
  getMyDues(@Req() req: ScopedRequest) {
    return this.service.getMyDues(req.user);
  }

  @Get('members/:memberId')
  @ApiOperation({ summary: 'Daftar iuran per anggota' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'anggota')
  getMemberDues(@Param('memberId') memberId: string) {
    return this.service.getMemberDues(memberId);
  }

  @Get('arrears')
  @ApiOperation({ summary: 'Daftar iuran menunggak' })
  @Roles('superadmin', 'admin_distrik')
  @RequireScope('district')
  getArrears() {
    return this.service.getArrears({});
  }

  @Get('report')
  @ApiOperation({ summary: 'Laporan iuran' })
  @Roles('superadmin', 'admin_distrik')
  @RequireScope('district')
  getReport() {
    return this.service.getReport({});
  }

  @Get('report/export')
  @ApiOperation({ summary: 'Export laporan iuran' })
  @Roles('superadmin', 'admin_distrik')
  exportReport() {
    return this.service.exportReport({});
  }

  @Post('import')
  @ApiOperation({ summary: 'Import iuran dari CSV' })
  @Roles('superadmin', 'admin_distrik')
  importDues(@Body() importDto: { data: Record<string, unknown>[] }) {
    return this.service.importDues(importDto.data);
  }

  @Patch('batch')
  @ApiOperation({ summary: 'Batch payment untuk banyak anggota' })
  @Roles('superadmin', 'admin_distrik')
  batchPayment(@Body() dto: BatchPaymentDto) {
    return this.service.batchPayment(dto);
  }

  @Get('dashboard/stats')
  @ApiOperation({ summary: 'Statistik dashboard iuran' })
  @Roles('superadmin', 'admin_distrik')
  getDashboardStats() {
    return this.service.getDashboardStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail iuran' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'anggota')
  @RequireScope('branch')
  findOne(@Param('id') id: string, @Req() req: ScopedRequest) {
    return this.service.findOne(id, req.scope);
  }

  @Post(':id/payments')
  @ApiOperation({ summary: 'Konfirmasi pembayaran manual' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'anggota')
  submitPaymentConfirmation(@Param('id') id: string, @Body() dto: PaymentConfirmationDto) {
    return this.service.submitPaymentConfirmation(id, dto);
  }
}
