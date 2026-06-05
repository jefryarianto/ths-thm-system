import { Injectable, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { randomBytes } from 'crypto';
import { ScopedRequest } from '../interfaces/user-scope.interface';

/**
 * Metadata key for marking endpoints that accept API key authentication.
 */
export const API_KEY_AUTH_KEY = 'apiKeyAuth';

/**
 * Decorator to mark an endpoint as accessible via API key.
 * When applied, the endpoint will accept X-API-Key header
 * as an alternative to JWT authentication.
 */
export const ApiKeyAuth = () => (target: object, propertyKey?: string, descriptor?: PropertyDescriptor) => {
  if (descriptor) {
    Reflect.defineMetadata(API_KEY_AUTH_KEY, true, descriptor.value);
    return descriptor;
  }
  Reflect.defineMetadata(API_KEY_AUTH_KEY, true, target);
  return target;
};

/**
 * API key metadata configuration.
 */
export interface ApiKeyConfig {
  /** The API key value */
  key: string;
  /** The role to assign when this key is used */
  role: string;
  /** Human-readable description */
  description?: string;
  /** Optional scope overrides */
  scope?: {
    rantingId?: string;
    wilayahId?: string;
    distrikId?: string;
  };
}

/**
 * In-memory API key store.
 *
 * In production, replace with database-backed storage.
 * Keys are loaded from API_KEYS environment variable (JSON format).
 */
@Injectable()
export class ApiKeyStore {
  private readonly logger = new Logger('ApiKeyStore');
  private readonly keys = new Map<string, ApiKeyConfig>();

  constructor() {
    this.loadKeysFromEnv();
  }

  private loadKeysFromEnv(): void {
    const rawKeys = process.env.API_KEYS;
    if (!rawKeys) {
      this.logger.warn('No API_KEYS environment variable found. API key auth disabled.');
      return;
    }

    try {
      const parsed: ApiKeyConfig[] = JSON.parse(rawKeys);
      for (const config of parsed) {
        this.keys.set(config.key, config);
      }
      this.logger.log(`Loaded ${this.keys.size} API key(s) from environment`);
    } catch {
      this.logger.error('Failed to parse API_KEYS environment variable. Expected JSON array.');
    }
  }

  /**
   * Validate an API key and return its configuration.
   */
  validate(apiKey: string): ApiKeyConfig | undefined {
    return this.keys.get(apiKey);
  }

  /**
   * Register a new API key (for programmatic use or testing).
   */
  register(config: ApiKeyConfig): void {
    this.keys.set(config.key, config);
  }

  /**
   * Get all registered API keys (for management endpoint).
   */
  getAll(): Array<Omit<ApiKeyConfig, 'key'> & { keyPreview: string }> {
    return Array.from(this.keys.values()).map((config) => ({
      keyPreview: config.key.slice(0, 8) + '...' + config.key.slice(-4),
      role: config.role,
      description: config.description,
      scope: config.scope,
    }));
  }

  /**
   * Remove an API key.
   */
  remove(apiKey: string): boolean {
    return this.keys.delete(apiKey);
  }

  /**
   * Generate a new cryptographically random API key.
   */
  generateKey(): string {
    return randomBytes(32).toString('hex');
  }
}

/**
 * Guard that validates API key from X-API-Key header.
 *
 * When a valid API key is found:
 * 1. Attaches a synthetic user object with the key's role and scope
 * 2. Allows the request to pass through to subsequent guards
 *
 * When no API key is present:
 * - Falls through to JwtAuthGuard for normal JWT authentication
 *
 * Usage:
 *   Apply @ApiKeyAuth() decorator to endpoints that should accept API keys.
 *   Without the decorator, API keys are ignored (JWT required).
 */
@Injectable()
export class ApiKeyGuard {
  private readonly logger = new Logger('ApiKeyGuard');
  private readonly HEADER_NAME = 'x-api-key';

  constructor(
    private readonly reflector: Reflector,
    private readonly store: ApiKeyStore,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    // Check if endpoint requires API key auth
    const requiresApiKey = this.reflector.getAllAndOverride<boolean>(API_KEY_AUTH_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiresApiKey) {
      return true; // No API key required, let JwtAuthGuard handle
    }

    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers?.[this.HEADER_NAME] as string | undefined;

    if (!apiKey) {
      throw new UnauthorizedException('API key diperlukan (header: X-API-Key)');
    }

    const config = this.store.validate(apiKey);
    if (!config) {
      this.logger.warn(`Invalid API key attempt from ${request.ip || 'unknown'}`);
      throw new UnauthorizedException('API key tidak valid');
    }

    // Attach synthetic user for downstream guards (RolesGuard, ScopeGuard)
    request.user = {
      id: `apikey:${config.key.slice(0, 8)}`,
      email: `apikey@${config.description || 'integration'}`,
      role: config.role,
      rantingId: config.scope?.rantingId,
    };

    // Attach scope for service-level filtering
    if (config.scope) {
      request.scope = config.scope;
    }

    this.logger.debug(`API key authenticated: role=${config.role}, description=${config.description || 'none'}`);

    return true;
  }
}
