import {
  Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post,
  Req, Res, UploadedFile, UseInterceptors, ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiBearerAuth, ApiConsumes, ApiProperty, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import type { Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { ScopedRequest } from '../../common/interfaces/user-scope.interface';
import { GaleriService } from './galeri.service';

class ReviewGaleriDto {
  @Type(() => String)
  @ApiProperty({ enum: ['APPROVED', 'REJECTED'] })
  @IsIn(['APPROVED', 'REJECTED'])
  status!: 'APPROVED' | 'REJECTED';

  @ApiProperty({ required: false, maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;
}

@ApiTags('Galeri')
@Controller('galeri')
export class GaleriController {
  constructor(private readonly service: GaleriService) {}

  @Post('upload')
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }))
  upload(@UploadedFile() file: Express.Multer.File, @Body('judul', new ValidationPipe({ transform: true })) judul: string, @Req() req: ScopedRequest) {
    return this.service.upload(file, judul, req.user!.id);
  }

  @Get('mine')
  @ApiBearerAuth()
  mine(@Req() req: ScopedRequest) { return this.service.listMine(req.user!.id); }

  @Get('admin/:id/image')
  @ApiBearerAuth()
  @Roles('superadmin', 'admin_nasional', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan')
  async adminImage(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    const image = await this.service.getStoredImage(id);
    res.setHeader('Content-Type', image.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(image.fileName)}"`);
    image.stream.pipe(res);
  }

  @Get('admin')
  @ApiBearerAuth()
  @Roles('superadmin', 'admin_nasional', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan')
  adminList() { return this.service.listAdmin(); }

  @Patch(':id/review')
  @ApiBearerAuth()
  @Roles('superadmin', 'admin_nasional', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan')
  review(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ValidationPipe({ whitelist: true, transform: true })) body: ReviewGaleriDto,
    @Req() req: ScopedRequest,
  ) {
    return this.service.review(id, body.status, body.reason, req.user!.id);
  }

  @Delete(':id')
  @ApiBearerAuth()
  delete(@Param('id', ParseUUIDPipe) id: string, @Req() req: ScopedRequest) {
    return this.service.delete(id, req.user);
  }

  @Get(':id/image')
  @Public()
  async image(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    const image = await this.service.getImage(id);
    res.set({ 'Content-Type': image.mimeType, 'Content-Disposition': `inline; filename="${encodeURIComponent(image.fileName)}"`, 'Cache-Control': 'public, max-age=86400', 'X-Content-Type-Options': 'nosniff' });
    image.stream.pipe(res);
  }
}
