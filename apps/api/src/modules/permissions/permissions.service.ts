import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RolePermission } from '@prisma/client';

@Injectable()
export class PermissionsService {
  private readonly logger = new Logger(PermissionsService.name);
  private readonly cache = new Map<string, Map<string, boolean>>(); // role -> key -> isEnabled
  private readonly ttlMs = 60_000; // 1 minute (not used currently)

  constructor(private readonly prisma: PrismaService) {
    // Load cache on init — kecuali saat bootstrap tanpa DB (swagger:export
    // di CI men-set SKIP_DB_CONNECT). Query ke DB yang gagal di sini bisa
    // menjadi unhandled rejection dan mematikan proses.
    if (process.env.SKIP_DB_CONNECT !== 'true') {
      this.reloadCache().catch((err) =>
        this.logger.warn(`Permissions cache load skipped: ${err?.message ?? err}`),
      );
    }
  }

  private async reloadCache(): Promise<void> {
    this.logger.log('Reloading permissions cache from DB...');
    const perms = await this.prisma.rolePermission.findMany({
      select: { role: true, key: true, isEnabled: true },
    });
    this.cache.clear();
    for (const p of perms) {
      if (!this.cache.has(p.role)) this.cache.set(p.role, new Map());
      this.cache.get(p.role)!.set(p.key, p.isEnabled);
    }
    this.logger.log(`Cache loaded: ${perms.length} rows`);
  }

  /** Return true if permission is enabled for role (default true when not defined) */
  async isEnabled(role: string, key: string): Promise<boolean> {
    const roleMap = this.cache.get(role);
    if (!roleMap) return true; // no rows for role => all enabled
    const enabled = roleMap.get(key);
    return enabled !== false; // true or undefined => enabled
  }

  /** Get all permissions (used for matrix view) */
  async getAll(): Promise<RolePermission[]> {
    return this.prisma.rolePermission.findMany();
  }

  /** Invalidate cache for a specific key or whole cache */
  async invalidate(key?: string): Promise<void> {
    if (key) {
      for (const roleMap of this.cache.values()) {
        roleMap.delete(key);
      }
    } else {
      this.cache.clear();
    }
    await this.reloadCache();
  }
}
