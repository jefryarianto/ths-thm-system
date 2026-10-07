import { Controller, Get, Put, Body, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MENU_KEYS, ROLE_VALUES, type Role } from '@ths-thm/shared-types';
import { CrudAuth } from '../../common/decorators/crud-auth.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RoleMenuPermissionsService } from './role-menu-permissions.service';
import { BulkUpdateDto, UpdatePermissionDto } from './dto/role-menu-permissions.dto';

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
    const [permissions, dbMenuKeys] = await Promise.all([
      this.service.getAllPermissions(),
      this.service.getAllMenuKeys(),
    ]);

    // menuKeys = registry (menu sidebar yang sah) + key lama yang mungkin
    // masih ada di DB. Tanpa registry, matrix kosong saat tabel belum terisi
    // dan menu baru tidak pernah muncul. Key lama tetap disertakan agar baris
    // legacy tidak hilang dari tampilan.
    const menuKeys = Array.from(new Set([...MENU_KEYS, ...dbMenuKeys]));

    return {
      permissions,
      menuKeys,
    };
  }

  /**
   * GET /role-menu-permissions/my-menus
   * Izin menu milik role yang sedang login — dipakai sidebar
   * (`useMenuOverrides` → `filterVisibleGroups`) untuk menyembunyikan menu
   * yang dimatikan superadmin. Terbuka untuk semua role dan HANYA
   * mengembalikan baris sendiri, sehingga user biasa tidak bisa membaca
   * matriks penuh atau mengubah konfigurasi role lain.
   *
   * WAJIB dideklarasikan SEBELUM @Get(':role'): Express mencocokkan
   * 'my-menus' sebagai :role bila urutannya terbalik (catatan sama di
   * notifications.controller utk 'fcm-tokens').
   */
  @Get('my-menus')
  @ApiOperation({ summary: 'Izin menu untuk role sendiri (dipakai sidebar)' })
  @Roles(...ROLE_VALUES)
  async getMyMenus(@CurrentUser() user: { id: string; role: Role }) {
    const permissions = await this.service.getPermissionsForRole(user.role);
    return { permissions };
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
  async bulkUpdate(@Param('role') role: string, @Body() dto: BulkUpdateDto) {
    const updated = await this.service.bulkUpdate(role, dto.permissions);
    return { updated };
  }
}
