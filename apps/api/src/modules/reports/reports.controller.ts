import { Controller, Get, Param, Query, Req, Res, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { ScopedRequest } from '../../common/interfaces/user-scope.interface';
import { ReportsService } from './reports.service';
import { ExportService } from './export.service';
import { Response, Request } from 'express';
import { Roles } from '../../common/decorators/roles.decorator';
import { PersistentAuditService } from '../../common/services/persistent-audit.service';

const VALID_EXPORT_TYPES = new Set([
  'members',
  'dues',
  'trainings',
  'candidates',
  'graduations',
  'assessments',
  'audit_logs',
]);

@ApiTags('Reports')
@Controller('reports')
@ApiBearerAuth()
export class ReportsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reportsService: ReportsService,
    private readonly exportService: ExportService,
    private readonly audit: PersistentAuditService,
  ) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Ambil data dashboard' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan')
  async getDashboardData(@Req() req: ScopedRequest) {
    return this.reportsService.dashboardStats(req.scope);
  }

  @Get('scan-stats')
  @ApiOperation({ summary: 'Ambil statistik pemindaian' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  async getScanStats(@Req() req: ScopedRequest) {
    return this.reportsService.scanStats(req.scope);
  }

  @Get('chart/members-over-time')
  @ApiOperation({ summary: 'Grafik pertumbuhan anggota' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  async getMembersOverTime() {
    const data = await this.prisma.anggota.groupBy({
      by: ['createdAt'],
      _count: true,
      where: { deletedAt: null },
    });

    const grouped = data.reduce(
      (acc, item) => {
        const month = new Date(item.createdAt).toISOString().slice(0, 7);
        acc[month] = (acc[month] || 0) + item._count;
        return acc;
      },
      {} as Record<string, number>,
    );

    return Object.entries(grouped)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  @Get('chart/training-attendance')
  @ApiOperation({ summary: 'Grafik kehadiran pelatihan' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan')
  async getTrainingAttendance(@Query('year') year: string) {
    const start = new Date(`${year}-01-01`);
    const end = new Date(`${year}-12-31`);

    const data = await this.prisma.absensiLatihan.findMany({
      where: {
        latihan: {
          hariTanggal: { gte: start, lte: end },
        },
      },
      include: { latihan: true },
    });

    const monthly = data.reduce(
      (acc, item) => {
        const month = new Date(item.latihan.hariTanggal).toISOString().slice(0, 7);
        acc[month] = (acc[month] || 0) + (item.hadir ? 1 : 0);
        return acc;
      },
      {} as Record<string, number>,
    );

    return Object.entries(monthly)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  @Get('export/:type')
  @ApiOperation({ summary: 'Ekspor data ke XLSX/CSV (teraudit)' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  async exportData(
    @Param('type') type: string,
    @Query('format') format: string,
    @Req() req: ScopedRequest,
    @Res() res: Response,
  ) {
    const fmt = (format || 'xlsx').toLowerCase();
    if (fmt !== 'xlsx' && fmt !== 'csv') {
      throw new BadRequestException('Format harus xlsx atau csv');
    }
    if (!VALID_EXPORT_TYPES.has(type)) {
      throw new BadRequestException(`Tipe ekspor tidak dikenal: ${type}`);
    }

    const { content, rowCount } = await this.exportService.exportData(type, fmt, req.scope);
    const date = new Date().toISOString().slice(0, 10);
    const filename = `${type}-export-${date}.${fmt}`;

    if (fmt === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    } else {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    }
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(content);

    // Catat audit unduhan (best-effort).
    await this.audit.log({
      action: 'EXPORT_DOWNLOADED',
      entity: type,
      entityId: null,
      userId: req.user?.id ?? null,
      ipAddress: req.ip,
      userAgent: (req as unknown as Request).get('user-agent'),
      details: { format: fmt, rowCount, fileName: filename },
    });
  }

  @Get('export/audit-log')
  @ApiOperation({ summary: 'Ekspor log email (CSV)' })
  @Roles('superadmin')
  async exportAuditLog(@Query('from') from: string, @Query('to') to: string, @Res() res: Response) {
    const logs = await this.prisma.emailLog.findMany({
      where: {
        createdAt: { gte: new Date(from), lte: new Date(to) },
      },
      orderBy: { createdAt: 'desc' },
    });

    const csvRows = [
      'ID,To,Subject,Status,Provider,CreatedAt',
      ...logs.map(
        (log) =>
          `${log.id},${log.to},${log.subject},${log.status},${log.provider || ''},${log.createdAt.toISOString()}`,
      ),
    ];

    const csv = csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="audit-log-${from}-${to}.csv"`);
    res.send(csv);
  }
}
