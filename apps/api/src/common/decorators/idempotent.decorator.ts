import { SetMetadata } from '@nestjs/common';

export const IDEMPOTENT_METADATA_KEY = 'IDEMPOTENT_OPTIONS';

export interface IdempotentOptions {
  /**
   * Time-to-live for the cached idempotent response in milliseconds.
   * Default: 300,000 ms (5 minutes).
   */
  ttl?: number;

  /**
   * Whether the idempotency key header is required for this route.
   * If true and header is missing, throws BadRequestException.
   * Default: false (if omitted, route executes normally without idempotency caching).
   */
  required?: boolean;

  /**
   * Custom header name for the idempotency key.
   * Default: 'x-idempotency-key' (also accepts 'idempotency-key').
   */
  headerName?: string;
}

/**
 * Decorator to enable idempotency on controller endpoints.
 * Protects mutating requests against duplicates, double-clicks, and network retry issues.
 */
export const Idempotent = (options: IdempotentOptions = {}) =>
  SetMetadata(IDEMPOTENT_METADATA_KEY, options);
