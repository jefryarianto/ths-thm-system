import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator';
import { LogsService } from './logs.service';
import { ClientErrorDto } from './dto/client-error.dto';

@ApiTags('Logs')
@Controller('logs')
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  /**
   * Menerima laporan error dari aplikasi mobile (mis. GlobalErrorBoundary)
   * agar crash tidak lagi "invisible" bagi developer.
   *
   * Publik (tanpa JWT) karena error bisa terjadi sebelum/saat login,
   * tapi di-throttle ketat per IP untuk mencegah abuse.
   */
  @Public()
  @Post('error')
  @HttpCode(200)
  @Throttle({ default: { limit: 60, ttl: 60 } })
  @ApiOperation({ summary: 'Terima laporan error aplikasi klien (mobile)' })
  async reportClientError(@Body() dto: ClientErrorDto): Promise<void> {
    await this.logsService.recordClientError(dto);
  }
}