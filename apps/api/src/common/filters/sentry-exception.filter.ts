import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import * as Sentry from '@sentry/node';

/**
 * Global exception filter that reports unhandled exceptions to Sentry.
 *
 * Only reports 5xx server errors — 4xx client errors (validation,
 * auth, not-found) are intentionally excluded to avoid noise.
 *
 * This filter is registered in main.ts and does NOT write the HTTP
 * response.  It only captures the exception for Sentry.  The default
 * NestJS exception handling (or a separate response filter) produces
 * the HTTP response body.
 */
@Catch()
export class SentryExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();

    // Determine actual HTTP status code
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Only capture server-side errors (5xx)
    // 4xx errors are intentional client errors — no need to alert
    if (status >= 500) {
      Sentry.captureException(exception, {
        extra: {
          method: ctx.getRequest()?.method,
          url: ctx.getRequest()?.url,
          headers: this.sanitizeHeaders(ctx.getRequest()?.headers),
        },
      });
    }
  }

  /**
   * Strip sensitive headers before sending to Sentry.
   */
  private sanitizeHeaders(headers: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
    if (!headers) return undefined;
    const sensitive = ['authorization', 'cookie', 'x-api-key', 'set-cookie'];
    const sanitized = { ...headers };
    for (const key of sensitive) {
      if (sanitized[key]) {
        sanitized[key] = '[REDACTED]';
      }
    }
    return sanitized;
  }
}
