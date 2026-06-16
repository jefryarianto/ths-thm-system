import { Controller, Get, Query, Req, Res } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { ScopedRequest } from '../../common/interfaces/user-scope.interface';
import { ReportsService } from './reports.service';
import { Response } from 'express';

@ApiTags('Reports')
@Controller('reports')
@ApiBearerAuth()
export class ReportsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reportsService: ReportsService,
  ) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Ambil data dashboard' })
  async getDashboardData(@Req() req: ScopedRequest) {
    return this.reportsService.dashboardStats(req.scope);
  }

  @Get('scan-stats')
  @ApiOperation({ summary: 'Ambil statistik pemindaian' })
  async getScanStats(@Req() req: ScopedRequest) {
    return this.reportsService.scanStats(req.scope);
  }

  @Get('chart/members-over-time')
  @ApiOperation({ summary: 'Grafik pertumbuhan anggota' })
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

    const result = Object.entries(grouped)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return { success: true, data: result };
  }

  @Get('chart/training-attendance')
  @ApiOperation({ summary: 'Grafik kehadiran pelatihan' })
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

    const result = Object.entries(monthly)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return { success: true, data: result };
  }

  @Get('export/audit-log')
  @ApiOperation({ summary: 'Ekspor log audit' })
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
