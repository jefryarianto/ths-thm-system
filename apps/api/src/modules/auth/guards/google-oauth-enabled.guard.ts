import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Gate for Google OAuth endpoints.
 *
 * Ketika setting `google_oauth_enabled` bernilai `false`, endpoint
 * `/api/auth/google` (dan callback-nya) ditutup. Konfigurasi/kode OAuth
 * tidak dihapus — cukup dinonaktifkan lewat dashboard Settings, sehingga
 * pengguna tidak bisa login memakai Google meskipun tombolnya disembunyikan.
 */
@Injectable()
export class GoogleOAuthEnabledGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(_context: ExecutionContext): Promise<boolean> {
    const setting = await this.prisma.setting.findUnique({
      where: { key: 'google_oauth_enabled' },
    });
    // Default aktif bila setting belum pernah diatur.
    if (setting?.value === false) {
      throw new ForbiddenException('Login Google dinonaktifkan');
    }
    return true;
  }
}