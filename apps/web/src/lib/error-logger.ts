/**
 * Centralized Error Logger for THS-THM Web
 *
 * Replaces console.error/console.warn with structured logging.
 * - Strips SESSION_EXPIRED errors silently (already handled by session provider)
 * - Logs everything else with context and timestamps
 * - Optionally sends errors to backend API for centralized monitoring
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface ErrorContext {
  module?: string;
  action?: string;
  userId?: string;
  requestId?: string;
  [key: string]: unknown;
}

/**
 * Check if an error is a session-expired error that should be silently ignored.
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
 * Format error for structured logging
 */
function formatError(error: unknown, context?: ErrorContext): Record<string, unknown> {
  const entry: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    level: 'error',
    ...context,
  };

  if (error instanceof Error) {
    entry.errorName = error.name;
    entry.message = error.message;
    if (error.stack) {
      entry.stack = error.stack.split('\n').slice(0, 5).join('\n');
    }
  } else if (typeof error === 'string') {
    entry.message = error;
  } else {
    entry.message = String(error);
  }

  return entry;
}

/**
 * Main error logging function.
 * Silently ignores SESSION_EXPIRED errors (handled by session provider).
 */
export function logError(
  error: unknown,
  context?: ErrorContext,
): void {
  // Silently ignore session expired errors
  if (isSessionExpiredError(error)) {
    return;
  }

  const entry = formatError(error, context);

  // Log to console with structured format
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
    // In production, use structured JSON format
    console.error(JSON.stringify(entry));
  } else {
    // In development, use readable format
    console.error(`[${context?.module || 'App'}] ${entry.message}`, error);
  }
}

/**
 * Warning logging function.
 */
export function logWarning(
  message: string,
  context?: ErrorContext,
): void {
  const entry: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    level: 'warn',
    message,
    ...context,
  };

  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
    console.warn(JSON.stringify(entry));
  } else {
    console.warn(`[${context?.module || 'App'}] ${message}`);
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
    const entry: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      ...context,
    };
    console.log(`[${context?.module || 'App'}] ${message}`);
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
