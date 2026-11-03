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
 * Auth endpoints (/auth/*) are exempt to avoid login deadlocks.
 */
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const EXEMPT_PATHS = ['/auth/'];

function isExempt(req: Request): boolean {
  return EXEMPT_PATHS.some(path => req.path.startsWith(path));
}

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    // Skip CSRF check for safe methods and exempt paths
    if (SAFE_METHODS.has(req.method) || isExempt(req)) {
      this.ensureCsrfToken(req, res);
      return next();
    }

    // Validate CSRF token on state-changing requests
    const cookieToken = req.cookies?.csrf_token;
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
    if (!req.cookies?.csrf_token) {
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