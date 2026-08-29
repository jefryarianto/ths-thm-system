import { z } from 'zod';

/**
 * Zod schema for environment variable validation.
 * Defines all required and optional environment variables with their types and constraints.
 */

const durationSchema = z.string().regex(/^\d+[smhd]$/, {
  message: 'Duration must be in format like "15m", "7d", "1h", "30s" (number followed by s/m/h/d)',
});

const baseEnvSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  APP_PORT: z.coerce.number().int().positive().default(3001),
  API_PREFIX: z.string().default('api'),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  CORS_ORIGINS: z.string().optional(),

  // Database
  DATABASE_URL: z.string().url(),

  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: durationSchema.default('15m'),
  JWT_REFRESH_EXPIRES_IN: durationSchema.default('14d'),

  // Upload
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_FILE_SIZE: z.coerce.number().int().positive().default(10485760), // 10MB

  // Throttling
  THROTTLE_TTL: z.coerce.number().int().positive().default(60),
  THROTTLE_LIMIT: z.coerce.number().int().positive().default(100),

  // Valkey (Redis-compatible)
  REDIS_URL: z.string().url().optional().or(z.literal('')),
  REDIS_HOST: z.string().optional(),
  REDIS_PORT: z.coerce.number().int().positive().optional(),
  USE_BULLMQ: z.enum(['true', 'false']).optional().default('false'),

  // SMTP
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),

  // API Keys
  API_KEYS: z.string().optional().default(''),

  // Resend
  RESEND_WEBHOOK_SECRET: z.string().optional().default(''),

  // Default Password
  DEFAULT_PASSWORD: z.string().optional().default(''),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug', 'verbose']).default('info'),

  // Feature Flags
  ENABLE_SWAGGER: z.enum(['true', 'false']).optional().default('true'),
  ENABLE_METRICS: z.enum(['true', 'false']).optional().default('false'),

  // Firebase
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().email().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),

  // Monitoring
  SENTRY_DSN: z.string().url().optional().or(z.literal('')),
});

// Additional validation — issues added here are fatal; safeParse returns
// success: false and validateEnvWithZod() calls process.exit(1).
const envSchema = baseEnvSchema.superRefine((data, ctx) => {
  // In production, reject insecure or missing secrets
  if (data.NODE_ENV === 'production') {
    if (data.JWT_SECRET === 'change-me-to-random-64-char-string') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'JWT_SECRET must be changed from default in production',
        path: ['JWT_SECRET'],
      });
    }
    if (data.JWT_REFRESH_SECRET === 'change-me-to-random-64-char-string') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'JWT_REFRESH_SECRET must be changed from default in production',
        path: ['JWT_REFRESH_SECRET'],
      });
    }
    if (!data.DEFAULT_PASSWORD) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'DEFAULT_PASSWORD should be set in production for consistent login experience',
        path: ['DEFAULT_PASSWORD'],
      });
    }
  }

  // Validate Valkey/Redis URL if provided
  if (data.REDIS_URL && !data.REDIS_URL.startsWith('redis://') && !data.REDIS_URL.startsWith('rediss://')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'REDIS_URL must start with redis:// or rediss:// (Valkey is Redis-compatible)',
      path: ['REDIS_URL'],
    });
  }
});

export type EnvConfig = z.infer<typeof envSchema>;

/**
 * Validates and parses environment variables using Zod schema.
 * Throws a detailed error if validation fails.
 */
export function validateEnvWithZod(): EnvConfig {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.errors.map((err) => {
      const path = err.path.join('.');
      return `  - ${path}: ${err.message}`;
    });

    const errorMessage = [
      '❌ Environment validation failed:',
      ...errors,
      '',
      'Please check your .env file and ensure all required variables are set correctly.',
      'See .env.example for reference.',
    ].join('\n');

    console.error(errorMessage);
    process.exit(1);
  }

  console.log('✅ Environment variables validated with Zod');
  return result.data;
}
