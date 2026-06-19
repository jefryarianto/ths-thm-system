import { Controller, Get, Post, Body, Param, Query, Res } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequireScope } from '../../common/decorators/scope.decorator';

@ApiTags('Settings')
@Controller('settings')
@ApiBearerAuth()
export class SettingsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Ambil semua pengaturan' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah')
  @RequireScope('national')
  async getAllSettings() {
    const settings = await this.prisma.setting.findMany();
    const config = settings.reduce(
      (acc, s) => {
        acc[s.key] = s.value;
        return acc;
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {} as Record<string, any>,
    );
    return { success: true, data: config };
  }

  @Get(':key')
  @ApiOperation({ summary: 'Ambil pengaturan' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah')
  @RequireScope('national')
  async getSetting(@Param('key') key: string) {
    const setting = await this.prisma.setting.findUnique({ where: { key } });
    if (!setting) {
      return { success: false, message: 'Setting not found' };
    }
    return { success: true, data: setting.value };
  }

  @Post(':key')
  @ApiOperation({ summary: 'Perbarui pengaturan' })
  @Roles('superadmin')
  @RequireScope('national')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async updateSetting(@Param('key') key: string, @Body() body: { value: any }) {
    await this.prisma.setting.upsert({
      where: { key },
      create: { key, value: body.value },
      update: { value: body.value },
    });
    return { success: true, message: 'Setting updated' };
  }

  @Get('branding/colors')
  @ApiOperation({ summary: 'Ambil warna branding' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah')
  @RequireScope('national')
  async getBrandingColors() {
    const setting = await this.prisma.setting.findUnique({ where: { key: 'branding' } });
    const colors = setting?.value || {
      primary: '#0066cc',
      secondary: '#004c99',
      accent: '#ff6600',
    };
    return { success: true, data: colors };
  }

  @Post('branding/colors')
  @ApiOperation({ summary: 'Perbarui warna branding' })
  @Roles('superadmin')
  @RequireScope('national')
  async updateBrandingColors(@Body() body: { primary: string; secondary: string; accent: string }) {
    await this.prisma.setting.upsert({
      where: { key: 'branding' },
      create: { key: 'branding', value: body },
      update: { value: body },
    });
    return { success: true, message: 'Branding updated' };
  }

  @Get('export/audit')
  @ApiOperation({ summary: 'Ekspor log audit' })
  @Roles('superadmin')
  @RequireScope('national')
  async exportAudit(@Query('from') from: string, @Query('to') to: string, @Res() res: Response) {
    const logs = await this.prisma.emailLog.findMany({
      where: { createdAt: { gte: new Date(from), lte: new Date(to) } },
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
    res.setHeader('Content-Disposition', `attachment; filename="audit-${from}-${to}.csv"`);
    res.send(csv);
  }
}
