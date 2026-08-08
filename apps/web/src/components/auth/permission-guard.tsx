'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ShieldAlert, ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { MODULE_PERMISSIONS } from './can';
import type { ModulePermission } from './can';
import type { Role } from '@/types';

interface PermissionGuardProps {
  module: string;
  action?: keyof ModulePermission;
  children: ReactNode;
  negate?: boolean;
  fallback?: ReactNode;
}

/**
 * Route-level permission guard.
 * Shows a 403 page when the user lacks access.
 */
export function PermissionGuard({
  module,
  action = 'view',
  children,
  negate = false,
  fallback,
}: PermissionGuardProps) {
  const { hasMinRole, role, isAuthenticated } = useAuth();
  const [mounted, setMounted] = useState(false);

  // The user's role is only known after client hydration (useAuth reads
  // localStorage, which doesn't exist during SSR). Before that, show a
  // neutral loading placeholder instead of a misleading "Akses Ditolak"
  // flash (or an empty content area) on every refresh.
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <PageLoadingPlaceholder />;

  const perms = MODULE_PERMISSIONS[module];
  const requiredRole = perms?.[action];
  let allowed = false;

  if (requiredRole) {
    allowed = hasMinRole(requiredRole);
  }

  if (negate) allowed = !allowed;

  if (allowed) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <AccessDenied
      role={role}
      isAuthenticated={isAuthenticated}
      module={module}
      requiredRole={requiredRole}
    />
  );
}

// ─── Loading Placeholder (pre-hydration) ───

function PageLoadingPlaceholder() {
  return (
    <div
      className="flex items-center justify-center min-h-[50vh]"
      role="status"
      aria-label="Memuat halaman"
    >
      <div className="flex flex-col items-center gap-3">
        <Loader2 size={28} className="text-blue-500 animate-spin" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Memuat...</p>
      </div>
    </div>
  );
}

// ─── Access Denied Page ───

function AccessDenied({
  role,
  isAuthenticated,
  module,
  requiredRole,
}: {
  role: Role | null;
  isAuthenticated: boolean;
  module: string;
  requiredRole?: Role;
}) {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="text-center max-w-md">
        <div className="mx-auto w-16 h-16 bg-red-50 dark:bg-red-950 rounded-full flex items-center justify-center mb-4">
          <ShieldAlert size={32} className="text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Akses Ditolak
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          {!isAuthenticated
            ? 'Silakan login untuk mengakses halaman ini.'
            : role
              ? 'Role "' + role + '" tidak memiliki izin untuk mengakses modul "' + module + '".'
              : 'Anda tidak memiliki izin untuk mengakses halaman ini.'}
        </p>

        {requiredRole && (
          <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3 text-sm text-amber-700 dark:text-amber-400 mb-6">
            <p className="font-medium">
              Diperlukan minimal role: <strong>{requiredRole}</strong>
            </p>
            <p className="text-xs mt-1">
              Role Anda saat ini: <strong>{role || '-'}</strong>
            </p>
          </div>
        )}

        <div className="flex items-center justify-center gap-3">
          <Link
            href="/members"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
          >
            <ArrowLeft size={16} />
            Kembali ke Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
