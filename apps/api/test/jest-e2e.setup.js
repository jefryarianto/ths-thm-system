/**
 * Jest E2E setup — runs before any test file is loaded.
 * Uses .js extension because Jest's setupFiles may not go through ts-jest transformation.
 * Sets required environment variables that would otherwise be undefined
 * when running tests outside CI.
 */
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-e2e-jwt-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-e2e-jwt-refresh-secret';
process.env.JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
process.env.API_KEYS = process.env.API_KEYS || '[{"key":"test-e2e-api-key","name":"E2E Test Key"}]';
process.env.DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://ths_thm:test_password@localhost:5432/ths_thm_test';
process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_mock';
process.env.STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_mock';
