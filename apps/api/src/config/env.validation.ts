/* eslint-disable no-console */
import { parseDurationToMs } from '../common/utils/duration.util';
import { validateEnvWithZod, EnvConfig } from './env-schema';

// Validate and get typed config
const validated = validateEnvWithZod();

// Export the validated and typed flat config
export const envConfig: EnvConfig = validated;

// Legacy-shaped env object — preserves the original nested shape used
// throughout the codebase (env.jwtSecret, env.smtp, env.nodeEnv, ...).
// Built from the Zod-validated config so runtime checks stay in sync.
export const env = {
  port: validated.APP_PORT,
  nodeEnv: validated.NODE_ENV,
  databaseUrl: validated.DATABASE_URL,
  jwtSecret: validated.JWT_SECRET,
  jwtRefreshSecret: validated.JWT_REFRESH_SECRET,
  jwtExpiresIn: validated.JWT_EXPIRES_IN,
  jwtRefreshExpiresIn: validated.JWT_REFRESH_EXPIRES_IN,
  frontendUrl: validated.FRONTEND_URL,
  uploadDir: validated.UPLOAD_DIR,
  maxFileSize: validated.MAX_FILE_SIZE,
  throttleTtl: validated.THROTTLE_TTL,
  throttleLimit: validated.THROTTLE_LIMIT,
  apiKeys: validated.API_KEYS,
  smtp: {
    host: validated.SMTP_HOST,
    port: validated.SMTP_PORT,
    user: validated.SMTP_USER || '',
    pass: validated.SMTP_PASS || '',
  },
  redisUrl: validated.REDIS_URL || '',
  resendWebhookSecret: validated.RESEND_WEBHOOK_SECRET || '',
  defaultPassword: validated.DEFAULT_PASSWORD || '',
};

// Re-export validateEnv for backward compatibility
export { validateEnvWithZod as validateEnv };

// Re-export parseDurationToMs in case callers relied on it via this module
export { parseDurationToMs };
