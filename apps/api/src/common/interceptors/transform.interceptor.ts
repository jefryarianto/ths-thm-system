import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  success: boolean;
  data?: T;
  message?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  meta?: Record<string, any>;
  timestamp?: string;
}

/**
 * Global response interceptor that normalises all API responses.
 *
 * Service methods no longer need to wrap results in `{ success, data, message }`.
 * The interceptor does that automatically, detecting the shape of the returned value:
 *
 * | Service returns | HTTP response body |
 * |----------------|-------------------|
 * | `entity` (object/primitive) | `{ success: true, data: entity }` |
 * | `{ data: [...], meta: {...} }` | `{ success: true, data: [...], meta: {...} }` |
 * | `{ data: entity, message: '...' }` | `{ success: true, data: entity, message: '...' }` |
 * | `{ message: '...' }` (no data) | `{ success: true, message: '...' }` |
 * | `void` / `null` / `undefined` | `{ success: true }` |
 * | Already has `success` property | Passes through unchanged |
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    return next.handle().pipe(
      map((data) => {
        const timestamp = new Date().toISOString();

        // ── 1. Already wrapped (backward compat with non-refactored services) ──
        if (data && typeof data === 'object' && 'success' in data) {
          return { ...data, timestamp } as Response<T>;
        }

        // ── 2. Paginated result from baseFindAll: { data: T[], meta } ──
        if (
          data &&
          typeof data === 'object' &&
          'data' in data &&
          'meta' in data &&
          Array.isArray(data.data)
        ) {
          return { success: true, data: data.data, meta: data.meta, timestamp } as Response<T>;
        }

        // ── 3. Mutate result (create / update): { data, message? } ──
        if (
          data &&
          typeof data === 'object' &&
          'data' in data &&
          !Array.isArray(data.data)
        ) {
          const result: Response<T> = { success: true, data: data.data, timestamp };
          if (data.message) result.message = data.message;
          return result;
        }

        // ── 4. Delete result: { message } (no data) ──
        if (
          data &&
          typeof data === 'object' &&
          'message' in data &&
          Object.keys(data).length === 1
        ) {
          return { success: true, message: data.message as string, timestamp };
        }

        // ── 5. Void / null / undefined ──
        if (data === null || data === undefined) {
          return { success: true, timestamp };
        }

        // ── 6. Bare data (entity, number, string, etc.) ──
        return { success: true, data, timestamp } as Response<T>;
      }),
    );
  }
}
