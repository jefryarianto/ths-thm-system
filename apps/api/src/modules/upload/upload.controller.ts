import {
  Controller,
  Post,
  Param,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ParseUUIDPipe,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { MembersService } from '../members/members.service';
import { UpdateMemberDto } from '../members/dto/member.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequireScope } from '../../common/decorators/scope.decorator';
import { ScopedRequest } from '../../common/interfaces/user-scope.interface';

@ApiTags('Upload')
@Controller('upload')
@ApiBearerAuth()
export class UploadController {
  constructor(private readonly membersService: MembersService) {}

  @Post('member-photo/:memberId')
  @ApiOperation({ summary: 'Upload foto anggota' })
  @ApiConsumes('multipart/form-data')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const uploadDir = process.env.UPLOAD_DIR || './uploads';
          if (!existsSync(uploadDir)) {
            mkdirSync(uploadDir, { recursive: true });
          }
          cb(null, uploadDir);
        },
        filename: (_req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname).toLowerCase();
          cb(null, `member-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowedMimes.includes(file.mimetype)) {
          cb(new BadRequestException('Hanya file gambar (JPEG, PNG, WebP, GIF) yang diizinkan'), false);
          return;
        }
        cb(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  async uploadMemberPhoto(
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: ScopedRequest,
  ) {
    if (!file) {
      throw new BadRequestException('File foto harus diupload');
    }

    // Update member's fotoPath with the saved filename
    const dto = new UpdateMemberDto();
    dto.fotoPath = file.filename;
    await this.membersService.update(memberId, dto, req.scope);

    return {
      success: true,
      data: {
        filename: file.filename,
        url: `/api/uploads/${file.filename}`,
      },
      message: 'Foto berhasil diupload',
    };
  }
}
