import { Controller, Get, Post, Delete, Param, StreamableFile, Query, Logger } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../decorators/roles.decorator';
import { DbBackupService } from '../services/db-backup.service';
import { createReadStream } from 'fs';

@ApiTags('Admin')
@Controller('admin/db-backup')
@Roles('superadmin')
@ApiBearerAuth()
export class DbBackupController {
  private readonly logger = new Logger(DbBackupController.name);

  constructor(private readonly dbBackup: DbBackupService) {}

  @Get()
  @ApiOperation({ summary: 'Daftar file backup database' })
  list() {
    return { success: true, data: this.dbBackup.listBackups() };
  }

  @Post()
  @ApiOperation({ summary: 'Trigger backup database secara manual' })
  async trigger() {
    const backup = await this.dbBackup.runBackup();
    return { success: true, data: backup, message: 'Backup berhasil dibuat' };
  }

  @Get('download/:file')
  @ApiOperation({ summary: 'Unduh file backup (gzip)' })
  download(@Param('file') file: string) {
    const path = this.dbBackup.getBackupPath(file);
    const stream = createReadStream(path);
    return new StreamableFile(stream, {
      type: 'application/gzip',
      disposition: `attachment; filename="${file}"`,
    });
  }

  @Delete(':file')
  @ApiOperation({ summary: 'Hapus file backup' })
  delete(@Param('file') file: string, @Query('confirm') confirm?: string) {
    if (confirm !== 'true') {
      return { success: false, message: 'Konfirmasi wajib: kirim ?confirm=true' };
    }
    const removed = this.dbBackup.deleteBackup(file);
    if (!removed) {
      return { success: false, message: 'File backup tidak ditemukan' };
    }
    return { success: true, message: 'File backup dihapus' };
  }
}