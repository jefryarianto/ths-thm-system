import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { requestContextStore, getRequestId } from '../utils/request-context';
import { structuredLog } from '../utils/structured-logger';

/**
 * Middleware untuk multi-tenancy: mengekstrak distrikId dari user yang terautentikasi
 * dan menyimpannya ke AsyncLocalStorage untuk digunakan oleh Prisma Client Extension.
 * 
 * Middleware ini harus dijalankan SETELAH authentication middleware (JwtAuthGuard)
 * sehingga user sudah tersedia di request.
 */
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    // distrikId akan diset oleh JwtStrategy.validate() setelah user terautentikasi
    // Di sini kita hanya memastikan context sudah ada dan meneruskan ke next()
    
    const startedAt = Date.now();
    const requestId = getRequestId();
    
    // Context sudah dijalankan oleh RequestContextMiddleware
    // Kita hanya perlu memastikan distrikId termap ke context
    
    next();
  }
}

/**
 * Helper untuk mendapatkan distrikId dari context saat ini
 * Bisa digunakan di service/repository untuk manual filtering jika perlu
 */
export function getCurrentDistrikId(): string | null {
  const ctx = requestContextStore.getStore();
  return ctx?.distrikId ?? null;
}

/**
 * Helper untuk mendapatkan userId dari context saat ini
 */
export function getCurrentUserId(): string | null {
  const ctx = requestContextStore.getStore();
  return ctx?.userId ?? null;
}

/**
 * Helper untuk menjalankan operasi dalam konteks tenant tertentu
 * Berguna untuk background jobs, cron, atau operasi admin yang perlu
 * memaksakan tenant context
 */
export function runWithTenantContext<T>(
  distrikId: string,
  userId: string,
  fn: () => T
): T {
  const ctx = requestContextStore.getStore();
  const originalDistrikId = ctx?.distrikId;
  const originalUserId = ctx?.userId;
  
  try {
    if (ctx) {
      ctx.distrikId = distrikId;
      ctx.userId = userId;
    }
    return fn();
  } finally {
    if (ctx) {
      ctx.distrikId = originalDistrikId;
      ctx.userId = originalUserId;
    }
  }
}