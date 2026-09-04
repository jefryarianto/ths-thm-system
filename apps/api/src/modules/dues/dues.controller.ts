import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { DuesService } from './dues.service';
import { CrudAuth } from '../../common/decorators/crud-auth.decorator';
import {
  CreateDueDto,
  UpdateDueDto,
  DueFilterDto,
  BatchPaymentDto,
  PaymentConfirmationDto,
} from './dto/dues.dto';
import { ScopedRequest } from '../../common/interfaces/user-scope.interface';

@ApiTags('Dues')
@Controller('dues')
@ApiBearerAuth()
export class DuesController {
  constructor(private readonly service: DuesService) {}

  @Get()
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'anggota', { summary: 'Daftar semua iuran' })
  findAll(@Query() query: DueFilterDto, @Req() req: ScopedRequest) {
    return this.service.findAll(query, req.scope);
  }

  @Post()
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Buat iuran baru' })
  create(@Body() dto: CreateDueDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Update iuran' })
  update(@Param('id') id: string, @Body() dto: UpdateDueDto, @Req() req: ScopedRequest) {
    return this.service.update(id, dto, req.scope, req.user?.id);
  }

  @Delete(':id')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Hapus iuran' })
  remove(@Param('id') id: string, @Req() req: ScopedRequest) {
    return this.service.remove(id, req.scope);
  }

  @Get('members/me')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'anggota', { scope: 'self', summary: 'Daftar iuran saya (anggota login)' })
  getMyDues(@Req() req: ScopedRequest) {
    return this.service.getMyDues(req.user);
  }

  @Get('members/:memberId')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'anggota', { summary: 'Daftar iuran per anggota' })
  getMemberDues(@Param('memberId') memberId: string) {
    return this.service.getMemberDues(memberId);
  }

  @Get('arrears')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { scope: 'district', summary: 'Daftar iuran menunggak' })
  getArrears() {
    return this.service.getArrears();
  }

  @Get('report')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { scope: 'district', summary: 'Laporan iuran' })
  getReport() {
    return this.service.getReport();
  }

  @Get('report/export')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Export laporan iuran' })
  exportReport() {
    return this.service.exportReport();
  }

  @Post('import')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Import iuran dari CSV' })
  importDues(@Body() importDto: { data: Record<string, unknown>[] }) {
    return this.service.importDues(importDto.data);
  }

  @Patch('batch')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Batch payment untuk banyak anggota' })
  batchPayment(@Body() dto: BatchPaymentDto) {
    return this.service.batchPayment(dto);
  }

  @Get('dashboard/stats')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Statistik dashboard iuran' })
  getDashboardStats() {
    return this.service.getDashboardStats();
  }

  @Get(':id')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'anggota', { scope: 'self', summary: 'Detail iuran' })
  findOne(@Param('id') id: string, @Req() req: ScopedRequest) {
    return this.service.findOne(id, req.scope, req.user);
  }

  @Post(':id/payments')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'anggota', { summary: 'Konfirmasi pembayaran manual' })
  submitPaymentConfirmation(@Param('id') id: string, @Body() dto: PaymentConfirmationDto) {
    return this.service.submitPaymentConfirmation(id, dto);
  }
}
