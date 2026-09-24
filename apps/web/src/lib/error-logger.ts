/**
 * Centralized Error Logger for THS-THM Web
 *
 * - Implements bounded error/operation taxonomy for structured logging.
 * - Sanitizes context to exclude tokens, cookies, Authorization, query strings, URLs.
 * - Silently ignores SESSION_EXPIRED errors (handled by session provider).
 * - Logs everything else with structured metadata to console (local only).
 * - Logging failures are isolated and never alter application behavior.
 * - Does NOT invoke apiClient to avoid logger->refresh->logger recursion risk.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type ErrorCategory =
  | 'Auth'
  | 'Network'
  | 'Timeout'
  | 'Validation'
  | 'Permission'
  | 'Server'
  | 'Unknown';

export type AuthErrorCategory =
  | 'Auth_expired'
  | 'Auth_invalid'
  | 'Auth_refresh_failed'
  | 'Auth';

export type ErrorOperation =
  | 'Login'
  | 'Refresh'
  | 'Logout'
  | 'Session_verify'
  | 'Api_request'
  | 'Session_expiry'
  | 'Unknown';

interface ErrorContext {
  module?: string;
  action?: string;
  userId?: string;
  requestId?: string;
  [key: string]: unknown;
}

/**
 * Check if an error is a session-expired error that should be silently ignored.
 * Preserves existing behavior: SESSION_EXPIRED_ERROR instance, or message includes
 * 'Session expired', 'Sesi berakhir', or 'Unauthorized'.
 */
function isSessionExpiredError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.name === 'SESSION_EXPIRED_ERROR' ||
      error.message.includes('Session expired') ||
      error.message.includes('Sesi berakhir') ||
      error.message.includes('Unauthorized')
    );
  }
  if (typeof error === 'string') {
    return (
      error.includes('Session expired') ||
      error.includes('Sesi berakhir') ||
      error.includes('Unauthorized')
    );
  }
  return false;
}

/**
 * Classify an error into a bounded taxonomy.
 * Returns the most specific category possible.
 */
export function classifyError(error: unknown): {
  category: ErrorCategory;
  authCategory?: AuthErrorCategory;
} {
  // Instance of known SESSION_EXPIRED_ERROR
  if (error instanceof Error && error.name === 'SESSION_EXPIRED_ERROR') {
    return { category: 'Auth', authCategory: 'Auth_expired' };
  }

  // Axios-like network error (has code but no response)
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    !(error as any).response
  ) {
    const code = (error as any).code as string | undefined;
    const message =
      typeof (error as any).message === 'string'
        ? (error as any).message
        : '';

    // Network-level timeout (ECONNABORTED)
    if (code === 'ECONNABORTED' || message.toLowerCase().includes('timeout')) {
      return { category: 'Timeout' };
    }

    // Generic network error
    if (
      code?.startsWith('ERR_NETWORK') ||
      code === 'ECONNABORTED' ||
      message.includes('Network Error') ||
      message.toLowerCase().includes('failed to fetch') ||
      message.toLowerCase().includes('net::err')
    ) {
      return { category: 'Network' };
    }

    // Fall through to Unknown for non-network axios errors with code but no response
  }

  // Axios HTTP error (has response with status)
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    (error as any).response !== null &&
    typeof (error as any).response?.status === 'number'
  ) {
    const status = (error as any).response.status;

    // Client errors
    if (status >= 400 && status < 500) {
      if (status === 401) {
        return { category: 'Auth', authCategory: 'Auth_invalid' };
      }
      if (status === 403) {
        return { category: 'Permission' };
      }
      if (status === 400 || status === 422) {
        return { category: 'Validation' };
      }
      return { category: 'Auth' }; // generic 4xx auth-ish
    }

    // Server errors
    if (status >= 500) {
      return { category: 'Server' };
    }
  }

  // Plain Error or string: check message for known patterns
  if (error instanceof Error || typeof error === 'string') {
    const msg =
      error instanceof Error ? error.message : (error as string).toLowerCase();

    if (
      msg.includes('Session expired') ||
      msg.includes('Sesi berakhir') ||
      msg === 'SESSION_EXPIRED_ERROR'
    ) {
      return { category: 'Auth', authCategory: 'Auth_expired' };
    }

    if (msg.includes('Unauthorized')) {
      return { category: 'Auth', authCategory: 'Auth_invalid' };
    }

    // Could refine further, but keep conservative
  }

  // Default fallback
  return { category: 'Unknown' };
}

/**
 * Redact sensitive tokens/credentials from arbitrary text before logging.
 * Handles JWTs, Bearer tokens, and common sensitive query parameters.
 */
function redactSensitive(text: string): string {
  return text
    // Standalone JWT (three base64url segments)
    .replace(/\b[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, '[JWTTokenRedacted]')
    // Bearer <token>
    .replace(/Bearer\s+[A-Za-z0-9\-_.=]+/g, '[BearerTokenRedacted]')
    // Sensitive query params (with or without leading ? or &)
    .replace(/(access_token|refresh_token|id_token|token|apikey|api_key|secret)=[^&\s]+/g, '$1=[Redacted]')
    // Generic query params known to carry identity/session context
    .replace(/([?&](?:code|state|session_id|tab_id|user_id|request_id|refresh_token|access_token)=)[^&\s]+/g, '$1[Redacted]')
    // Authorization / Cookie header values
    .replace(/(Authorization|authorization):\s*[^\r\n]+/g, '$1: [Redacted]')
    .replace(/(Cookie|Set-Cookie|cookie|set-cookie):\s*[^\r\n]+/g, '$1: [Redacted]');
}

/**
 * Build a safe metadata object from context, keeping only predefined,
 * demonstrably safe keys. Any other keys (possible tokens, identifiers,
 * URLs, bodies) are dropped before reaching the log output.
 */
function safeContext(context?: ErrorContext): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  if (!context) {
    return safe;
  }
  const allowedKeys = ['module', 'action', 'operation', 'status', 'code', 'retryable'];
  for (const key of allowedKeys) {
    if (key in context && context[key] !== undefined) {
      safe[key] = context[key];
    }
  }
  return safe;
}

/**
 * Format error for structured logging with data minimization.
 * Only safe, predefined context keys are preserved.
 * Error message and stack are lightly redacted to remove token-like patterns.
 */
function formatError(error: unknown, context?: ErrorContext): Record<string, unknown> {
  const entry: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    level: 'error',
  };

  // Add classification
  const classification = classifyError(error);
  entry.category = classification.category;
  if (classification.authCategory) {
    entry.authCategory = classification.authCategory;
  }

  // Safe context keys only (allowlist)
  Object.assign(entry, safeContext(context));

  // Format error details with redaction
  if (error instanceof Error) {
    entry.errorName = error.name;
    entry.message = redactSensitive(error.message);

    if (error.stack) {
      entry.stack = redactSensitive(error.stack).split('\n').slice(0, 5).join('\n');
    }
  } else if (typeof error === 'string') {
    entry.message = redactSensitive(error);
  } else {
    entry.message = redactSensitive(String(error));
  }

  return entry;
}

/**
 * Main error logging function.
 * Silently ignores SESSION_EXPIRED errors (handled by session provider).
 * Logging failures are isolated and never alter application behavior.
 */
export function logError(
  error: unknown,
  context?: ErrorContext,
): void {
  // Silently ignore session expired errors (preserve existing behavior)
  if (isSessionExpiredError(error)) {
    return;
  }

  // Isolated logging: never throw, never alter control flow
  try {
    const entry = formatError(error, context);

    // Log to console with structured format
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
      // In production, use structured JSON format
      console.error(JSON.stringify(entry));
    } else {
      // In development, use readable format
      console.error(
        `[${context?.module || 'App'}] ${entry.message}${entry.stack ? '\n' + entry.stack : ''}`,
      );
    }
  } catch (loggingError) {
    // If logging itself fails, swallow silently to preserve original error flow
    // In development, we might want to know, but never at cost of breaking app
    if (
      typeof window !== 'undefined' &&
      process.env.NODE_ENV !== 'production' &&
      typeof console !== 'undefined'
    ) {
      // Dev-only fallback: log the logging failure but not the original error
      try {
        console.error('[ErrorLogger] Failed to log error:', loggingError);
      } catch {
        // If even this fails, give up completely
      }
    }
  }
}

/**
 * Warning logging function.
 */
export function logWarning(
  message: string,
  context?: ErrorContext,
): void {
  try {
    const entry: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      level: 'warn',
      message: redactSensitive(message),
      ...safeContext(context),
    };

    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
      console.warn(JSON.stringify(entry));
    } else {
      console.warn(`[${context?.module || 'App'}] ${redactSensitive(message)}`);
    }
  } catch {
    // Swallow logging failures
  }
}

/**
 * Info logging function.
 */
export function logInfo(
  message: string,
  context?: ErrorContext,
): void {
  if (process.env.NODE_ENV !== 'production') {
    try {
      const entry: Record<string, unknown> = {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: redactSensitive(message),
        ...safeContext(context),
      };
      console.log(`[${context?.module || 'App'}] ${redactSensitive(message)}`);
    } catch {
      // Swallow logging failures
    }
  }
}

/**
 * Create a scoped logger for a specific module.
 * Usage: const logger = createModuleLogger('Members');
 *        logger.error(error, { action: 'fetch' });
 */
export function createModuleLogger(moduleName: string) {
  return {
    error: (error: unknown, action?: string) =>
      logError(error, { module: moduleName, action }),
    warn: (message: string, action?: string) =>
      logWarning(message, { module: moduleName, action }),
    info: (message: string, action?: string) =>
      logInfo(message, { module: moduleName, action }),
  };
}

export default {
  error: logError,
  warn: logWarning,
  info: logInfo,
  createModuleLogger,
};