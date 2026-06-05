import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Rate limit configuration per role.
 * Higher-privilege roles get tighter limits to prevent abuse.
 * Unauthenticated users (IP-only tracking) get the most restrictive limits.
 *
 * Values represent max requests per TTL window (default 60s).
 */
const ROLE_RATE_LIMITS: Record<string, { limit: number; ttl: number }> = {
  // Unauthenticated — strict limit by IP
  anonymous:  { limit: 20,  ttl: 60 },
  // Low-privilege roles — standard limits
  anggota:    { limit: 60,  ttl: 60 },
  penguji:    { limit: 80,  ttl: 60 },
  admin_kegiatan: { limit: 80, ttl: 60 },
  // Mid-level admin — slightly tighter
  admin_ranting: { limit: 100, ttl: 60 },
  admin_wilayah: { limit: 120, ttl: 60 },
  admin_distrik: { limit: 150, ttl: 60 },
  // Superadmin — generous but bounded
  superadmin: { limit: 200, ttl: 60 },
};

/**
 * Global rate limiting guard with per-role limits.
 *
 * Extends ThrottlerGuard to:
 * 1. Track by user ID (authenticated) or IP (unauthenticated)
 * 2. Apply different rate limits based on user role
 * 3. Ensure lower-privilege roles cannot abuse the API
 *
 * The per-role limits are configurable via ROLE_RATE_LIMITS constant.
 * Falls back to ThrottlerModule default limits for unknown roles.
 */
@Injectable()
export class RoleBasedThrottlerGuard extends ThrottlerGuard {
  /**
   * Override tracker key to use user ID for authenticated users,
   * falling back to IP address for unauthenticated requests.
   */
  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    const user = req['user'] as { id?: string } | undefined;
    return user?.id || (req['ip'] as string) || 'unknown';
  }

  /**
   * Override request handling to apply role-specific rate limits.
   * Uses the v6 ThrottlerRequest single-object signature.
   */
  protected async handleRequest(requestProps: {
    context: ExecutionContext;
    limit: number;
    ttl: number;
    throttler: { name: string; ttl: number; limit: number; blockDuration?: number; skipIf?: (context: ExecutionContext) => boolean; storage?: unknown };
    blockDuration: number;
    getTracker: () => Promise<string>;
    generateKey: () => string;
  }): Promise<boolean> {
    const { req } = this.getRequestResponse(requestProps.context);
    const user = req['user'] as { role?: string } | undefined;
    const role = user?.role || 'anonymous';

    // Get role-specific limits
    const roleLimits = ROLE_RATE_LIMITS[role];
    if (roleLimits) {
      requestProps.limit = roleLimits.limit;
      requestProps.ttl = roleLimits.ttl;
    }

    return super.handleRequest(requestProps);
  }
}
