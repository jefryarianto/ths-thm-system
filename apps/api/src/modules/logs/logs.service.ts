import { Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import { ClientErrorDto } from './dto/client-error.dto';

/**
 * Menyimpan laporan error klien ke file JSON-lines agar mudah dipantau
 * (grep / tail / dashboard sederhana). Lokasi bisa diatur via env
 * `CLIENT_ERROR_LOG_PATH` (default: `logs/client-errors.log` relatif cwd API).
 */
@Injectable()
export class LogsService {
  private readonly logger = new Logger('LogsService');
  private readonly logFilePath: string;

  constructor() {
    const relPath = process.env.CLIENT_ERROR_LOG_PATH || 'logs/client-errors.log';
    this.logFilePath = path.resolve(process.cwd(), relPath);
  }

  async recordClientError(dto: ClientErrorDto): Promise<void> {
    const entry = {
      timestamp: dto.timestamp || new Date().toISOString(),
      level: dto.level || 'error',
      platform: dto.platform || null,
      module: dto.module || null,
      action: dto.action || null,
      errorName: dto.errorName || null,
      message: dto.message.slice(0, 1000),
      stack: dto.stack ? dto.stack.slice(0, 4000) : null,
      extra: dto.extra || null,
    };

    try {
      await fs.mkdir(path.dirname(this.logFilePath), { recursive: true });
      await fs.appendFile(
        this.logFilePath,
        JSON.stringify(entry) + '\n',
        'utf8',
      );
      this.logger.warn(
        `[client-error] ${entry.module || 'app'} (${entry.platform || 'unknown'}): ${entry.message}`,
      );
    } catch (err) {
      // Kegagalan menulis log tidak boleh menggagalkan request (best-effort.

      this.logger.error(
        `Failed to persist client error log: ${(err as Error).message}`,
      );
    }
  }
}