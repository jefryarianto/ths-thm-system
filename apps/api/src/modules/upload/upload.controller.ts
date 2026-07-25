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
import { extname, resolve } from 'path';
import { existsSync, mkdirSync, readFileSync, unlinkSync } from 'fs';
import { MembersService } from '../members/members.service';
import { UpdateMemberDto } from '../members/dto/member.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequireScope } from '../../common/decorators/scope.decorator';
import { ScopedRequest } from '../../common/interfaces/user-scope.interface';

/**
 * Magic bytes (file signatures) for supported image formats.
 * Used as a second layer of validation beyond MIME type checking,
 * since the MIME type in a multipart upload is controlled by the client.
 */
const IMAGE_MAGIC_BYTES: Array<{ bytes: number[]; name: string }> = [
  { bytes: [0xFF, 0xD8, 0xFF], name: 'JPEG' },
  { bytes: [0x89, 0x50, 0x4E, 0x47], name: 'PNG' },
  { bytes: [0x52, 0x49, 0x46, 0x46], name: 'WebP' },
  { bytes: [0x47, 0x49, 0x46, 0x38], name: 'GIF' },
];

/**
 * Validate that a file's magic bytes match a known image format.
 * This is a defense-in-depth measure against MIME type spoofing.
 */
function validateImageMagicBytes(filePath: string): boolean {
  try {
    // Read the first 4 bytes (enough to distinguish JPEG/PNG/WebP/GIF)
    const buffer = readFileSync(filePath).slice(0, 4);
    return IMAGE_MAGIC_BYTES.some((fmt) =>
      fmt.bytes.every((b, i) => buffer[i] === b),
    );
  } catch {
    return false;
  }
}

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
          const rawDir = process.env.UPLOAD_DIR || './uploads';
          // Resolve to an absolute path and ensure it stays within the project
          const resolved = resolve(rawDir);
          if (!resolved.startsWith(resolve('.'))) {
            cb(new BadRequestException('UPLOAD_DIR harus berada dalam direktori project'), '');
            return;
          }
          if (!existsSync(resolved)) {
            mkdirSync(resolved, { recursive: true });
          }
          cb(null, resolved);
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

    // Validate file content via magic bytes (defense against MIME spoofing)
    if (!validateImageMagicBytes(file.path)) {
      // Clean up the invalid file
      try {
        unlinkSync(file.path);
      } catch {
        // Best-effort cleanup
      }
      throw new BadRequestException(
        'File tidak valid: format gambar tidak dikenali. Upload file JPEG, PNG, WebP, atau GIF.',
      );
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
