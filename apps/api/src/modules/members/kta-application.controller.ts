import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
  Res,
  ForbiddenException,
} from '@nestjs/common';
import type { Response } from 'express';
import { createReadStream } from 'fs';
import { FileInterceptor } from '@nestjs/platform-express/multer';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ScopeGuard } from '../../common/guards/scope.guard';
import { RequireScope } from '../../common/decorators/scope.decorator';
import { ScopedRequest } from '../../common/interfaces/user-scope.interface';
import { KtaApplicationService } from './kta-application.service';
import { KtaEscalationService } from './kta-escalation.service';
import { KtaAnalyticsService } from './kta-analytics.service';
import { CreateKtaDto } from './dto/create-kta.dto';
import { ApproveKtaDto } from './dto/approve-kta.dto';
import { RejectKtaDto } from './dto/reject-kta.dto';
import { VerifyPaymentKtaDto } from './dto/verify-payment-kta.dto';
import { SubmitBulkKtaDto } from './dto/submit-bulk-kta.dto';
import { KtaAppFilterDto } from './dto/kta-filter.dto';
import { buildKtaProofUploadOptions } from '../../common/utils/kta-proof-upload.util';

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
  async create(@CurrentUser() user: any, @Body() dto: CreateKtaDto) {
    return this.ktaApplicationService.submitSelf(
      user.email,
      { id: user.id, role: user.role },
      dto,
    );
  }

  // Body-less self-submit for the mobile app (POST /kta-applications/me).
  // The root `@Post()` validates a CreateKtaDto body, but the app submits
  // without a body, so it must have its own route (also keeps older builds working).
  @Post('me')
  @Roles('anggota')
  @ApiOperation({ summary: 'Submit KTA application (member self-service)' })
  @ApiResponse({ status: 201, description: 'KTA application submitted successfully' })
  async createMyApplication(@CurrentUser() user: any) {
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

  @Post('me/upload-proof')
  @Roles('anggota')
  @ApiOperation({ summary: 'Upload KTA payment proof (member self-service)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        bukti: {
          type: 'string',
          format: 'binary',
          description: 'Bukti pembayaran KTA (JPG, PNG, WebP, atau PDF, maksimal 5MB)',
        },
      },
      required: ['bukti'],
    },
  })
  @UseInterceptors(FileInterceptor('bukti', buildKtaProofUploadOptions()))
  async uploadProof(
    @CurrentUser() user: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.ktaApplicationService.uploadProof(user.email, file);
  }

  // ── ADMIN RESET (hard reset so member can re-submit) ──
  @Post('members/:memberId/reset')
  @Roles('superadmin', 'admin_nasional')
  @ApiOperation({ summary: 'Reset KTA: revoke card and delete all applications for a member' })
  @ApiResponse({ status: 201, description: 'KTA reset successfully' })
  async resetMemberKta(@Param('memberId') memberId: string, @CurrentUser() user: any) {
    return this.ktaApplicationService.resetMemberKta(memberId, { id: user.id, role: user.role });
  }

  // ── STATIC ADMIN ROUTES (before :id to avoid shadowing) ──
  @Get('distrik-queue')
  @Roles('admin_distrik', 'admin_nasional', 'superadmin')
  @UseGuards(ScopeGuard)
  @RequireScope('branch')
  @ApiOperation({ summary: 'Antrian proses KTA untuk admin distrik' })
  async distrikQueue(@Req() req: ScopedRequest) {
    return this.ktaApplicationService.getDistrikQueue(req.scope);
  }

  @Post('bulk')
  @Roles('admin_ranting')
  @UseGuards(ScopeGuard)
  @RequireScope('branch')
  @ApiOperation({ summary: 'Bulk submit KTA applications' })
  async bulkSubmit(
    @Body() dto: SubmitBulkKtaDto,
    @CurrentUser() user: any,
    @Req() req: ScopedRequest,
  ) {
    if (user?.role !== 'admin_ranting') {
      throw new ForbiddenException('Hanya admin_ranting yang dapat submit bulk KTA');
    }
    return this.ktaApplicationService.submitBulk(
      dto.anggotaIds,
      { id: user.id, role: user.role },
      dto.batchName || '',
      req.scope,
    );
  }

  @Get('batches')
  @Roles('admin_ranting', 'admin_wilayah', 'admin_distrik', 'admin_nasional', 'superadmin')
  @UseGuards(ScopeGuard)
  @RequireScope('branch')
  @ApiOperation({ summary: 'List KTA batches' })
  async listBatches(@Req() req: ScopedRequest) {
    return this.ktaApplicationService.getBatches(req.scope);
  }

  @Get('batches/:id')
  @Roles('admin_ranting', 'admin_wilayah', 'admin_distrik', 'admin_nasional', 'superadmin')
  @UseGuards(ScopeGuard)
  @RequireScope('branch')
  @ApiOperation({ summary: 'Get KTA batch details' })
  async getBatch(@Param('id') id: string, @Req() req: ScopedRequest) {
    return this.ktaApplicationService.getBatchDetail(id, req.scope);
  }

  @Get('batches/:id/export')
  @Roles('admin_ranting', 'admin_wilayah', 'admin_distrik', 'admin_nasional', 'superadmin')
  @UseGuards(ScopeGuard)
  @RequireScope('branch')
  @ApiOperation({ summary: 'Export batch data' })
  @ApiQuery({ name: 'format', required: false, enum: ['csv', 'excel', 'pdf'] })
  async exportBatch(
    @Param('id') id: string,
    @Query('format') format: 'csv' | 'excel' | 'pdf' = 'csv',
    @Req() req: ScopedRequest,
  ) {
    return this.ktaApplicationService.exportBatch(id, format || 'csv', req.scope);
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

  @Get(':id/proof')
  @Roles('admin_ranting', 'admin_wilayah', 'admin_distrik', 'admin_nasional', 'superadmin')
  @UseGuards(ScopeGuard)
  @RequireScope('branch')
  @ApiOperation({ summary: 'Stream KTA payment proof' })
  async getProof(
    @Param('id') id: string,
    @Req() req: ScopedRequest,
    @Res() res: Response,
  ): Promise<void> {
    const proof = await this.ktaApplicationService.getProof(id, req.scope);
    res.setHeader('Content-Type', proof.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${proof.fileName}"`);
    res.setHeader('Cache-Control', 'private, no-store');
    const stream = createReadStream(proof.absolutePath);
    stream.on('error', () => {
      if (res.headersSent) {
        res.destroy();
        return;
      }
      res.status(404).json({ message: 'Bukti pembayaran tidak ditemukan' });
    });
    stream.pipe(res);
  }

  // ── DYNAMIC ROUTES ──────────────────────────────────────
  @Get()
  @Roles('admin_ranting', 'admin_wilayah', 'admin_distrik', 'admin_nasional', 'superadmin')
  @UseGuards(ScopeGuard)
  @RequireScope('branch')
  @ApiOperation({ summary: 'List KTA applications with filters' })
  async findAll(@Query() filter: KtaAppFilterDto, @Req() req: ScopedRequest) {
    return this.ktaApplicationService.getApplications(filter, req.scope);
  }

  @Get(':id')
  @Roles('admin_ranting', 'admin_wilayah', 'admin_distrik', 'admin_nasional', 'superadmin')
  @UseGuards(ScopeGuard)
  @RequireScope('branch')
  @ApiOperation({ summary: 'Get KTA application detail' })
  async findOne(@Param('id') id: string, @Req() req: ScopedRequest) {
    return this.ktaApplicationService.getApplicationDetail(id, req.scope);
  }

  @Get(':id/history')
  @Roles('admin_ranting', 'admin_wilayah', 'admin_distrik', 'admin_nasional', 'superadmin')
  @UseGuards(ScopeGuard)
  @RequireScope('branch')
  @ApiOperation({ summary: 'Get KTA application history' })
  async getHistory(@Param('id') id: string, @Req() req: ScopedRequest) {
    return this.ktaApplicationService.getHistory(id, req.scope);
  }

  @Patch(':id/approve')
  @Roles('admin_ranting', 'admin_wilayah', 'admin_distrik', 'admin_nasional', 'superadmin')
  @UseGuards(ScopeGuard)
  @RequireScope('branch')
  @ApiOperation({ summary: 'Approve KTA application (per level)' })
  async approve(
    @Param('id') id: string,
    @Body() dto: ApproveKtaDto,
    @CurrentUser() user: any,
    @Req() req: ScopedRequest,
  ) {
    return this.ktaApplicationService.approve(
      id,
      { id: user.id, role: user.role },
      dto?.catatan,
      req.scope,
    );
  }

  @Patch(':id/reject')
  @Roles('admin_ranting', 'admin_wilayah', 'admin_distrik', 'admin_nasional', 'superadmin')
  @UseGuards(ScopeGuard)
  @RequireScope('branch')
  @ApiOperation({ summary: 'Reject KTA application' })
  async reject(
    @Param('id') id: string,
    @Body() dto: RejectKtaDto,
    @CurrentUser() user: any,
    @Req() req: ScopedRequest,
  ) {
    return this.ktaApplicationService.reject(
      id,
      { id: user.id, role: user.role },
      dto.reason,
      req.scope,
    );
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
    @Body() dto: VerifyPaymentKtaDto,
    @CurrentUser() user: any,
  ) {
    return this.ktaApplicationService.verifyPayment(id, user.id, dto, user.role);
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
