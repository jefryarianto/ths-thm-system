import { Injectable, ExecutionContext, CanActivate, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../../../common/decorators/roles.decorator';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';
import { requestContextStore } from '../../../common/utils/request-context';
import { resolvePermissionKey } from '../../permissions/permission.registry';
import { PermissionsService } from '../../permissions/permissions.service';
import { PrismaService } from '@prisma/prisma.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }

  handleRequest<TUser = { id?: string }>(err: unknown, user: TUser) {
    if (err) throw err;
    if (!user || !(user as { id?: string }).id) {
      throw new UnauthorizedException('Sesi tidak valid');
    }
    const ctx = requestContextStore.getStore();
    if (ctx) ctx.userId = (user as unknown as { id: string }).id;
    return user;
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionsService: PermissionsService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no roles required, allow access
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) return false;

    // Superadmin always has full access to all endpoints
    if (user.role === 'superadmin') return true;

    // Check role based access
    if (!requiredRoles.includes(user.role)) {
      return false;
    }

    // Resolve permission key based on request path and method
    const path = request.path;
    const permissionKey = resolvePermissionKey(request, path);
    if (permissionKey) {
      const enabled = await this.permissionsService.isEnabled(user.role, permissionKey);
      if (!enabled) return false;
    }

    return true;
  }
}


