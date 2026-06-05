import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from '../services/audit.service';
import { ScopedRequest } from '../interfaces/user-scope.interface';

/**
 * HTTP methods that perform data mutations.
 */
const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Interceptor that logs data access and mutation events for audit purposes.
 *
 * Captures:
 * - Request method, path, and user context
 * - Response status code and duration
 * - Classifies as DATA_ACCESS (GET) or DATA_MUTATION (POST/PUT/PATCH/DELETE)
 *
 * Excluded paths (health checks, static assets, docs) are not logged
 * to reduce noise in audit logs.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger('AuditInterceptor');

  /** Paths to exclude from audit logging */
  private readonly excludedPaths = ['/health', '/api/docs', '/api/docs-json'];

  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<ScopedRequest>();
    const response = context.switchToHttp().getResponse();
    const method = request.method ?? 'UNKNOWN';
    const url = request.url ?? 'UNKNOWN';

    // Skip excluded paths
    if (this.excludedPaths.some((p) => url.startsWith(p))) {
      return next.handle();
    }

    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const durationMs = Date.now() - startTime;
          const statusCode = response.statusCode;
          const user = request.user;

          const baseParams = {
            userId: user?.id,
            userEmail: user?.email,
            userRole: user?.role,
            method,
            path: url,
            statusCode: statusCode as number,
            durationMs,
          };

          if (MUTATION_METHODS.has(method)) {
            this.auditService.logDataMutation(baseParams);
          } else {
            this.auditService.logDataAccess(baseParams);
          }
        },
        error: (error) => {
          const durationMs = Date.now() - startTime;
          const statusCode = response.statusCode || 500;
          const user = request.user;

          const baseParams = {
            userId: user?.id,
            userEmail: user?.email,
            userRole: user?.role,
            method,
            path: url,
            statusCode: statusCode as number,
            durationMs,
          };

          // Log errors to audit store (except scope violations — already logged by ScopeGuard)
          if (statusCode !== 403) {
            this.auditService.logDataMutation({
              ...baseParams,
              details: { error: error?.message || 'unknown error' },
            });
          }
        },
      }),
    );
  }
}
