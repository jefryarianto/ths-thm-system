import { Injectable, ExecutionContext, CanActivate } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SCOPE_KEY, ScopeLevel } from '../decorators/scope.decorator';
import { ScopedRequest, UserScope } from '../interfaces/user-scope.interface';
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
  penguji: 'self',
  anggota: 'self',
};

const SCOPE_ORDER: ScopeLevel[] = ['national', 'district', 'region', 'branch', 'self'];

/**
 * A 'self' scope user is allowed to pass *any* scope gate: the actual row-level
 * restriction is enforced by the service layer (see resolveOwnMemberId /
 * assertSelfMember). Returning false here would make every @RequireScope('branch')
 * endpoint reject anggota/penguji entirely, which is not the intended behavior.
 * The gate still depends on @Roles allowing the role first, so this early return
 * cannot escalate privilege on its own.
 */
function hasRequiredScope(userRole: ScopeLevel, requiredScope: ScopeLevel): boolean {
  if (userRole === 'self') return true;
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
    } else if (user.role === 'anggota' || user.role === 'penguji') {
      // anggota & penguji berscope 'self': mereka hanya boleh melihat baris milik
      // anggota dirinya sendiri (ditambah pengecualian penguji untuk peserta
      // kegiatan yang diujiinya — dienforce di tiap service). Member id di-resolve
      // dari email (fallback nama lengkap) karena User tidak berelasi langsung
      // dengan Anggota. Hierarki ranting tetap dilampirkan agar resource yang
      // memang branch-wide (mis. dokumen organisasi, kalender) terfilter benar.
      request.scope = await this.resolveSelfScope(user);
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

  /**
   * Resolve the scope for an `anggota`/`penguji`: own member id + the org
   * hierarchy of that member's ranting. Falls back to an empty self scope
   * (still marked as self via selfMemberId only if a member was found) so the
   * user is never treated as a national admin.
   */
  private async resolveSelfScope(user: ScopedRequest['user']): Promise<UserScope> {
    const scope: UserScope = {};

    if (user.email) {
      const own = await this.prisma.anggota.findFirst({
        where: { email: user.email, deletedAt: null },
        select: { id: true, rantingId: true },
      });
      if (own) {
        scope.selfMemberId = own.id;
        if (own.rantingId) scope.rantingId = own.rantingId;
      }
    }

    if (!scope.selfMemberId && user.namaLengkap?.trim()) {
      const byName = await this.prisma.anggota.findMany({
        where: {
          namaLengkap: { equals: user.namaLengkap.trim(), mode: 'insensitive' },
          OR: [{ email: null }, { email: '' }],
          deletedAt: null,
        },
        select: { id: true, rantingId: true },
      });
      if (byName.length === 1) {
        scope.selfMemberId = byName[0].id;
        if (byName[0].rantingId) scope.rantingId = byName[0].rantingId;
      }
    }

    // Lampirkan hierarki ranting bila user punya kolom rantingId sendiri.
    if (!scope.rantingId && user.rantingId) {
      const ranting = await this.prisma.ranting.findUnique({
        where: { id: user.rantingId },
        include: { wilayah: { include: { distrik: true } } },
      });
      if (ranting) {
        scope.rantingId = user.rantingId;
        scope.wilayahId = ranting.wilayahId;
        scope.distrikId = ranting.wilayah?.distrikId;
      } else {
        scope.rantingId = user.rantingId;
      }
    }

    if (scope.rantingId && !scope.wilayahId) {
      const ranting = await this.prisma.ranting.findUnique({
        where: { id: scope.rantingId },
        select: { wilayahId: true, wilayah: { select: { distrikId: true } } },
      });
      if (ranting) {
        scope.wilayahId = ranting.wilayahId;
        scope.distrikId = ranting.wilayah?.distrikId;
      }
    }

    return scope;
  }
}
