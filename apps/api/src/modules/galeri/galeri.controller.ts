import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiBearerAuth, ApiConsumes, ApiProperty, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import type { Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { ScopedRequest } from '../../common/interfaces/user-scope.interface';
import { GaleriService, MAX_REVIEW_BULK, MODERATOR_ROLES } from './galeri.service';

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

class ReviewBulkGaleriDto extends ReviewGaleriDto {
  @ApiProperty({ type: [String], description: `Maksimal ${MAX_REVIEW_BULK} id` })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(MAX_REVIEW_BULK)
  @IsUUID('4', { each: true })
  ids!: string[];
}

@ApiTags('Galeri')
@Controller('galeri')
export class GaleriController {
  constructor(private readonly service: GaleriService) {}

  @Post('upload')
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('judul', new ValidationPipe({ transform: true })) judul: string,
    @Body('deskripsi') deskripsi: string | undefined,
    @Body('kategori') kategori: string | undefined,
    @Req() req: ScopedRequest,
  ) {
    return this.service.upload(file, judul, req.user!.id, deskripsi, kategori);
  }

  @Get('mine')
  @ApiBearerAuth()
  mine(@Req() req: ScopedRequest) {
    return this.service.listMine(req.user!.id);
  }

  @Get('admin')
  @ApiBearerAuth()
  @Roles(...MODERATOR_ROLES)
  adminList(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.listAdmin({ status, page, limit });
  }

  @Get('admin/deletions')
  @ApiBearerAuth()
  @Roles(...MODERATOR_ROLES)
  deletionHistory(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('actorId') actorId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.listDeletions({ page, limit, actorId, from, to });
  }

  @Get('admin/:id/image')
  @ApiBearerAuth()
  @Roles(...MODERATOR_ROLES)
  async adminImage(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    const image = await this.service.getStoredImage(id);
    res.setHeader('Content-Type', image.mimeType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(image.fileName)}"`,
    );
    res.setHeader('Cache-Control', 'private, max-age=60');
    image.stream.pipe(res);
  }

  @Get('admin/:id/thumbnail')
  @ApiBearerAuth()
  @Roles(...MODERATOR_ROLES)
  async adminThumbnail(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    const image = await this.service.getStoredThumbnail(id);
    res.setHeader('Content-Type', image.mimeType);
    res.setHeader('Cache-Control', 'private, max-age=300');
    image.stream.pipe(res);
  }

  @Get('admin/:id/history')
  @ApiBearerAuth()
  @Roles(...MODERATOR_ROLES)
  history(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.history(id);
  }

  @Patch('review/bulk')
  @ApiBearerAuth()
  @Roles(...MODERATOR_ROLES)
  reviewBulk(
    @Body(new ValidationPipe({ whitelist: true, transform: true })) body: ReviewBulkGaleriDto,
    @Req() req: ScopedRequest,
  ) {
    return this.service.reviewBulk(
      body.ids,
      body.status,
      body.reason,
      req.user!.id,
      req.user!.namaLengkap,
    );
  }

  @Patch(':id/review')
  @ApiBearerAuth()
  @Roles(...MODERATOR_ROLES)
  review(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ValidationPipe({ whitelist: true, transform: true })) body: ReviewGaleriDto,
    @Req() req: ScopedRequest,
  ) {
    return this.service.review(id, body.status, body.reason, req.user!.id, req.user!.namaLengkap);
  }

  @Delete(':id')
  @ApiBearerAuth()
  delete(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: ScopedRequest,
    @Query('reason') reason?: string,
  ) {
    return this.service.delete(id, req.user!, reason);
  }

  @Get(':id/image')
  @Public()
  async image(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    const image = await this.service.getImage(id);
    res.set({
      'Content-Type': image.mimeType,
      'Content-Disposition': `inline; filename="${encodeURIComponent(image.fileName)}"`,
      'Cache-Control': 'public, max-age=86400',
      'X-Content-Type-Options': 'nosniff',
    });
    image.stream.pipe(res);
  }

  @Get(':id/thumbnail')
  @Public()
  async thumbnail(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    const image = await this.service.getThumbnail(id);
    res.set({
      'Content-Type': image.mimeType,
      'Cache-Control': 'public, max-age=86400',
      'X-Content-Type-Options': 'nosniff',
    });
    image.stream.pipe(res);
  }
}
