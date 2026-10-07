import { BadRequestException, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { MENU_REGISTRY, ROLE_LEVEL, ROLE_VALUES, type Role } from '@ths-thm/shared-types';
import { PrismaService } from '../../prisma/prisma.service';
import type { UpdatePermissionDto } from './dto/role-menu-permissions.dto';

export interface RoleMenuPermissionDto {
  id: string;
  role: string;
  menuKey: string;
  isEnabled: boolean;
}

@Injectable()
export class RoleMenuPermissionsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(RoleMenuPermissionsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Isi tabel dari MENU_REGISTRY saat aplikasi boot, supaya matriks tidak
   * kosong pada instalasi baru.
   *
   * Idempoten — `createMany` + `skipDuplicates` HANYA menambah pasangan
   * (role, menuKey) yang belum ada dan tidak pernah menimpa override
   * superadmin yang sudah tersimpan. Berbeda dengan guard `count() > 0`
   * yang lama, seed gagal di tengah jalan tidak membuat tabel permanen
   * setengah terisi: boot berikutnya melanjutkan yang kurang.
   *
   * Kegagalan di sini TIDAK boleh menggagalkan boot (DB mungkin sedang
   * tidak tersedia) — cukup dicatat sebagai warning.
   */
  async onApplicationBootstrap(): Promise<void> {
    // CI men-set SKIP_DB_CONNECT untuk swagger:export tanpa DB.
    if (process.env.SKIP_DB_CONNECT === 'true') return;

    try {
      const created = await this.seedFromMenuRegistry();
      if (created > 0) {
        this.logger.log(`Seed role-menu-permissions: ${created} baris baru dari MENU_REGISTRY`);
      }
    } catch (err) {
      this.logger.warn(`Seed role-menu-permissions dilewati: ${(err as Error)?.message ?? err}`);
    }
  }

  /**
   * Seed satu baris per (role, menuKey) dengan nilai default sesuai
   * hierarki role: `isEnabled = role >= minRole` — identik dengan
   * visibilitas sidebar sebelum ada tabel ini.
   *
   * @returns jumlah baris yang benar-benar dibuat (0 bila sudah lengkap)
   */
  async seedFromMenuRegistry(): Promise<number> {
    const rows = MENU_REGISTRY.flatMap((menu) =>
      ROLE_VALUES.map((role) => ({
        role,
        menuKey: menu.menuKey,
        isEnabled: ROLE_LEVEL[role] >= ROLE_LEVEL[menu.minRole],
      })),
    );

    const { count } = await this.prisma.roleMenuPermission.createMany({
      data: rows,
      skipDuplicates: true,
    });
    return count;
  }

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
   * Bulk update permissions for a role — dalam SATU transaksi: bila upsert
   * ke-n gagal di tengah jalan, perubahan sebelumnya ikut terbatalkan sehingga
   * matriks tidak pernah tersimpan separuh (setengah role ter-edit, sisanya
   * tidak) yang diam-diam mengubah visibilitas menu.
   */
  async bulkUpdate(role: string, permissions: Record<string, boolean>): Promise<number> {
    // Tolak role di luar enum — baris dengan role sampah tidak akan pernah
    // terbaca oleh matriks maupun sidebar, tapi tetap mengotori tabel.
    if (!ROLE_VALUES.includes(role as Role)) {
      throw new BadRequestException(`Role tidak dikenal: ${role}`);
    }

    const entries = Object.entries(permissions);
    if (entries.length === 0) return 0;

    return this.prisma.$transaction(async (tx) => {
      let updated = 0;
      for (const [menuKey, isEnabled] of entries) {
        await tx.roleMenuPermission.upsert({
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
    });
  }

}
