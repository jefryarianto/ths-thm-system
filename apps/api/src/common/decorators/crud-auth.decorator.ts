import { applyDecorators, SetMetadata } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { ROLES_KEY } from './roles.decorator';
import { SCOPE_KEY, ScopeLevel } from './scope.decorator';

/**
 * Options for the @CrudAuth decorator.
 */
export interface CrudAuthOptions {
  /** Minimum scope level (default: 'branch'). */
  scope?: ScopeLevel;
  /** Swagger operation summary. */
  summary?: string;
}

/**
 * Composite decorator that applies @Roles, @RequireScope, and optionally
 * @ApiOperation in a single call — replacing 2-3 lines of boilerplate
 * per endpoint with one line.
 *
 * ## Usage
 *
 * ```ts
 * // Before (3 lines):
 * @Roles('superadmin', 'admin_distrik')
 * @RequireScope('branch')
 * @ApiOperation({ summary: 'Ambil data' })
 *
 * // After (1 line):
 * @CrudAuth('superadmin', 'admin_distrik', { summary: 'Ambil data' })
 * ```
 *
 * The first arguments are role names (strings). The last argument can be
 * an options object with `scope` (default: 'branch') and `summary`.
 *
 * @example
 *   @CrudAuth('superadmin', 'admin_distrik')
 *   @CrudAuth('superadmin', { scope: 'district' })
 *   @CrudAuth('superadmin', 'admin_distrik', { scope: 'branch', summary: 'Ambil data' })
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function CrudAuth(...args: any[]): MethodDecorator {
  // Separate string roles from the optional options object
  const roles: string[] = args.filter((a: unknown) => typeof a === 'string');
  const last = args[args.length - 1];
  const opts: CrudAuthOptions =
    last && typeof last === 'object' && !Array.isArray(last) ? (last as CrudAuthOptions) : {};

  const decorators: Array<ClassDecorator | MethodDecorator | PropertyDecorator> = [
    SetMetadata(ROLES_KEY, roles),
    SetMetadata(SCOPE_KEY, opts.scope || 'branch'),
  ];

  if (opts.summary) {
    decorators.push(ApiOperation({ summary: opts.summary }));
  }

  return applyDecorators(...decorators);
}
