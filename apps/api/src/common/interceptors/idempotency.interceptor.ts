import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
  ConflictException,
  Logger,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CacheService } from '../services/cache.service';
import { IDEMPOTENT_METADATA_KEY, IdempotentOptions } from '../decorators/idempotent.decorator';

interface IdempotencyCacheEntry {
  status: 'processing' | 'completed';
  response?: unknown;
  statusCode?: number;
}

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly logger = new Logger(IdempotencyInterceptor.name);
  private static readonly DEFAULT_TTL_MS = 300_000; // 5 minutes
  private static readonly PROCESSING_LOCK_TTL_MS = 30_000; // 30 seconds

  constructor(
    private readonly reflector: Reflector,
    @Optional() private readonly cache?: CacheService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<{
      headers: Record<string, string | string[] | undefined>;
      method: string;
      path: string;
      ip?: string;
      user?: { id?: string };
    }>();
    const res = http.getResponse<{
      setHeader: (name: string, value: string) => void;
      statusCode?: number;
      status?: (code: number) => void;
    }>();

    if (!req || !res) {
      return next.handle();
    }

    const options = this.reflector.getAllAndOverride<IdempotentOptions>(IDEMPOTENT_METADATA_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If endpoint is not decorated with @Idempotent and no global check is desired,
    // still check if client sent X-Idempotency-Key for optional idempotency support.
    const customHeader = options?.headerName?.toLowerCase();
    const rawKey =
      (customHeader ? (req.headers[customHeader] as string) : undefined) ||
      (req.headers['x-idempotency-key'] as string) ||
      (req.headers['idempotency-key'] as string);

    const idempotencyKey = Array.isArray(rawKey) ? rawKey[0] : rawKey;

    if (options?.required && !idempotencyKey) {
      throw new BadRequestException('Header Idempotency-Key diperlukan untuk operasi ini');
    }

    if (!idempotencyKey || !this.cache) {
      return next.handle();
    }

    const tracker = req.user?.id || req.ip || 'anonymous';
    const storageKey = `idempotency:${tracker}:${req.method}:${req.path}:${idempotencyKey}`;
    const ttl = options?.ttl ?? IdempotencyInterceptor.DEFAULT_TTL_MS;

    const cached = this.cache.get<IdempotencyCacheEntry>(storageKey);

    if (cached) {
      if (cached.status === 'processing') {
        throw new ConflictException(
          'Permintaan dengan Idempotency-Key ini sedang diproses. Silakan coba kembali sesaat lagi.',
        );
      }

      if (cached.status === 'completed') {
        if (typeof res.setHeader === 'function') {
          res.setHeader('X-Idempotency-Hit', 'true');
        }
        if (cached.statusCode && typeof res.status === 'function') {
          res.status(cached.statusCode);
        }
        return of(cached.response);
      }
    }

    // Set lock entry with 30s TTL to prevent concurrent duplicates
    this.cache.set(
      storageKey,
      { status: 'processing' },
      IdempotencyInterceptor.PROCESSING_LOCK_TTL_MS,
    );

    return next.handle().pipe(
      tap({
        next: (responseBody) => {
          this.cache?.set(
            storageKey,
            {
              status: 'completed',
              response: responseBody,
              statusCode: res.statusCode || 200,
            },
            ttl,
          );
        },
        error: () => {
          // Release lock immediately on error so retries can proceed
          this.cache?.del(storageKey);
        },
      }),
    );
  }
}
