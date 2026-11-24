import type { Role } from '@/types';
import { MODULE_PERMISSIONS } from '@/components/auth/can';
import { getModuleKey } from '@/components/layout/navigation';
import {
  DASHBOARD_ROLES,
  hasMinRoleForRole,
  hasRoleForRole,
} from '@/lib/role-permissions';

interface ViewPermission {
  view?: Role;
  allowedRoles?: Role[];
}

const permissions = MODULE_PERMISSIONS as Record<string, ViewPermission>;

function getPermissionModuleKey(pathname: string): string | null {
  if (pathname.startsWith('/galeri/manage')) return 'galeriManage';
  if (pathname.startsWith('/content/berita')) return 'berita';
  return getModuleKey(pathname);
}

export function canAccessPathForRole(
  role: Role | string | null | undefined,
  path: string | null | undefined,
): boolean {
  if (!path) return true;

  const pathname = path.split(/[?#]/, 1)[0];
  if (pathname === '/dashboard') {
    return hasRoleForRole(role, DASHBOARD_ROLES);
  }

  const moduleKey = getPermissionModuleKey(pathname);
  if (!moduleKey) return true;

  const permission = permissions[moduleKey];
  if (!permission) return true;

  if (permission.view && hasMinRoleForRole(role, permission.view)) return true;
  if (permission.allowedRoles && hasRoleForRole(role, permission.allowedRoles)) return true;
  return false;
}
