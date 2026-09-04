import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface RoleMenuPermissionDto {
  id: string;
  role: string;
  menuKey: string;
  isEnabled: boolean;
}

export interface UpdatePermissionDto {
  role: string;
  menuKey: string;
  isEnabled: boolean;
}

@Injectable()
export class RoleMenuPermissionsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all permissions for a specific role
   */
  async getPermissionsForRole(role: string): Promise<Record<string, boolean>> {
    const permissions = await this.prisma.roleMenuPermission.findMany({
      where: { role },
    });

    const result: Record<string, boolean> = {};
    for (const perm of permissions) {
      result[perm.menuKey] = perm.isEnabled;
    }
    return result;
  }

  /**
   * Get all permissions as a matrix (role → menuKey → isEnabled)
   */
  async getAllPermissions(): Promise<Record<string, Record<string, boolean>>> {
    const permissions = await this.prisma.roleMenuPermission.findMany();

    const result: Record<string, Record<string, boolean>> = {};
    for (const perm of permissions) {
      if (!result[perm.role]) {
        result[perm.role] = {};
      }
      result[perm.role][perm.menuKey] = perm.isEnabled;
    }
    return result;
  }

  /**
   * Get all unique menu keys
   */
  async getAllMenuKeys(): Promise<string[]> {
    const permissions = await this.prisma.roleMenuPermission.findMany({
      select: { menuKey: true },
      distinct: ['menuKey'],
    });
    return permissions.map((p) => p.menuKey);
  }

  /**
   * Update a single permission
   */
  async updatePermission(dto: UpdatePermissionDto): Promise<RoleMenuPermissionDto> {
    return this.prisma.roleMenuPermission.upsert({
      where: {
        role_menuKey: {
          role: dto.role,
          menuKey: dto.menuKey,
        },
      },
      update: {
        isEnabled: dto.isEnabled,
      },
      create: {
        role: dto.role,
        menuKey: dto.menuKey,
        isEnabled: dto.isEnabled,
      },
    });
  }

  /**
   * Bulk update permissions for a role
   */
  async bulkUpdate(role: string, permissions: Record<string, boolean>): Promise<number> {
    let updated = 0;

    for (const [menuKey, isEnabled] of Object.entries(permissions)) {
      await this.prisma.roleMenuPermission.upsert({
        where: {
          role_menuKey: {
            role,
            menuKey,
          },
        },
        update: {
          isEnabled,
        },
        create: {
          role,
          menuKey,
          isEnabled,
        },
      });
      updated++;
    }

    return updated;
  }

  /**
   * Seed permissions from minRole-based config
   * Only creates if no permissions exist yet
   */
  async seedFromMinRoleConfig(
    menuConfig: Record<string, string>,
    roleHierarchy: Record<string, number>
  ): Promise<number> {
    const existingCount = await this.prisma.roleMenuPermission.count();
    if (existingCount > 0) {
      return 0; // Already seeded
    }

    const allRoles = Object.keys(roleHierarchy);
    let created = 0;

    for (const [menuKey, minRole] of Object.entries(menuConfig)) {
      const minLevel = roleHierarchy[minRole] ?? 0;

      for (const role of allRoles) {
        const roleLevel = roleHierarchy[role];
        const isEnabled = roleLevel >= minLevel;

        await this.prisma.roleMenuPermission.create({
          data: {
            role,
            menuKey,
            isEnabled,
          },
        });
        created++;
      }
    }

    return created;
  }
}
