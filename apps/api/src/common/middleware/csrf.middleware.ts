import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';

/**
 * Double-submit cookie CSRF protection middleware.
 *
 * - Generates a CSRF token on first request (if no token cookie exists)
 * - Validates token on state-changing methods (POST, PUT, PATCH, DELETE)
 * - Token is sent via:
 *   - Cookie: `csrf_token` (httpOnly=false, sameSite=lax)
 *   - Header: `X-CSRF-Token` (expected on state-changing requests)
 *
 * GET, HEAD, OPTIONS requests are exempt from validation.
 *
 * Auth endpoints (/auth/*) are exempt to avoid login deadlocks. The exemption
 * is prefix-aware because routes are served under the global prefix (default
 * `/api`), so the actual request path is `/api/auth/login`.
 *
 * Requests authenticated with a Bearer token are also exempt: the token lives
 * in `Authorization`, which a cross-site attacker cannot forge or read, so the
 * request is not vulnerable to CSRF. This keeps browser (Bearer + cookies) and
 * mobile clients working without requiring a CSRF header on every call.
 */
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const EXEMPT_PATHS = ['/auth/'];

function getApiPrefix(): string {
  const raw = (process.env.API_PREFIX || 'api').trim();
  const normalized = raw.replace(/^\/+|\/+$/g, '');
  return normalized ? `/${normalized}` : '';
}

/**
 * Ambil path lengkap dari request. Nest memasang middleware `forRoutes('*')`
 * per-route sehingga `req.path` bernilai '/' (baseUrl berisi path lengkap);
 * `req.originalUrl` selalu memuat path asli beserta query.
 */
function getRequestPath(req: Request): string {
  const raw = req.originalUrl || req.url || req.path || '/';
  return raw.split('?')[0].split('#')[0] || '/';
}

function stripApiPrefix(pathname: string): string {
  const prefix = getApiPrefix();
  if (!prefix) return pathname;
  if (pathname === prefix) return '/';
  return pathname.startsWith(`${prefix}/`) ? pathname.slice(prefix.length) : pathname;
}

function isExempt(req: Request): boolean {
  const pathname = stripApiPrefix(getRequestPath(req));
  return EXEMPT_PATHS.some(path => pathname.startsWith(path));
}

function hasBearerToken(req: Request): boolean {
  const auth = req.headers.authorization;
  return typeof auth === 'string' && /^Bearer\s+\S+/i.test(auth);
}

/**
 * Baca cookie tanpa ketergantungan cookie-parser (middleware ini berjalan
 * sebelum body/cookie parser Nest dan aplikasi tidak memasang cookie-parser).
 */
function parseCookieHeader(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() !== name) continue;
    const value = part.slice(idx + 1).trim();
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }
  return undefined;
}

function readCookie(req: Request, name: string): string | undefined {
  const parsed = (req.cookies as Record<string, string> | undefined)?.[name];
  return parsed ?? parseCookieHeader(req.headers.cookie, name);
}

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    // Skip CSRF check for safe methods, auth endpoints, and Bearer auth.
    if (SAFE_METHODS.has(req.method) || isExempt(req) || hasBearerToken(req)) {
      this.ensureCsrfToken(req, res);
      return next();
    }

    // Validate CSRF token on state-changing requests
    const cookieToken = readCookie(req, 'csrf_token');
    const headerToken = req.headers['x-csrf-token'] as string | undefined;

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      res.status(403).json({
        statusCode: 403,
        message: 'Invalid CSRF token',
        error: 'Forbidden',
      });
      return;
    }

    // Valid token - ensure cookie is refreshed
    this.ensureCsrfToken(req, res);
    next();
  }

  private ensureCsrfToken(req: Request, res: Response): void {
    // Only set cookie if not already present
    if (!readCookie(req, 'csrf_token')) {
      const token = crypto.randomBytes(32).toString('hex');
      res.cookie('csrf_token', token, {
        httpOnly: false, // Must be readable by JS to send in header
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        path: '/',
      });
    }
  }
}
