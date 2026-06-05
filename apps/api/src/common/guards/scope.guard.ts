import { Injectable, ExecutionContext, CanActivate } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SCOPE_KEY, ScopeLevel } from '../decorators/scope.decorator';
import { ScopedRequest, UserScope } from '../interfaces/user-scope.interface';
import { AuditService } from '../services/audit.service';

/**
 * Role → minimum scope level mapping.
 * A role can access all resources at its level AND above.
 */
const ROLE_SCOPE: Record<string, ScopeLevel> = {
  superadmin: 'national',
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
  ) {}

  canActivate(context: ExecutionContext): boolean {
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

    // Attach scope info from user's rantingId for services to use
    if (user.rantingId) {
      request.scope = { rantingId: user.rantingId };
    } else {
      // Superadmin or admin without rantingId — full scope
      request.scope = {};
    }

    return true;
  }
}
