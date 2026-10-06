import { Controller, Get, Patch, Body, Param, Query, ForbiddenException } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RolePermission } from '@prisma/client';

@Controller('permissions')
export class PermissionsController {
  constructor(
    private readonly service: PermissionsService,
    private readonly prisma: PrismaService,
  ) {}

  // GET /permissions/me?role=roleName
  @Get('me')
  async getMe(@Query('role') role?: string) {
    const userRole = role || 'superadmin';
    // For demo, just return role and a flag
    return { role: userRole, permissionsEnabled: true };
  }

  // GET /permissions/matrix - full matrix (admin only)
  @Get('matrix')
  async getMatrix() {
    return this.service.getAll();
  }

  // PATCH /permissions - toggle single permission
  @Patch()
  async toggle(@Body() body: { role: string; key: string; isEnabled: boolean }) {
    await this.prisma.rolePermission.upsert({
      where: { role_key: { role: body.role, key: body.key } },
      update: { isEnabled: body.isEnabled },
      create: { role: body.role, key: body.key, isEnabled: body.isEnabled },
    });
    await this.service.invalidate(body.key);
    return { success: true };
  }

  // PATCH /permissions/bulk/:role - bulk toggle for a role
  @Patch('bulk/:role')
  async bulkToggle(@Param('role') role: string, @Body() body: { keys: string[]; isEnabled: boolean }) {
    for (const key of body.keys) {
      await this.prisma.rolePermission.upsert({
        where: { role_key: { role: role, key: key } },
        update: { isEnabled: body.isEnabled },
        create: { role, key, isEnabled: body.isEnabled },
      });
    }
    await this.service.invalidate();
    return { success: true };
  }
}
