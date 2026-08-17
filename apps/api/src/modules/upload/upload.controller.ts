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
import { unlinkSync } from 'fs';
import { MembersService } from '../members/members.service';
import { UpdateMemberDto } from '../members/dto/member.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequireScope } from '../../common/decorators/scope.decorator';
import { ScopedRequest } from '../../common/interfaces/user-scope.interface';
import {
  buildImageUploadOptions,
  validateImageMagicBytes,
} from '../../common/utils/image-upload.util';

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
  @UseInterceptors(FileInterceptor('photo', buildImageUploadOptions('member')))
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

    // Generate versi tanpa background (`<file>.bg.png`) ala SIM agar kartu
    // langsung memakainya tanpa menunggu lazy generation pertama kali.
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require('fs');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const path = require('path');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { removePhotoBackground } = require('../../common/utils/photo-bg.util');
      const uploadDir = process.env.UPLOAD_DIR || './uploads';
      const out = await removePhotoBackground(fs.readFileSync(file.path));
      fs.writeFileSync(path.join(uploadDir, `${file.filename}.bg.png`), out);
    } catch {
      // Non-critical — lazy middleware akan meng-generate saat pertama diminta
    }

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
