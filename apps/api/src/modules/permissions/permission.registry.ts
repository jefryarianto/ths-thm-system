// Route prefix -> module key mapping
export const ROUTE_MODULE_MAP: Record<string, string> = {
  '/members': 'members',
  '/org-members': 'members',
  '/orgs': 'orgs',
  '/documents': 'documents',
  '/org-documents': 'documents',
  '/settings': 'settings',
  '/jabatan': 'settings',
  '/users': 'users',
};

// HTTP method -> action key suffix
export const HTTP_ACTION_MAP: Record<string, string> = {
  GET: 'view',
  POST: 'create',
  PUT: 'edit',
  PATCH: 'edit',
  DELETE: 'delete',
};

/** Resolve permission key from request */
import { Request } from 'express';
export function resolvePermissionKey(req: Request, path: string): string | null {
  const module = ROUTE_MODULE_MAP[path];
  if (!module) return null;
  const method = req.method || 'GET';
  const action = HTTP_ACTION_MAP[method] || 'view';
  return `${module}:${action}`;
}
