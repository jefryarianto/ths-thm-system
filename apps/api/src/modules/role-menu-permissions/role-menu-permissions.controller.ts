import { Controller, Get, Put, Body, Param, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CrudAuth } from '../../common/decorators/crud-auth.decorator';
import { ScopedRequest } from '../../common/interfaces/user-scope.interface';
import { RoleMenuPermissionsService, UpdatePermissionDto } from './role-menu-permissions.service';

@ApiTags('Role Menu Permissions')
@Controller('role-menu-permissions')
@ApiBearerAuth()
export class RoleMenuPermissionsController {
  constructor(private readonly service: RoleMenuPermissionsService) {}

  /**
   * GET /role-menu-permissions
   * Get all permissions as a matrix (role → menuKey → isEnabled)
   */
  @Get()
  @CrudAuth('superadmin', { summary: 'Get all role-menu permissions matrix' })
  async getAll() {
    const [permissions, menuKeys] = await Promise.all([
      this.service.getAllPermissions(),
      this.service.getAllMenuKeys(),
    ]);

    return {
      permissions,
      menuKeys,
    };
  }

  /**
   * GET /role-menu-permissions/:role
   * Get permissions for a specific role
   */
  @Get(':role')
  @CrudAuth('superadmin', { summary: 'Get permissions for a specific role' })
  async getForRole(@Param('role') role: string) {
    return this.service.getPermissionsForRole(role);
  }

  /**
   * PUT /role-menu-permissions
   * Update a single permission
   */
  @Put()
  @CrudAuth('superadmin', { summary: 'Update a single permission' })
  async update(@Body() dto: UpdatePermissionDto) {
    return this.service.updatePermission(dto);
  }

  /**
   * PUT /role-menu-permissions/bulk/:role
   * Bulk update permissions for a role
   */
  @Put('bulk/:role')
  @CrudAuth('superadmin', { summary: 'Bulk update permissions for a role' })
  async bulkUpdate(
    @Param('role') role: string,
    @Body() body: { permissions: Record<string, boolean> },
  ) {
    const updated = await this.service.bulkUpdate(role, body.permissions);
    return { updated };
  }
}
