import { Injectable, ExecutionContext, CanActivate } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SCOPE_KEY, ScopeLevel } from '../decorators/scope.decorator';
import { ScopedRequest } from '../interfaces/user-scope.interface';
import { AuditService } from '../services/audit.service';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Role → minimum scope level mapping.
 * A role can access all resources at its level AND above.
 */
const ROLE_SCOPE: Record<string, ScopeLevel> = {
  superadmin: 'national',
  admin_nasional: 'national',
  admin_distrik: 'district',
  admin_wilayah: 'region',
  admin_ranting: 'branch',
  admin_kegiatan: 'branch',
  penguji: 'branch',
  anggota: 'self',
};

const SCOPE_ORDER: ScopeLevel[] = ['national', 'district', 'region', 'branch', 'self'];

function hasRequiredScope(userRole: ScopeLevel, requiredScope: ScopeLevel): boolean {
  const userIndex = SCOPE_ORDER.indexOf(userRole);
  const requiredIndex = SCOPE_ORDER.indexOf(requiredScope);
  return userIndex <= requiredIndex;
}

/**
 * Global guard that enforces scope-based access control.
 *
 * When @RequireScope('district') is applied to an endpoint, this guard:
 * 1. Checks if the user's role has at least 'district' level access
 * 2. Attaches scope context (rantingId/wilayahId/distrikId) to the request
 *
 * Services can then use request.scope to filter data by organizational level.
 */
@Injectable()
export class ScopeGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuditService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredScope = this.reflector.getAllAndOverride<ScopeLevel>(SCOPE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no scope required, allow access (RolesGuard handles role checks)
    if (!requiredScope) return true;

    const request = context.switchToHttp().getRequest<ScopedRequest>();
    const user = request.user;
    if (!user) return false;

    const userScopeLevel = ROLE_SCOPE[user.role] || 'self';

    if (!hasRequiredScope(userScopeLevel, requiredScope)) {
      // Log the scope violation for audit trail
      this.auditService.logScopeViolation({
        userId: user.id,
        userEmail: user.email,
        userRole: user.role,
        userScope: {
          rantingId: user.rantingId,
        },
        requiredScope,
        method: request.method ?? 'UNKNOWN',
        path: request.url ?? 'UNKNOWN',
        ip: request.ip,
      });

      return false;
    }

    // Attach scope info from user's org columns for services to use.
    // Each admin role is scoped at its own level:
    //   admin_distrik → distrikId
    //   admin_wilayah → wilayahId (+ distrikId via join)
    //   admin_ranting  → rantingId (+ wilayahId/distrikId via join)
    if (user.role === 'superadmin') {
      request.scope = {};
    } else if (user.role === 'admin_distrik' && user.distrikId) {
      request.scope = { distrikId: user.distrikId };
    } else if (user.role === 'admin_wilayah' && user.wilayahId) {
      // admin_wilayah: scope ke wilayah, sertakan distrik untuk filter tak langsung.
      const wilayah = await this.prisma.wilayah.findUnique({
        where: { id: user.wilayahId },
        select: { distrikId: true },
      });
      request.scope = wilayah
        ? { wilayahId: user.wilayahId, distrikId: wilayah.distrikId }
        : { wilayahId: user.wilayahId };
    } else if (user.rantingId) {
      // admin_ranting / penguji / admin_kegiatan: resolve ranting → wilayah → distrik.
      const ranting = await this.prisma.ranting.findUnique({
        where: { id: user.rantingId },
        include: { wilayah: { include: { distrik: true } } },
      });
      if (ranting) {
        request.scope = {
          rantingId: user.rantingId,
          wilayahId: ranting.wilayahId,
          distrikId: ranting.wilayah?.distrikId,
        };
      } else {
        request.scope = { rantingId: user.rantingId };
      }
    } else {
      request.scope = {};
    }

    return true;
  }
}
