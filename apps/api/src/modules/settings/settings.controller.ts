import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Res,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { unlinkSync } from 'fs';
import { PrismaService } from '../../prisma/prisma.service';
import { SettingsService } from './settings.service';
import {
  CreatePeriodDto,
  UpdatePeriodDto,
  CreateSignatureDto,
  CreateStampDto,
} from './dto/setting.dto';
import { CrudAuth } from '../../common/decorators/crud-auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  buildImageUploadOptions,
  validateImageMagicBytes,
} from '../../common/utils/image-upload.util';

@ApiTags('Settings')
@Controller('settings')
@ApiBearerAuth()
export class SettingsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsService: SettingsService,
  ) {}

  @Get()
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', { scope: 'national', summary: 'Ambil semua pengaturan' })
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
    return config;
  }

  @Patch()
  @CrudAuth('superadmin', { scope: 'national', summary: 'Perbarui pengaturan organisasi (bulk via key-value)' })
  async updateSettings(@Body() dto: Record<string, unknown>) {
    return this.settingsService.updateSettings(dto);
  }

  @Get('periods')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', { scope: 'national', summary: 'Ambil daftar periode' })
  async getPeriods() {
    return this.settingsService.getPeriods();
  }

  @Post('periods')
  @CrudAuth('superadmin', { scope: 'national', summary: 'Tambah periode baru' })
  async createPeriod(@Body() dto: CreatePeriodDto) {
    return this.settingsService.createPeriod(dto);
  }

  @Patch('periods/:id')
  @CrudAuth('superadmin', { scope: 'national', summary: 'Perbarui periode' })
  async updatePeriod(@Param('id') id: string, @Body() dto: UpdatePeriodDto) {
    return this.settingsService.updatePeriod(id, dto);
  }

  @Delete('periods/:id')
  @CrudAuth('superadmin', { scope: 'national', summary: 'Hapus periode' })
  async deletePeriod(@Param('id') id: string) {
    return this.settingsService.deletePeriod(id);
  }

  @Get('signatures')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', { scope: 'national', summary: 'Ambil daftar tanda tangan' })
  async getSignatures() {
    return this.settingsService.getSignatures();
  }

  @Delete('signatures/:id')
  @CrudAuth('superadmin', { scope: 'national', summary: 'Hapus tanda tangan' })
  async deleteSignature(@Param('id') id: string) {
    return this.settingsService.deleteSignature(id);
  }

  @Get('stamp')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', { scope: 'national', summary: 'Ambil stempel aktif' })
  async getStamp() {
    return this.settingsService.getStamp();
  }

  @Post('signatures')
  @ApiConsumes('multipart/form-data')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', { scope: 'national', summary: 'Upload tanda tangan (gambar)' })
  @UseInterceptors(FileInterceptor('file', buildImageUploadOptions('signature')))
  async uploadSignature(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: { nama?: string; jabatan?: string },
    @CurrentUser() user: { id: string; namaLengkap?: string },
  ) {
    if (!file) {
      throw new BadRequestException('File tanda tangan harus diupload');
    }
    if (!validateImageMagicBytes(file.path)) {
      try {
        unlinkSync(file.path);
      } catch {
        /* best-effort cleanup */
      }
      throw new BadRequestException('File tidak valid: format gambar tidak dikenali');
    }

    const dto = new CreateSignatureDto();
    dto.userId = user.id;
    dto.nama = body.nama?.trim() || user.namaLengkap || 'Tanda Tangan';
    dto.jabatan = body.jabatan?.trim() || 'Pejabat Distrik';
    dto.imagePath = file.filename;
    dto.isActive = true;
    return this.settingsService.uploadSignature(dto);
  }

  @Post('stamp')
  @ApiConsumes('multipart/form-data')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', { scope: 'national', summary: 'Upload stempel (gambar)' })
  @UseInterceptors(FileInterceptor('file', buildImageUploadOptions('stamp')))
  async uploadStamp(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: { nama?: string },
  ) {
    if (!file) {
      throw new BadRequestException('File stempel harus diupload');
    }
    if (!validateImageMagicBytes(file.path)) {
      try {
        unlinkSync(file.path);
      } catch {
        /* best-effort cleanup */
      }
      throw new BadRequestException('File tidak valid: format gambar tidak dikenali');
    }

    const dto = new CreateStampDto();
    dto.nama = body.nama?.trim() || 'Stempel Distrik';
    dto.imagePath = file.filename;
    dto.isActive = true;
    return this.settingsService.uploadStamp(dto);
  }

  @Get(':key')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', { scope: 'national', summary: 'Ambil pengaturan by key' })
  async getSetting(@Param('key') key: string) {
    const setting = await this.prisma.setting.findUnique({ where: { key } });
    if (!setting) {
      return { success: false, message: 'Setting not found' };
    }
    return setting.value;
  }

  @Post(':key')
  @CrudAuth('superadmin', { scope: 'national', summary: 'Perbarui pengaturan by key' })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async updateSetting(@Param('key') key: string, @Body() body: { value: any }) {
    await this.prisma.setting.upsert({
      where: { key },
      create: { key, value: body.value },
      update: { value: body.value },
    });
  }

  @Get('branding/colors')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', { scope: 'national', summary: 'Ambil warna branding' })
  async getBrandingColors() {
    const setting = await this.prisma.setting.findUnique({ where: { key: 'branding' } });
    const colors = setting?.value || {
      primary: '#0066cc',
      secondary: '#004c99',
      accent: '#ff6600',
    };
    return colors;
  }

  @Post('branding/colors')
  @CrudAuth('superadmin', { scope: 'national', summary: 'Perbarui warna branding' })
  async updateBrandingColors(@Body() body: { primary: string; secondary: string; accent: string }) {
    await this.prisma.setting.upsert({
      where: { key: 'branding' },
      create: { key: 'branding', value: body },
      update: { value: body },
    });
  }

  @Get('export/audit')
  @CrudAuth('superadmin', { scope: 'national', summary: 'Ekspor log audit' })
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
