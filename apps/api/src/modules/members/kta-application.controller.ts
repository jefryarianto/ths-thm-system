import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ScopeGuard } from '../../common/guards/scope.guard';
import { KtaApplicationService } from './kta-application.service';
import { KtaEscalationService } from './kta-escalation.service';
import { KtaAnalyticsService } from './kta-analytics.service';
import { CreateKtaDto } from './dto/create-kta.dto';
import { ApproveKtaDto } from './dto/approve-kta.dto';
import { RejectKtaDto } from './dto/reject-kta.dto';
import { SubmitBulkKtaDto } from './dto/submit-bulk-kta.dto';
import { KtaAppFilterDto } from './dto/kta-filter.dto';

@ApiTags('kta-applications')
@Controller('kta-applications')
@UseGuards(JwtAuthGuard)
export class KtaApplicationController {
  constructor(
    private readonly ktaApplicationService: KtaApplicationService,
    private readonly ktaEscalationService: KtaEscalationService,
    private readonly ktaAnalyticsService: KtaAnalyticsService,
  ) {}

  // ── MEMBER ──────────────────────────────────────────────
  @Post()
  @Roles('anggota')
  @ApiOperation({ summary: 'Submit KTA application' })
  @ApiResponse({ status: 201, description: 'KTA application submitted successfully' })
  async create(@CurrentUser() user: any, @Body() _dto: CreateKtaDto) {
    return this.ktaApplicationService.submitSelf(user.email, { id: user.id, role: user.role });
  }

  @Get('me')
  @Roles('anggota')
  @ApiOperation({ summary: "Get current user's KTA application" })
  async getMyApplication(@CurrentUser() user: any) {
    return this.ktaApplicationService.getMyApplication(user.email);
  }

  @Patch('me/cancel')
  @Roles('anggota')
  @ApiOperation({ summary: 'Cancel KTA application' })
  async cancel(@CurrentUser() user: any, @Body() body: { reason?: string }) {
    return this.ktaApplicationService.cancelMyApplication(user.email, body?.reason || '');
  }

  // ── STATIC ADMIN ROUTES (before :id to avoid shadowing) ──
  @Get('distrik-queue')
  @Roles('admin_distrik', 'admin_nasional', 'superadmin')
  @UseGuards(ScopeGuard)
  @ApiOperation({ summary: 'Antrian proses KTA untuk admin distrik' })
  async distrikQueue() {
    return this.ktaApplicationService.getDistrikQueue(undefined);
  }

  @Post('bulk')
  @Roles('admin_ranting', 'admin_wilayah', 'admin_distrik')
  @UseGuards(ScopeGuard)
  @ApiOperation({ summary: 'Bulk submit KTA applications' })
  async bulkSubmit(@Body() dto: SubmitBulkKtaDto, @CurrentUser() user: any) {
    return this.ktaApplicationService.submitBulk(
      dto.anggotaIds,
      { id: user.id, role: user.role },
      dto.batchName || '',
      undefined,
    );
  }

  @Get('batches')
  @Roles('admin_ranting', 'admin_wilayah', 'admin_distrik', 'admin_nasional', 'superadmin')
  @ApiOperation({ summary: 'List KTA batches' })
  async listBatches() {
    return this.ktaApplicationService.getBatches(undefined);
  }

  @Get('batches/:id')
  @Roles('admin_ranting', 'admin_wilayah', 'admin_distrik', 'admin_nasional', 'superadmin')
  @ApiOperation({ summary: 'Get KTA batch details' })
  async getBatch(@Param('id') id: string) {
    return this.ktaApplicationService.getBatchDetail(id, undefined);
  }

  @Get('batches/:id/export')
  @Roles('admin_ranting', 'admin_wilayah', 'admin_distrik', 'admin_nasional', 'superadmin')
  @ApiOperation({ summary: 'Export batch data' })
  async exportBatch(
    @Param('id') id: string,
    @Query('format') format: 'csv' | 'excel' | 'pdf' = 'csv',
  ) {
    return this.ktaApplicationService.exportBatch(id, format || 'csv');
  }

  @Get('escalation/sla')
  @Roles('admin_nasional', 'superadmin')
  @ApiOperation({ summary: 'Get KTA auto-escalation SLA status' })
  async getEscalationSla() {
    return this.ktaEscalationService.getSlaStatus(undefined);
  }

  @Post('escalate/:id')
  @Roles('admin_nasional', 'superadmin')
  @ApiOperation({ summary: 'Manual escalation of KTA application' })
  async manualEscalation(@Param('id') id: string, @CurrentUser() user: any) {
    return this.ktaEscalationService.manualEscalate(id, user.id);
  }

  @Get('analytics/funnel')
  @Roles('admin_nasional', 'superadmin')
  @ApiOperation({ summary: 'Get KTA funnel conversion data' })
  async getFunnel() {
    return this.ktaAnalyticsService.getFunnel();
  }

  @Get('analytics/processing-time')
  @Roles('admin_nasional', 'superadmin')
  @ApiOperation({ summary: 'Get average processing time per level' })
  async getProcessingTime() {
    return this.ktaAnalyticsService.getAvgProcessingTime();
  }

  @Get('analytics/trend')
  @Roles('admin_nasional', 'superadmin')
  @ApiOperation({ summary: 'Get monthly trend data' })
  async getTrend() {
    return this.ktaAnalyticsService.getTrend(6);
  }

  @Get('analytics/bottlenecks')
  @Roles('admin_nasional', 'superadmin')
  @ApiOperation({ summary: 'Get bottleneck & SLA breach data' })
  async getBottlenecks() {
    return this.ktaAnalyticsService.getBottlenecks();
  }

  // ── DYNAMIC ROUTES ──────────────────────────────────────
  @Get()
  @Roles('admin_ranting', 'admin_wilayah', 'admin_distrik', 'admin_nasional', 'superadmin')
  @UseGuards(ScopeGuard)
  @ApiOperation({ summary: 'List KTA applications with filters' })
  async findAll(@Query() filter: KtaAppFilterDto) {
    return this.ktaApplicationService.getApplications(filter, undefined);
  }

  @Get(':id')
  @Roles('admin_ranting', 'admin_wilayah', 'admin_distrik', 'admin_nasional', 'superadmin')
  @UseGuards(ScopeGuard)
  @ApiOperation({ summary: 'Get KTA application detail' })
  async findOne(@Param('id') id: string) {
    return this.ktaApplicationService.getApplicationDetail(id, undefined);
  }

  @Get(':id/history')
  @Roles('admin_ranting', 'admin_wilayah', 'admin_distrik', 'admin_nasional', 'superadmin')
  @ApiOperation({ summary: 'Get KTA application history' })
  async getHistory(@Param('id') id: string) {
    return this.ktaApplicationService.getHistory(id);
  }

  @Patch(':id/approve')
  @Roles('admin_ranting', 'admin_wilayah', 'admin_distrik', 'admin_nasional', 'superadmin')
  @ApiOperation({ summary: 'Approve KTA application (per level)' })
  async approve(@Param('id') id: string, @Body() dto: ApproveKtaDto, @CurrentUser() user: any) {
    return this.ktaApplicationService.approve(id, { id: user.id, role: user.role }, dto?.catatan);
  }

  @Patch(':id/reject')
  @Roles('admin_ranting', 'admin_wilayah', 'admin_distrik', 'admin_nasional', 'superadmin')
  @ApiOperation({ summary: 'Reject KTA application' })
  async reject(@Param('id') id: string, @Body() dto: RejectKtaDto, @CurrentUser() user: any) {
    return this.ktaApplicationService.reject(id, { id: user.id, role: user.role }, dto.reason);
  }

  @Post(':id/setup-fee')
  @Roles('admin_distrik', 'superadmin')
  @ApiOperation({ summary: 'Set biaya & rekening tujuan KTA' })
  async setupFee(
    @Param('id') id: string,
    @Body() body: { biaya: number; rekeningTujuan: string; catatan?: string },
    @CurrentUser() user: any,
  ) {
    return this.ktaApplicationService.setupFee(id, user.id, body);
  }

  @Post(':id/verify-payment')
  @Roles('admin_distrik', 'superadmin')
  @ApiOperation({ summary: 'Verifikasi pembayaran KTA' })
  async verifyPayment(
    @Param('id') id: string,
    @Body() body: { buktiPath?: string },
    @CurrentUser() user: any,
  ) {
    return this.ktaApplicationService.verifyPayment(id, user.id, body?.buktiPath);
  }

  @Post(':id/generate-card')
  @Roles('admin_distrik', 'superadmin')
  @ApiOperation({ summary: 'Generate KTA (manual oleh admin)' })
  async generateCard(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @CurrentUser() user: any,
  ) {
    return this.ktaApplicationService.generateCard(id, user.id, { reason: body?.reason });
  }

  @Post(':id/superadmin-bypass')
  @Roles('superadmin')
  @ApiOperation({ summary: 'SuperAdmin bypass semua level approval' })
  async superadminBypass(@Param('id') id: string, @CurrentUser() user: any) {
    return this.ktaApplicationService.superadminBypass(id, user.id);
  }
}
