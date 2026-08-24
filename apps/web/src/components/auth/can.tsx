'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '@/hooks/use-auth';
import type { Role } from '@/types';

// ─── Module Permission Levels ───

/**
 * Defines which roles can perform which actions on each module.
 *
 * - `view`:  minimum role level required to see the page/list
 * - `create`: minimum role level to show the "Add" button
 * - `edit`:   minimum role level to show the "Edit" button
 * - `delete`: minimum role level to show the "Delete" button
 * - `export`: minimum role level to show the "Export" button
 * - `admin`:  minimum role level to access admin-only pages (users, settings, etc.)
 */
export interface ModulePermission {
  view?: Role;
  create?: Role;
  edit?: Role;
  delete?: Role;
  export?: Role;
  admin?: Role;
}

/**
 * Default permissions - most modules require at least admin_ranting
 * to create/edit/delete, but view is open to everyone.
 */
const DEFAULT_MODULE: ModulePermission = {
  view: 'anggota',
  create: 'admin_ranting',
  edit: 'admin_ranting',
  delete: 'admin_ranting',
  export: 'anggota',
};

export const MODULE_PERMISSIONS: Record<string, ModulePermission> = {
  members:          { ...DEFAULT_MODULE },
  // admin_kegiatan memasukkan calon anggota ke pendadaran (alur langkah 4)
  candidates:       { ...DEFAULT_MODULE, create: 'admin_kegiatan' },
  registrations:    { ...DEFAULT_MODULE },
  trainings:        { ...DEFAULT_MODULE, view: 'anggota' },
  // Activity-scoped: admin_kegiatan can manage kegiatan they're assigned to
  graduations:      { ...DEFAULT_MODULE, view: 'admin_kegiatan', create: 'admin_kegiatan', edit: 'admin_kegiatan', delete: 'admin_kegiatan' },
  examiners:        { ...DEFAULT_MODULE, create: 'penguji', edit: 'penguji', delete: 'admin_ranting' },
  activities:       { ...DEFAULT_MODULE, view: 'anggota' },
  dues:             { ...DEFAULT_MODULE, view: 'anggota' },
  payments:         { ...DEFAULT_MODULE, admin: 'admin_distrik' },
  claims:           { ...DEFAULT_MODULE },
  approvals:        { ...DEFAULT_MODULE },
  documents:        { ...DEFAULT_MODULE, view: 'anggota' },
  letters:          { ...DEFAULT_MODULE },
  // Activity-scoped: penguji can manage assessments for kegiatan they're assigned to
  assessments:      { ...DEFAULT_MODULE, view: 'penguji', create: 'penguji', edit: 'penguji' },
  notifications:    { ...DEFAULT_MODULE, export: 'admin_ranting' },
  reports:          { ...DEFAULT_MODULE, admin: 'admin_ranting' },
  'org-chart':      { view: 'anggota', admin: 'admin_ranting' },
  'org-documents':  { view: 'anggota', create: 'admin_ranting', edit: 'admin_ranting' },
  calendar:         { ...DEFAULT_MODULE, view: 'anggota' },
  chat:             { ...DEFAULT_MODULE, view: 'anggota' },
  forum:            { ...DEFAULT_MODULE, view: 'anggota', admin: 'admin_distrik' },
  'scan-stats':     { ...DEFAULT_MODULE, admin: 'admin_ranting' },
  users:            { view: 'admin_ranting', create: 'superadmin', edit: 'superadmin', delete: 'superadmin' },
  settings:         { view: 'admin_ranting', create: 'admin_ranting', edit: 'admin_ranting', delete: 'admin_ranting' },
  auditLogs:        { view: 'superadmin', admin: 'superadmin' },
  gamification:     { view: 'anggota', create: 'admin_kegiatan', edit: 'admin_kegiatan', delete: 'admin_ranting' },
  wsMonitor:        { view: 'superadmin', admin: 'superadmin' },
  queues:           { view: 'superadmin', admin: 'superadmin' },
  monitoring:       { view: 'admin_ranting', admin: 'admin_ranting' },
  admin:            { view: 'superadmin', admin: 'superadmin' },
};

// ─── Can Component ───

interface CanProps {
  /** Module name key - looks up permissions from MODULE_PERMISSIONS */
  module?: string;
  /** Action to check: 'view' | 'create' | 'edit' | 'delete' | 'export' | 'admin' */
  action?: 'view' | 'create' | 'edit' | 'delete' | 'export' | 'admin';
  /** Alternatively, pass explicit minimum role */
  minRole?: Role;
  /** Alternatively, pass exact role(s) allowed */
  roles?: Role[];
  /** If true, render children for roles that do NOT match */
  negate?: boolean;
  /** Fallback content to render when not allowed */
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Conditionally renders children based on the current user's role.
 *
 * @example
 * ```tsx
 * // Show "Add Member" button only to admin_ranting+
 * <Can module="members" action="create">
 *   <Link href="/members/new">Tambah Anggota</Link>
 * </Can>
 *
 * // Show "Edit" button only to admin_ranting+
 * <Can module="members" action="edit">
 *   <button onClick={handleEdit}>Edit</button>
 * </Can>
 *
 * // Show fallback for non-admin users
 * <Can module="users" action="edit" fallback={<span>Hanya admin</span>}>
 *   <DeleteButton />
 * </Can>
 *
 * // Using explicit minRole
 * <Can minRole="admin_ranting">
 *   <AdminPanel />
 * </Can>
 *
 * // Using exact roles
 * <Can roles={['penguji', 'admin_kegiatan']}>
 *   <AssessmentsPanel />
 * </Can>
 *
 * // Negation - show only to non-members
 * <Can module="examiners" action="create" negate>
 *   <ReadOnlyMessage />
 * </Can>
 * ```
 */
export function Can({ module, action = 'view', minRole, roles, negate = false, fallback = null, children }: CanProps) {
  const { hasMinRole, hasRole } = useAuth();
  const [mounted, setMounted] = useState(false);

  // Same hydration gate as PermissionGuard: the role is only known after
  // client mount (localStorage is unavailable during SSR), so render nothing
  // until then instead of flashing fallback/denied content on refresh.
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  let allowed = false;

  if (roles) {
    // Exact role match
    allowed = hasRole(roles);
  } else if (minRole) {
    // Minimum role level
    allowed = hasMinRole(minRole);
  } else if (module) {
    // Lookup from module permissions
    const perms = MODULE_PERMISSIONS[module];
    const requiredRole = perms?.[action];
    if (requiredRole) {
      allowed = hasMinRole(requiredRole);
    } else {
      // No explicit permission defined - deny by default
      allowed = false;
    }
  } else {
    // No conditions - allow
    allowed = true;
  }

  if (negate) allowed = !allowed;
  return allowed ? <>{children}</> : <>{fallback}</>;
}

// ─── CanButton (shortcut for common button patterns) ───

interface CanButtonProps {
  module: string;
  action?: 'create' | 'edit' | 'delete' | 'export';
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Shorthand for Can with a specific module + action.
 */
export function CanCreate({ module, children, fallback }: CanButtonProps) {
  return <Can module={module} action="create" fallback={fallback}>{children}</Can>;
}

export function CanEdit({ module, children, fallback }: CanButtonProps) {
  return <Can module={module} action="edit" fallback={fallback}>{children}</Can>;
}

export function CanDelete({ module, children, fallback }: CanButtonProps) {
  return <Can module={module} action="delete" fallback={fallback}>{children}</Can>;
}

export function CanExport({ module, children, fallback }: CanButtonProps) {
  return <Can module={module} action="export" fallback={fallback}>{children}</Can>;
}

export function CanAdmin({ module, children, fallback }: CanButtonProps) {
  return <Can module={module} action="admin" fallback={fallback}>{children}</Can>;
}
